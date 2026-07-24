const crypto = require('crypto');

/**
 * Custom Built-in Cookie/Session-based CSRF Protection Middleware
 */
module.exports = (req, res, next) => {
  // 1. Ensure session is initialized
  if (!req.session) {
    return next(new Error('Session middleware is not configured correctly before CSRF.'));
  }

  // 2. Generate cryptographically secure token if not already in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // 3. Expose the CSRF token globally to EJS views via res.locals
  res.locals.csrfToken = req.session.csrfToken;

  // 4. Skip validation for safe HTTP read-only methods, public auth routes, or JWT-authenticated APIs
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const bypassedPaths = [
    '/api/auth/session-login',
    '/api/auth/session-logout',
    '/api/login'
  ];

  if (
    safeMethods.includes(req.method) || 
    bypassedPaths.includes(req.path) ||
    req.headers['authorization'] // Immunized from CSRF via Bearer tokens
  ) {
    return next();
  }

  // 5. Retrieve CSRF token from various possible locations in the request
  const clientToken = 
    (req.body && req.body._csrf) || 
    (req.query && req.query._csrf) || 
    req.headers['x-csrf-token'] || 
    req.headers['x-xsrf-token'];

  // 6. Validate the token
  if (!clientToken || clientToken !== req.session.csrfToken) {
    const err = new Error('CSRF security token verification failed or expired. Action blocked for security.');
    err.status = 403;
    err.name = 'CSRF Security Violation';
    return next(err);
  }

  // Validation passed, continue to next route execution
  next();
};
