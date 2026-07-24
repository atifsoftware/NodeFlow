const DB = require('../../config/db');

/**
 * Middleware to check if the authenticated API user has a specific permission.
 * Admin role automatically bypasses all permission checks.
 *
 * @param {string} permission The key of the permission required.
 */
function apiCan(permissionKey) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized access.' });
      }

      const userRole = user.get('role');

      // Admin role has all privileges
      if (userRole === 'admin') {
        return next();
      }

      // Check permission via role_permission pivot table
      const hasPermission = await DB.table('role_permission as rp')
        .join('roles as r', 'rp.role_id', '=', 'r.id')
        .join('permissions as p', 'rp.permission_id', '=', 'p.id')
        .where('r.role_key', userRole)
        .where('p.permission_key', permissionKey)
        .first();

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: 'Sorry, your account does not have permission to perform this action.'
        });
      }

      next();
    } catch (err) {
      console.error('Error in apiCan middleware:', err);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error.' });
    }
  };
}

module.exports = apiCan;
