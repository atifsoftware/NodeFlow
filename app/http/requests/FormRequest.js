/**
 * Form Request Validation
 * Laravel-এর মতো ভ্যালিডেশন ক্লাস
 */

class FormRequest {
    constructor(data = {}) {
        this.data = data;
        this.errors = {};
        this.rules = this.rules();
    }

    /**
     * ভ্যালিডেশন রুলস ডিফাইন করুন
     * উদাহরণ: 
     * return {
     *   name: 'required|string|min:3|max:50',
     *   email: 'required|email|unique:users',
     *   age: 'required|integer|min:18'
     * };
     */
    rules() {
        return {};
    }

    /**
     * কাস্টম এরর মেসেজ
     */
    messages() {
        return {};
    }

    /**
     * ভ্যালিডেশন অ্যাট্রিবিউট নাম (কাস্টম ফিল্ড নাম)
     */
    attributes() {
        return {};
    }

    /**
     * ভ্যালিডেশন চালানো
     */
    async validate() {
        this.errors = {};
        const messages = this.messages();
        const attributes = this.attributes();

        for (const [field, ruleString] of Object.entries(this.rules)) {
            const rules = ruleString.split('|');
            const value = this.getData(field);
            const fieldName = attributes[field] || field;

            for (const rule of rules) {
                const [ruleName, params] = this.parseRule(rule);
                const isValid = await this.applyRule(ruleName, value, params, field);

                if (!isValid) {
                    const messageKey = `${field}.${ruleName}`;
                    const defaultMessage = this.getDefaultMessage(ruleName, fieldName, params);
                    this.errors[field] = messages[messageKey] || defaultMessage;
                    break; // প্রথম এরর ধরার পর বাকি রুলস চেক করবে না
                }
            }
        }

        if (Object.keys(this.errors).length > 0) {
            const error = new Error('Validation failed');
            error.errors = this.errors;
            error.status = 422;
            throw error;
        }

        return this.validated();
    }

    /**
     * ভ্যালিডেটেড ডেটা পাওয়া
     */
    validated() {
        const result = {};
        for (const field of Object.keys(this.rules)) {
            result[field] = this.getData(field);
        }
        return result;
    }

    /**
     * ডেটা থেকে ফিল্ড ভ্যালু পাওয়া (নেস্টেড সাপোর্ট)
     */
    getData(field) {
        return field.split('.').reduce((obj, key) => obj?.[key], this.data);
    }

    /**
     * রুল পার্স করা
     */
    parseRule(rule) {
        const parts = rule.split(':');
        return [parts[0], parts[1] ? parts[1].split(',') : []];
    }

