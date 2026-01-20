// Global error handler middleware
import logger from '../services/logger.js';

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    });
};

/**
 * Async handler wrapper to catch async errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
