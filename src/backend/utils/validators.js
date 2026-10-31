import { z } from 'zod';
import { validateExpression } from '../lib/cron.js';
import { badRequest } from '../lib/errors.js';

// Control characters (except tab) would break the crontab's line-based format.
const CONTROL_CHARS = /[\u0000-\u0008\u000a-\u001f\u007f]/;
// Descriptions are never written to the crontab, so line breaks are fine there.
const DESCRIPTION_FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const name = z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .refine((v) => !CONTROL_CHARS.test(v), 'Name must not contain control characters or line breaks');

const command = z
    .string()
    .trim()
    .min(1, 'Command is required')
    .max(2000, 'Command must be at most 2000 characters')
    .refine((v) => !CONTROL_CHARS.test(v), 'Command must be a single line without control characters');

const expression = z
    .string()
    .trim()
    .min(1, 'Schedule expression is required')
    .max(100, 'Schedule expression is too long')
    .superRefine((value, ctx) => {
        const result = validateExpression(value);
        if (!result.valid) ctx.addIssue({ code: 'custom', message: result.error });
    })
    .transform((value) => value.split(/\s+/).join(' '));

const description = z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .refine((v) => !DESCRIPTION_FORBIDDEN.test(v), 'Description contains invalid control characters');

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required').max(64),
    password: z.string().min(1, 'Password is required').max(256)
});

export const createJobSchema = z.object({
    name,
    expression,
    command,
    description: description.optional()
});

export const updateJobSchema = z
    .object({
        name: name.optional(),
        expression: expression.optional(),
        command: command.optional(),
        description: description.optional()
    })
    .refine((value) => Object.values(value).some((v) => v !== undefined), 'Provide at least one field to update');

export const cronParseSchema = z.object({ expression: z.string().max(100) });

export const logsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
});

/** Express middleware factory: validates and replaces `req[source]` with the parsed value. */
export function validate(schema, source = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source] ?? {});
        if (!result.success) {
            const details = result.error.issues.map((issue) => ({
                field: issue.path.join('.') || source,
                message: issue.message
            }));
            return next(badRequest('Validation failed', details));
        }
        req[source] = result.data;
        next();
    };
}