    /**
     * রুল অ্যাপ্লাই করা
     */
    async applyRule(ruleName, value, params, field) {
        const validators = {
            required: (v) => v !== undefined && v !== null && v !== '',
            string: (v) => typeof v === 'string',
            integer: (v) => Number.isInteger(Number(v)),
            number: (v) => !isNaN(parseFloat(v)) && isFinite(v),
            boolean: (v) => v === true || v === false || v === 'true' || v === 'false',
            email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            url: (v) => /^https?:\/\/.+\..+/.test(v),
            alpha: (v) => /^[a-zA-Z]+$/.test(v),
            alphanumeric: (v) => /^[a-zA-Z0-9]+$/.test(v),
            min: (v, [min]) => {
                if (typeof v === 'string') return v.length >= parseInt(min);
                if (Array.isArray(v)) return v.length >= parseInt(min);
                return parseFloat(v) >= parseFloat(min);
            },
            max: (v, [max]) => {
                if (typeof v === 'string') return v.length <= parseInt(max);
                if (Array.isArray(v)) return v.length <= parseInt(max);
                return parseFloat(v) <= parseFloat(max);
            },
            between: (v, [min, max]) => {
                const num = parseFloat(v);
                return num >= parseFloat(min) && num <= parseFloat(max);
            },
            in: (v, values) => values.includes(String(v)),
            notIn: (v, values) => !values.includes(String(v)),
            array: (v) => Array.isArray(v),
            json: (v) => {
                try { JSON.parse(v); return true; } catch { return false; }
            },
            date: (v) => !isNaN(Date.parse(v)),
            after: (v, [date]) => new Date(v) > new Date(date),
            before: (v, [date]) => new Date(v) < new Date(date),
            regex: (v, [pattern]) => new RegExp(pattern).test(v),
            digits: (v, [length]) => /^\d+$/.test(v) && v.length === parseInt(length),
            digitsBetween: (v, [min, max]) => /^\d+$/.test(v) && v.length >= parseInt(min) && v.length <= parseInt(max),
            ip: (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || /^([a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/.test(v),
            uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
            
            // কাস্টম ডেটাবেস ইউনিক চেক (উদাহরণ)
            unique: async (v, [table, column = field]) => {
                // এখানে ডেটাবেস চেক যোগ করুন
                // const exists = await DB.table(table).where(column, v).first();
                // return !exists;
                return true; // আপাতত পাস করছে
            },
            exists: async (v, [table, column = field]) => {
                // এখানে ডেটাবেস চেক যোগ করুন
                // const exists = await DB.table(table).where(column, v).first();
                // return !!exists;
                return true; // আপাতত পাস করছে
            },
            confirmed: (v) => {
                const confirmationField = `${field}_confirmation`;
                return v === this.getData(confirmationField);
            },
            nullable: () => true,
            sometimes: () => true
        };

        if (!validators[ruleName]) {
            console.warn(`Unknown validation rule: ${ruleName}`);
            return true;
        }

        // nullable হলে এবং ভ্যালু খালি থাকলে স্কিপ
        if (this.rules[field].includes('nullable') && (value === null || value === '')) {
            return true;
        }

        // required ছাড়া অন্য রুলের জন্য খালি ভ্যালু স্কিপ
        if (ruleName !== 'required' && (value === null || value === '')) {
            return true;
        }

        return await validators[ruleName](value, params);
    }

    /**
     * ডিফল্ট এরর মেসেজ
     */
    getDefaultMessage(ruleName, fieldName, params) {
        const messages = {
            required: `${fieldName} field is required`,
            string: `${fieldName} must be a string`,
            integer: `${fieldName} must be an integer`,
            number: `${fieldName} must be a number`,
            boolean: `${fieldName} must be a boolean`,
            email: `${fieldName} must be a valid email address`,
            url: `${fieldName} must be a valid URL`,
            alpha: `${fieldName} may only contain letters`,
            alphanumeric: `${fieldName} may only contain letters and numbers`,
            min: `${fieldName} must be at least ${params[0]} characters`,
            max: `${fieldName} may not be greater than ${params[0]} characters`,
            between: `${fieldName} must be between ${params[0]} and ${params[1]}`,
            in: `${fieldName} must be one of: ${params.join(', ')}`,
            notIn: `${fieldName} may not be: ${params.join(', ')}`,
            array: `${fieldName} must be an array`,
            json: `${fieldName} must be valid JSON`,
            date: `${fieldName} must be a valid date`,
            after: `${fieldName} must be after ${params[0]}`,
            before: `${fieldName} must be before ${params[0]}`,
            regex: `${fieldName} format is invalid`,
            digits: `${fieldName} must be exactly ${params[0]} digits`,
            digitsBetween: `${fieldName} must be between ${params[0]} and ${params[1]} digits`,
            ip: `${fieldName} must be a valid IP address`,
            uuid: `${fieldName} must be a valid UUID`,
            unique: `${fieldName} has already been taken`,
            exists: `${fieldName} does not exist`,
            confirmed: `${fieldName} confirmation does not match`
        };

        return messages[ruleName] || `${fieldName} validation failed`;
    }

    /**
     * চেক করা ভ্যালিডেশন পাস করেছে কিনা
     */
    fails() {
        return Object.keys(this.errors).length > 0;
    }

    /**
     * চেক করা ভ্যালিডেশন পাস করেনি
     */
    passes() {
        return Object.keys(this.errors).length === 0;
    }

    /**
     * নির্দিষ্ট ফিল্ডের এরর পাওয়া
     */
    error(field) {
        return this.errors[field] || null;
    }

    /**
     * সব এরর পাওয়া
     */
    allErrors() {
        return this.errors;
    }
}

module.exports = FormRequest;
