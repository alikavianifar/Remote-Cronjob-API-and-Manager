import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';
import { verifyCredentials } from '../services/authService.js';
import { loginSchema, validate } from '../utils/validators.js';

export function createAuthRouter({ config, store, authenticate, loginLimiter }) {
    const router = Router();

    router.post(
        '/login',
        loginLimiter,
        validate(loginSchema),
        asyncHandler(async (req, res) => {
            const user = await verifyCredentials(store, req.body.username, req.body.password);
            if (!user) throw new AppError(401, 'Invalid username or password');

            res.json({
                success: true,
                token: signToken(config, user),
                user: { id: user.id, username: user.username }
            });
        })
    );

    // Tokens are stateless, so logging out only needs to discard the token on the client.
    router.post('/logout', authenticate, (_req, res) => res.json({ success: true }));

    router.get('/me', authenticate, (req, res) => res.json({ success: true, user: req.user }));

    return router;
}
