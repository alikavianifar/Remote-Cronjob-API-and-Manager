import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';

export function signToken(config, user) {
    return jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: config.jwtExpiresIn
    });
}

/** Requires a valid `Authorization: Bearer <token>` header belonging to an existing user. */
export function createAuthenticate({ config, store }) {
    return (req, _res, next) => {
        const header = req.headers.authorization || '';
        const [scheme, token] = header.split(' ');
        if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Authentication required'));

        try {
            const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
            const user = store.getUserById(payload.sub);
            if (!user) return next(new AppError(401, 'Invalid token'));
            req.user = { id: user.id, username: user.username };
            next();
        } catch (err) {
            const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
            next(new AppError(401, message));
        }
    };
}
