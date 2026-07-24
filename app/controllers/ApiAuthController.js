const User = require('../models/User');
const Logger = require('../core/Logger');

class ApiAuthController {
  /**
   * Check currently logged in user from session
   */
  static async me(req, res) {
    if (req.session && req.session.user) {
      const user = req.session.user;
      let permissions = [];
      try {
        const DB = require('../../config/db');
        if (user.role === 'admin') {
          const allPerms = await DB.table('permissions').get();
          permissions = allPerms.map(p => p.permission_key);
        } else {
          const roleObj = await DB.table('roles').where('role_key', user.role).first();
          if (roleObj) {
            const pivots = await DB.table('role_permission').where('role_id', roleObj.id).get();
            const permIds = pivots.map(p => p.permission_id);
            if (permIds.length > 0) {
              const allowedPerms = await DB.table('permissions').whereIn('id', permIds).get();
              permissions = allowedPerms.map(p => p.permission_key);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching permissions for me endpoint:', err);
      }

      return res.status(200).json({
        success: true,
        user: {
          ...user,
          permissions
        }
      });
    }
    return res.status(200).json({
      success: false,
      user: null
    });
  }

  /**
   * Log in user and establish Express session
   */
  static async login(req, res) {
    try {
      const username = (req.body.username || req.body.email || '').trim();
      const password = req.body.password;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'ইউজারনেম এবং পাসওয়ার্ড দুটিই আবশ্যক।'
        });
      }

      const user = await User.findByUsername(username);
      if (!user) {
        Logger.logActivity('API login attempt failed (User not found)', { username });
        return res.status(401).json({
          success: false,
          message: 'ইউজারনেম অথবা পাসওয়ার্ডটি সঠিক নয়।'
        });
      }

      if (user.get('is_active') !== 1 && user.get('is_active') !== 'active') {
        Logger.logActivity('API login attempt failed (Suspended account)', { username });
        return res.status(403).json({
          success: false,
          message: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে।'
        });
      }

      const verified = User.verifyPassword(password, user.get('password'));
      if (!verified) {
        Logger.logActivity('API login attempt failed (Wrong password)', { username });
        return res.status(401).json({
          success: false,
          message: 'ইউজারনেম অথবা পাসওয়ার্ডটি সঠিক নয়।'
        });
      }

      req.session.user = {
        id: user.get('user_id'),
        name: user.get('full_name'),
        email: user.get('username'),
        role: user.get('role')
      };

      Logger.logActivity('User logged in successfully (API)', { user_id: user.get('user_id') });

      req.session.save(async (err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({
            success: false,
            message: 'সেশন সেভ করার সময় ত্রুটি ঘটেছে।'
          });
        }

        let permissions = [];
        try {
          const DB = require('../../config/db');
          if (req.session.user.role === 'admin') {
            const allPerms = await DB.table('permissions').get();
            permissions = allPerms.map(p => p.permission_key);
          } else {
            const roleObj = await DB.table('roles').where('role_key', req.session.user.role).first();
            if (roleObj) {
              const pivots = await DB.table('role_permission').where('role_id', roleObj.id).get();
              const permIds = pivots.map(p => p.permission_id);
              if (permIds.length > 0) {
                const allowedPerms = await DB.table('permissions').whereIn('id', permIds).get();
                permissions = allowedPerms.map(p => p.permission_key);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching permissions during login:', err);
        }

        return res.status(200).json({
          success: true,
          message: 'লগইন সফল হয়েছে।',
          user: {
            ...req.session.user,
            permissions
          }
        });
      });

    } catch (error) {
      console.error('API session login error:', error);
      return res.status(500).json({
        success: false,
        message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে।'
      });
    }
  }

  /**
   * Log out active user sessions
   */
  static logout(req, res) {
    if (req.session && req.session.user) {
      Logger.logActivity('User logged out (API)', { user_id: req.session.user.id });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'লগআউট করার সময় ত্রুটি ঘটেছে।'
        });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'লগআউট সফল হয়েছে।'
      });
    });
  }

  /**
   * Log in user and return a Personal Access Token (PAT) for API clients (React Native)
   */
  static async issueToken(req, res) {
    try {
      const username = (req.body.username || req.body.email || '').trim();
      const password = req.body.password;
      const token_name = req.body.token_name;

      if (!username || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'ইউজারনেম এবং পাসওয়ার্ড দুটিই আবশ্যক।'
        });
      }

      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'ইউজারনেম অথবা পাসওয়ার্ডটি সঠিক নয়।'
        });
      }

      if (user.get('is_active') !== 1 && user.get('is_active') !== '1') {
        return res.status(403).json({
          status: 'error',
          message: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে।'
        });
      }

      const verified = User.verifyPassword(password, user.get('password'));
      if (!verified) {
        return res.status(401).json({
          status: 'error',
          message: 'ইউজারনেম অথবা পাসওয়ার্ডটি সঠিক নয়।'
        });
      }

      const HasApiTokens = require('../core/HasApiTokens');
      const { plainTextToken } = await HasApiTokens.createToken(user, token_name || 'Mobile App Access Token');

      let permissions = [];
      const rawPerms = user.get('permissions');
      if (rawPerms) {
        try {
          permissions = JSON.parse(rawPerms);
        } catch (e) {
          console.error('Failed to parse user permissions during token issue:', e);
        }
      }

      return res.status(200).json({
        status: 'success',
        token: plainTextToken,
        user: {
          id: user.get('user_id'),
          name: user.get('full_name'),
          username: user.get('username'),
          role: user.get('role'),
          permissions: permissions
        }
      });
    } catch (error) {
      console.error('API token issue error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'অভ্যন্তরীণ সার্ভার ত্রুটি।'
      });
    }
  }
}

module.exports = ApiAuthController;
