/**
 * User Registration Form Request
 * উদাহরণ: ইউজার রেজিস্ট্রেশন ভ্যালিডেশন
 */

const FormRequest = require('./FormRequest');

class RegisterUserRequest extends FormRequest {
    rules() {
        return {
            username: 'required|string|min:3|max:50|alpha',
            email: 'required|email|unique:users,email',
            password: 'required|string|min:8|confirmed',
            phone: 'nullable|string|digits:11',
            age: 'required|integer|min:18|max:100',
            gender: 'required|in:male,female,other'
        };
    }

    messages() {
        return {
            'username.required': 'Username is required',
            'username.min': 'Username must be at least 3 characters',
            'email.required': 'Email address is required',
            'email.email': 'Please provide a valid email address',
            'password.required': 'Password is required',
            'password.min': 'Password must be at least 8 characters',
            'password.confirmed': 'Password confirmation does not match',
            'age.min': 'You must be at least 18 years old',
            'gender.in': 'Invalid gender selected'
        };
    }

    attributes() {
        return {
            username: 'User Name',
            email: 'Email Address',
            password: 'Password',
            phone: 'Phone Number',
            age: 'Age',
            gender: 'Gender'
        };
    }

    /**
     * ভ্যালিডেশনের পর অতিরিক্ত কাজ (optional)
     */
    async afterValidation() {
        // এখানে অতিরিক্ত লজিক যোগ করতে পারেন
        console.log('Validation passed for user registration');
    }
}

module.exports = RegisterUserRequest;
