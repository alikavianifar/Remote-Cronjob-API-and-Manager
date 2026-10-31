import { AppError } from '../lib/errors.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(_req, _res, next) {
    next(new AppError(404, 'Route not found'));
}

export function createErrorHandler(logger) {
    // eslint-disable-next-line no-unused-vars
    return (err, req, res, _next) => {
        if (err instanceof AppError) {
            const body = { success: false, error: err.message };
            if (err.details) body.details = err.details;
            return res.status(err.status).json(body);
        }
        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ success: false, error: 'Request body is not valid JSON' });
        }
        if (err.type === 'entity.too.large') {
            return res.status(413).json({ success: false, error: 'Request body is too large' });
        }

        logger.error(`${req.method} ${req.originalUrl} failed`, err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    };
}
