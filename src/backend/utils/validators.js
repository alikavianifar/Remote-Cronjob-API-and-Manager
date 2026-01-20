// Input validation schemas using Zod
import { z } from 'zod';

// Cron expression validation regex (5 fields)
const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|[0-6]|\*\/[0-6])$/;

/**
 * Login schema
 */
export const loginSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters')
});

/**
 * Create job schema
 */
export const createJobSchema = z.object({
    name: z.string()
        .min(1, 'Job name is required')
        .max(100, 'Job name must be at most 100 characters'),
    expression: z.string()
        .min(9, 'Expression must be at least 9 characters')
        .max(50, 'Expression must be at most 50 characters')
        .refine(val => {
            // More lenient validation - just check 5 fields
            const parts = val.trim().split(/\s+/);
            return parts.length === 5;
        }, 'Invalid cron expression format'),
    command: z.string()
        .min(1, 'Command is required')
        .max(1000, 'Command must be at most 1000 characters'),
    description: z.string()
        .max(500, 'Description must be at most 500 characters')
        .optional()
        .default('')
});

/**
 * Update job schema (all fields optional)
 */
export const updateJobSchema = z.object({
    name: z.string()
        .min(1, 'Job name is required')
        .max(100, 'Job name must be at most 100 characters')
        .optional(),
    expression: z.string()
        .min(9, 'Expression must be at least 9 characters')
        .max(50, 'Expression must be at most 50 characters')
        .refine(val => {
            const parts = val.trim().split(/\s+/);
            return parts.length === 5;
        }, 'Invalid cron expression format')
        .optional(),
    command: z.string()
        .min(1, 'Command is required')
        .max(1000, 'Command must be at most 1000 characters')
        .optional(),
    description: z.string()
        .max(500, 'Description must be at most 500 characters')
        .optional()
});

/**
 * Cron parse schema
 */
export const cronParseSchema = z.object({
    expression: z.string()
        .min(9, 'Expression is required')
        .max(50, 'Expression must be at most 50 characters')
});

/**
 * Validation middleware factory
 */
export const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace body with parsed/transformed data
        req.body = result.data;
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.message
        });
    }
};
