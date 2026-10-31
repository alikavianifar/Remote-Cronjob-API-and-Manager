import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { describeExpression, nextRuns, validateExpression } from '../lib/cron.js';
import { badRequest } from '../lib/errors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';
import { cronParseSchema, validate } from '../utils/validators.js';

export function createUtilRouter({ config, store, crontab, runner }) {
    const router = Router();

    router.post('/cron/parse', validate(cronParseSchema), (req, res) => {
        const result = validateExpression(req.body.expression);
        if (!result.valid) throw badRequest(result.error);

        res.json({
            success: true,
            data: {
                expression: result.normalized,
                human: describeExpression(result.normalized),
                nextRuns: nextRuns(result.normalized, 5).map((d) => d.toISOString())
            }
        });
    });

    // Non-destructive self-check of the main components. It never creates or changes jobs.
    router.get(
        '/test',
        asyncHandler(async (req, res) => {
            const checks = [
                ['Data store is readable', async () => store.listJobs()],
                ['Crontab is accessible', async () => crontab.check()],
                [
                    'Cron expressions are parsed',
                    async () => {
                        if (nextRuns('*/5 * * * *', 1).length !== 1) throw new Error('could not compute next run');
                    }
                ],
                [
                    'Token signing works',
                    async () => {
                        const token = signToken(config, req.user);
                        jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
                    }
                ],
                [
                    'Commands can be executed',
                    async () => {
                        const r = await runner.run('echo cronmgr-selftest');
                        if (r.exitCode !== 0) throw new Error(`exit code ${r.exitCode}`);
                    }
                ]
            ];

            const tests = [];
            for (const [name, fn] of checks) {
                try {
                    await fn();
                    tests.push({ name, passed: true });
                } catch (err) {
                    tests.push({ name, passed: false, message: err.message });
                }
            }
            const passed = tests.filter((t) => t.passed).length;
            res.json({
                success: passed === tests.length,
                mode: crontab.mode,
                summary: { total: tests.length, passed, failed: tests.length - passed },
                tests
            });
        })
    );

    return router;
}
