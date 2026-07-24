const crypto = require('crypto');
const DB = require('../../config/db');
const User = require('../models/User');
const requestContext = require('../core/RequestContext');

/**
 * Personal Access Token Authentication Middleware (Sanctum-like API Token Auth)
 * Validates cryptographically secure nf_pat_... Bearer tokens.
 */
async function apiTokenAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Bearer token required for API authorization.' });
  }

  const plainToken = authHeader.substring(7).trim();
  if (!plainToken.startsWith('nf_pat_')) {
    return res.status(401).json({ status: 'error', message: 'Invalid API token format.' });
  }

  try {
    // Generate SHA-256 hash to match stored record
    const hashed = crypto.createHash('sha256').update(plainToken).digest('hex');

    const tokenRecord = await DB.table('personal_access_tokens')
      .where('token', hashed)
      .first();

    if (!tokenRecord) {
      return res.status(401).json({ status: 'error', message: 'API token is invalid or expired.' });
    }

    // Resolve matching User model instance
    const user = await User.find(tokenRecord.tokenable_id);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User associated with this token not found.' });
    }

    // Record last used timestamp in background
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    DB.table('personal_access_tokens')
      .where('id', tokenRecord.id)
      .update({ last_used_at: now })
      .catch(err => console.error('Failed to update token last_used_at:', err));

    // Mount user and scopes to request
    req.user = user;
    req.tokenAbilities = JSON.parse(tokenRecord.abilities || '["*"]');

    // Register active user in global RequestContext for cross-library access (Gate, Logger)
    const store = requestContext.getStore();
    if (store && store.req) {
      store.req.session = store.req.session || {};
      store.req.session.user = {
        id: user.get('user_id'),
        name: user.get('full_name'),
        email: user.get('username'),
        role: user.get('role')
      };
    }

    next();
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Authentication internal failure: ' + error.message });
  }
}

module.exports = apiTokenAuth;
