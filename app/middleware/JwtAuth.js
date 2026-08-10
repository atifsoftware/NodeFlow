/**
 * JWT Authentication Middleware
 * মোবাইল API এবং SPA-র জন্য টোকেন ভিত্তিক অথেন্টিকেশন
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // আপনার User মডেল অনুযায়ী পরিবর্তন করুন

class JwtMiddleware {
    constructor(options = {}) {
        this.secret = options.secret || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        this.expiresIn = options.expiresIn || '24h';
        this.algorithms = options.algorithms || ['HS256'];
    }

    /**
     * মিডেলওয়্যার ফাংশন
     */
    async handle(req, res, next) {
        try {
            const token = this.extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication token required',
                    error: 'UNAUTHORIZED'
                });
            }

            const decoded = jwt.verify(token, this.secret, {
                algorithms: this.algorithms
            });

            // ইউজার লোড করা (ঐচ্ছিক)
            if (decoded.userId) {
                // req.user = await User.find(decoded.userId);
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role
                };

                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not found',
                        error: 'USER_NOT_FOUND'
                    });
                }
            } else {
                req.user = decoded;
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired',
                    error: 'TOKEN_EXPIRED'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token',
                    error: 'INVALID_TOKEN'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Authentication failed',
                error: error.message
            });
        }
    }

    /**
     * রিকোয়েস্ট থেকে টোকেন এক্সট্রাক্ট করা
     */
    extractToken(req) {
        // Authorization হেডার থেকে
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Query প্যারামিটার থেকে
        if (req.query.token) {
            return req.query.token;
        }

        // বডি থেকে
        if (req.body && req.body.token) {
            return req.body.token;
        }

        // Cookie থেকে
        if (req.cookies && req.cookies.token) {
            return req.cookies.token;
        }

        return null;
    }

    /**
     * টোকেন জেনারেট করা
     */
    generateToken(payload, options = {}) {
        return jwt.sign(payload, this.secret, {
            expiresIn: options.expiresIn || this.expiresIn,
            algorithm: options.algorithm || 'HS256'
        });
    }

    /**
     * টোকেন ডিকোড করা (ভেরিফাই ছাড়া)
     */
    decodeToken(token) {
        return jwt.decode(token);
    }

    /**
     * টোকেন ভেরিফাই করা
     */
    verifyToken(token) {
        return jwt.verify(token, this.secret, {
            algorithms: this.algorithms
        });
    }

    /**
     * টোকেন রিফ্রেশ করা
     */
    refreshToken(oldToken, options = {}) {
        const decoded = this.verifyToken(oldToken);
        delete decoded.iat;
        delete decoded.exp;
        
        return this.generateToken(decoded, options);
    }

    /**
     * এক্সপায়ার চেক করা
     */
    isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded.exp) return false;
            
            const now = Math.floor(Date.now() / 1000);
            return decoded.exp < now;
        } catch {
            return true;
        }
    }
}

// সিঙ্গেলটন ইন্সট্যান্স
const jwtAuth = new JwtMiddleware();

module.exports = jwtAuth;
