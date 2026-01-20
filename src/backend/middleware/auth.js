// JWT Authentication middleware
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../services/logger.js';

/**
 * Middleware to verify JWT token
 */
export const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'No authorization header provided'
            });
        }

        // Check Bearer format
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authorization format. Use: Bearer <token>'
            });
        }

        const token = authHeader.slice(7);

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Attach user info to request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        };

        next();
    } catch (error) {
        logger.warn('Authentication failed', { error: error.message });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token has expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

/**
 * Middleware to check admin role
 */
export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};
