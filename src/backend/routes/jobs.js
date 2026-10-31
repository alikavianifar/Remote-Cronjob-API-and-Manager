import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createJobSchema, logsQuerySchema, updateJobSchema, validate } from '../utils/validators.js';

export function createJobsRouter({ jobs }) {
    const router = Router();

    router.get('/', (_req, res) => res.json({ success: true, data: jobs.list() }));

    router.post(
        '/',
        validate(createJobSchema),
        asyncHandler(async (req, res) => {
            res.status(201).json({ success: true, data: await jobs.create(req.body) });
        })
    );

    router.get('/:id', (req, res) => res.json({ success: true, data: jobs.get(req.params.id) }));

    router.put(
        '/:id',
        validate(updateJobSchema),
        asyncHandler(async (req, res) => {
            res.json({ success: true, data: await jobs.update(req.params.id, req.body) });
        })
    );

    router.delete(
        '/:id',
        asyncHandler(async (req, res) => {
            await jobs.remove(req.params.id);
            res.json({ success: true });
        })
    );

    router.post(
        '/:id/toggle',
        asyncHandler(async (req, res) => {
            res.json({ success: true, data: await jobs.toggle(req.params.id) });
        })
    );

    router.post(
        '/:id/run',
        asyncHandler(async (req, res) => {
            res.json({ success: true, data: await jobs.run(req.params.id, 'manual') });
        })
    );

    router.get('/:id/logs', validate(logsQuerySchema, 'query'), (req, res) => {
        const { limit, offset } = req.query;
        const { total, items } = jobs.logs(req.params.id, { limit, offset });
        res.json({ success: true, data: items, pagination: { total, limit, offset } });
    });

    return router;
}
