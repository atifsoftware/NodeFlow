/**
 * Authentication Middleware for NodeFlow
 */
module.exports = {
  // Protect routes that require login
  auth: (req, res, next) => {
    if (req.session && req.session.user) {
      // Make user data accessible to all views automatically
      res.locals.user = req.session.user;
      return next();
    }
    
    // If request wants JSON, return error instead of redirect
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized. Please login.' });
    }
    
    res.redirect('/login');
  },

  // Redirect logged-in users away from auth pages (like /login)
  guest: (req, res, next) => {
    if (req.session && req.session.user) {
      return res.redirect('/');
    }
    next();
  },

  // Share session information with all templates globally
  shareUser: (req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.appName = process.env.APP_NAME || 'NodeFlow';
    res.locals.currentPath = req.path;
    next();
  },

  // Check granular permission mapping
  can: (permissionKey) => {
    return async (req, res, next) => {
      if (!req.session || !req.session.user) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(401).json({ status: 'error', message: 'Unauthorized. Please login.' });
        }
        return res.redirect('/login');
      }

      const user = req.session.user;
      
      // Admin bypasses all checks
      if (user.role === 'admin') {
        return next();
      }

      try {
        const DB = require('../../config/db');
        const hasPivot = await DB.table('role_permission as rp')
          .join('roles as r', 'rp.role_id', '=', 'r.id')
          .join('permissions as p', 'rp.permission_id', '=', 'p.id')
          .where('r.role_key', user.role)
          .where('p.permission_key', permissionKey)
          .first();

        if (!hasPivot) {
          if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({ status: 'error', message: 'আপনার এই কাজটি করার অনুমতি নেই।' });
          }
          if (global.Flash) {
            global.Flash.error('আপনার এই পেজটি অ্যাক্সেস করার অনুমতি নেই।');
          }
          return res.redirect('/admin/dashboard');
        }

        return next();
      } catch (err) {
        console.error('Permission middleware check error:', err);
        return res.status(500).json({ status: 'error', message: 'অভ্যন্তরীণ পারমিশন যাচাই ত্রুটি।' });
      }
    };
  }
};
