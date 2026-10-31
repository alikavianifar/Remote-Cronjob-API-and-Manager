/**
 * Error type for failures that are safe to report to API clients.
 * Anything else that reaches the error handler is treated as an internal error.
 */
export class AppError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.details = details;
    }
}

export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`);
export const conflict = (message) => new AppError(409, message);
export const badRequest = (message, details) => new AppError(400, message, details);
