const User = require('../models/User');
const Validator = require('../core/Validator');
const Logger = require('../core/Logger');
const Flash = require('../core/Flash');

class AuthController {
  /**
   * Render login page
   */
  static async showLogin(req, res) {
    res.render('auth/login', {
      title: 'লগইন — NodeFlow Framework'
    });
  }

  /**
   * Process session login
   */
  static async login(req, res, next) {
    try {
      const validator = Validator.make(req.body, {
        username: 'required|min:3',
        password: 'required|min:4'
      });

      if (validator.fails()) {
        const errors = validator.errors();
        Flash.error(Object.values(errors)[0] || 'ভুল ইনপুট তথ্য!');
        return req.session.save(() => res.redirect('/login'));
      }

      const username = req.body.username ? req.body.username.trim() : '';
      const password = req.body.password;
      const user = await User.findByUsername(username);

      if (!user) {
        Flash.error('এই ইউজারনেম/ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।');
        return req.session.save(() => res.redirect('/login'));
      }

      const userStatus = user.get('status');
      const isActive = userStatus === 1 || userStatus === '1' || userStatus === 'active';

      if (!isActive) {
        Flash.error('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
        return req.session.save(() => res.redirect('/login'));
      }

      // Verify passwords
      const passwordHash = user.get('password');
      if (!User.verifyPassword(password, passwordHash)) {
        Flash.error('পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।');
        return req.session.save(() => res.redirect('/login'));
      }

      // Create session payload
      req.session.user = {
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        role: user.get('role')
      };

      Logger.logActivity('Logged into administrative dashboard', { user_id: user.get('id') });
      Flash.success('সফলভাবে লগইন করা হয়েছে!');

      req.session.save((err) => {
        if (err) {
          return next(err);
        }
        res.redirect('/admin/dashboard');
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process session logout
   */
  static async logout(req, res) {
    if (req.session?.user) {
      Logger.logActivity('Logged out of system', { user_id: req.session.user.id });
    }
    req.session.destroy(() => {
      res.redirect('/login');
    });
  }
}

module.exports = AuthController;
