// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { generateToken } from '../middleware/auth.js';
import { validate, loginSchema } from '../utils/validators.js';
import logger from '../services/logger.js';
import config from '../config/index.js';

const router = Router();

// Ensure default admin exists
function ensureDefaultAdmin() {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const admin = stmt.get(config.defaultAdmin.username);

    if (!admin) {
        const hash = bcrypt.hashSync(config.defaultAdmin.password, 10);
        const insertStmt = db.prepare(
            'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
        );
        insertStmt.run(uuidv4(), config.defaultAdmin.username, hash, 'admin');
        logger.info('Default admin user created');
    }
}

// Run on module load
ensureDefaultAdmin();

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post('/login', validate(loginSchema), (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);

        if (!user) {
            logger.warn('Login attempt with unknown user', { username });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const validPassword = bcrypt.compareSync(password, user.password_hash);

        if (!validPassword) {
            logger.warn('Login attempt with wrong password', { username });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        logger.info('User logged in', { username, role: user.role });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            expiresIn: 86400 // 24 hours in seconds
        });
    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', (req, res) => {
    // This would be protected by auth middleware in actual usage
    res.json({
        success: true,
        user: req.user || null
    });
});

export default router;
