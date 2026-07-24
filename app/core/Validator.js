const DB = require('../../config/db');

/**
 * NodeFlow Request Validator
 * Comprehensive input validation engine inspired by NovaFlow PHP Validator.
 */
class Validator {
  /**
   * Default validation error messages (Bengali)
   */
  static defaultMessages = {
    required: ':field ঘরটি অবশ্যই পূরণ করতে হবে।',
    email: ':field অবশ্যই একটি সঠিক ইমেইল এড্রেস হতে হবে।',
    min: ':field কমপক্ষে :param অক্ষরের হতে হবে।',
    max: ':field :param অক্ষরের বেশি হতে পারবে না।',
    numeric: ':field অবশ্যই সংখ্যা হতে হবে।',
    integer: ':field অবশ্যই পূর্ণসংখ্যা হতে হবে।',
    string: ':field অবশ্যই একটি স্ট্রিং হতে হবে।',
    date: ':field সঠিক তারিখ নয়।',
    url: ':field ইউআরএল ফর্ম্যাটটি সঠিক নয়।',
    in: 'নির্বাচিত :field-টি সঠিক নয়।',
    unique: ':field-টি ইতিমধ্যে ব্যবহৃত হয়েছে।',
    exists: 'নির্বাচিত :field-টি সঠিক নয়।',
    confirmed: ':field কনফার্মেশন মিলছে না।',
    between: ':field অবশ্যই :param এবং :param2 এর মধ্যে হতে হবে।',
  };

  /**
   * @param {object} data - Input data to validate (e.g. req.body)
   * @param {object} rules - Validation rules (e.g. { name: 'required|min:3' })
   */
  constructor(data = {}, rules = {}) {
    this._data = data;
    this._rules = rules;
    this._errors = {};
    this._messages = { ...Validator.defaultMessages };
    this._fieldLabels = {};
  }

  /**
   * Static factory method — creates, validates, and returns a Validator instance.
   * @param {object} data
   * @param {object} rules
   * @param {object} [messages] - Custom error messages
   * @param {object} [labels] - Custom field labels
   * @returns {Validator}
   */
  static make(data, rules, messages = {}, labels = {}) {
    const validator = new Validator(data, rules);
    if (Object.keys(messages).length > 0) {
      validator.setMessages(messages);
    }
    if (Object.keys(labels).length > 0) {
      validator.setFieldLabels(labels);
    }
    validator.validate();
    return validator;
  }

  /**
   * Async factory — supports async rules like `unique` and `exists`.
   * @param {object} data
   * @param {object} rules
   * @param {object} [messages]
   * @param {object} [labels]
   * @returns {Promise<Validator>}
   */
  static async makeAsync(data, rules, messages = {}, labels = {}) {
    const validator = new Validator(data, rules);
    if (Object.keys(messages).length > 0) {
      validator.setMessages(messages);
    }
    if (Object.keys(labels).length > 0) {
      validator.setFieldLabels(labels);
    }
    await validator.validateAsync();
    return validator;
  }

  /**
   * Set custom field labels
   * @param {object} labels - e.g. { full_name: 'পূর্ণ নাম' }
   */
  setFieldLabels(labels) {
    this._fieldLabels = labels;
    return this;
  }

  /**
   * Override default messages
   * @param {object} messages
   */
  setMessages(messages) {
    this._messages = { ...Validator.defaultMessages, ...messages };
    return this;
  }

  /**
   * Run synchronous validation
   * @returns {boolean} true if all rules pass
   */
  validate() {
    this._errors = {};

    for (const [field, ruleString] of Object.entries(this._rules)) {
      const rules = typeof ruleString === 'string' ? ruleString.split('|') : ruleString;
      const value = this._getValue(field);

      for (const rule of rules) {
        const { name: ruleName, params } = this._parseRule(rule);

        // Skip non-required empty fields
        if (ruleName !== 'required' && (value === null || value === undefined || value === '')) {
          continue;
        }

        // Skip async rules in sync mode
        if (['unique', 'exists'].includes(ruleName)) continue;

        if (!this._passes(ruleName, value, params, field)) {
          this._addError(field, ruleName, params);
        }
      }
    }

    return Object.keys(this._errors).length === 0;
  }

