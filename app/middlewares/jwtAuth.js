const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  // Retrieve token from Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required. Please authenticate at /api/auth/login and supply a Bearer token.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nodeflow_jwt_secret_key_123456789');
    req.user = decoded; // Attach user payload to request
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired access token. Please log in again.'
    });
  }
};