  /**
   * Run async validation (supports unique/exists database checks)
   * @returns {Promise<boolean>}
   */
  async validateAsync() {
    this._errors = {};

    for (const [field, ruleString] of Object.entries(this._rules)) {
      const rules = typeof ruleString === 'string' ? ruleString.split('|') : ruleString;
      const value = this._getValue(field);

      for (const rule of rules) {
        const { name: ruleName, params } = this._parseRule(rule);

        if (ruleName !== 'required' && (value === null || value === undefined || value === '')) {
          continue;
        }

        let passed;
        if (ruleName === 'unique') {
          passed = await this._isUnique(value, params);
        } else if (ruleName === 'exists') {
          passed = await this._existsInDb(value, params);
        } else {
          passed = this._passes(ruleName, value, params, field);
        }

        if (!passed) {
          this._addError(field, ruleName, params);
        }
      }
    }

    return Object.keys(this._errors).length === 0;
  }

  /**
   * Check if validation failed
   * @returns {boolean}
   */
  fails() {
    return Object.keys(this._errors).length > 0;
  }

  /**
   * Get all validation errors
   * @returns {object}
   */
  errors() {
    return this._errors;
  }

  /**
   * Get first error for a specific field
   * @param {string} field
   * @returns {string|null}
   */
  firstError(field) {
    return this._errors[field] ? this._errors[field][0] : null;
  }

  /**
   * Check if a specific field has errors
   * @param {string} [field]
   * @returns {boolean}
   */
  hasErrors(field = null) {
    if (field) return !!this._errors[field];
    return Object.keys(this._errors).length > 0;
  }

  // ──────────────────────────────────────────────
  //  PRIVATE HELPERS
  // ──────────────────────────────────────────────

  _getValue(field) {
    return this._data[field] !== undefined ? this._data[field] : null;
  }

  _parseRule(rule) {
    if (rule.includes(':')) {
      const [name, paramString] = rule.split(':', 2);
      const params = paramString.split(',');
      return { name, params };
    }
    return { name: rule, params: [] };
  }

  _passes(ruleName, value, params, field) {
    switch (ruleName) {
      case 'required':
        return value !== null && value !== undefined && value !== '' && value !== false;

      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(value));
      }

      case 'min': {
        const minVal = Number(params[0]);
        if (!isNaN(Number(value)) && typeof value === 'number') return value >= minVal;
        return String(value).length >= minVal;
      }

      case 'max': {
        const maxVal = Number(params[0]);
        if (!isNaN(Number(value)) && typeof value === 'number') return value <= maxVal;
        return String(value).length <= maxVal;
      }

      case 'numeric':
        return !isNaN(Number(value));

      case 'integer':
        return Number.isInteger(Number(value)) && !isNaN(Number(value));

      case 'string':
        return typeof value === 'string';

      case 'date':
        return !isNaN(Date.parse(value));

      case 'url': {
        try { new URL(value); return true; } catch { return false; }
      }

      case 'in':
        return params.includes(String(value));

      case 'confirmed': {
        const confirmValue = this._getValue(field + '_confirmation');
        return value === confirmValue;
      }

      case 'between': {
        const length = typeof value === 'number' ? value : String(value).length;
        return length >= Number(params[0]) && length <= Number(params[1]);
      }

      default:
        return true;
    }
  }

  async _isUnique(value, params) {
    if (params.length === 0) return true;
    const table = params[0];
    const column = params[1] || 'id';
    const ignoreId = params[2] || null;
    const idColumn = params[3] || 'id';

    let query = DB.table(table).where(column, value);
    if (ignoreId) {
      query = query.where(idColumn, '!=', ignoreId);
    }
    const count = await query.count();
    return count === 0;
  }

  async _existsInDb(value, params) {
    if (params.length === 0) return true;
    const table = params[0];
    const column = params[1] || 'id';
    const count = await DB.table(table).where(column, value).count();
    return count > 0;
  }

  _addError(field, ruleName, params) {
    const label = this._fieldLabels[field] || field;
    let message = this._messages[`${field}.${ruleName}`]
      || this._messages[ruleName]
      || `The ${field} field is invalid.`;

    message = message.replace(/:field/g, label);
    if (params[0] !== undefined) message = message.replace(/:param\b/g, params[0]);
    if (params[1] !== undefined) message = message.replace(/:param2/g, params[1]);

    if (!this._errors[field]) {
      this._errors[field] = [];
    }
    this._errors[field].push(message);
  }
}

module.exports = Validator;
