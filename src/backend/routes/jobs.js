// Jobs routes
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import crontabService from '../services/crontab.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, createJobSchema, updateJobSchema, cronParseSchema } from '../utils/validators.js';
import logger from '../services/logger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/jobs
 * List all cronjobs
 */
router.get('/', asyncHandler(async (req, res) => {
    const jobs = await crontabService.getJobs();

    res.json({
        success: true,
        data: jobs,
        total: jobs.length
    });
}));

/**
 * GET /api/jobs/:id
 * Get single job details
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const job = await crontabService.getJob(req.params.id);

    if (!job) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    res.json({
        success: true,
        data: job
    });
}));

/**
 * POST /api/jobs
 * Create new cronjob
 */
router.post('/', validate(createJobSchema), asyncHandler(async (req, res) => {
    const { name, expression, command, description } = req.body;

    // Validate expression
    const validation = crontabService.validateExpression(expression);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            error: 'Invalid cron expression',
            details: [{ field: 'expression', message: validation.error }]
        });
    }

    const job = await crontabService.createJob({
        name,
        expression,
        command,
        description
    });

    // Log to database
    const stmt = db.prepare(`
    INSERT INTO jobs (id, name, expression, command, description, status, next_run)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(job.id, job.name, job.expression, job.command, job.description, job.status, job.nextRun);

    res.status(201).json({
        success: true,
        data: job,
        message: 'Job created successfully'
    });
}));

/**
 * PUT /api/jobs/:id
 * Update existing cronjob
 */
router.put('/:id', validate(updateJobSchema), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if job exists
    const existing = await crontabService.getJob(id);
    if (!existing) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    // Validate expression if provided
    if (req.body.expression) {
        const validation = crontabService.validateExpression(req.body.expression);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cron expression',
                details: [{ field: 'expression', message: validation.error }]
            });
        }
    }

    const job = await crontabService.updateJob(id, req.body);

    res.json({
        success: true,
        data: job,
        message: 'Job updated successfully'
    });
}));

/**
 * DELETE /api/jobs/:id
 * Delete cronjob
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deleted = await crontabService.deleteJob(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    // Remove from database
    const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
    stmt.run(id);

    res.json({
        success: true,
        message: 'Job deleted successfully'
    });
}));

/**
 * POST /api/jobs/:id/run
 * Force run a job
 */
router.post('/:id/run', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await crontabService.runJob(id);

    if (!result) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    // Log execution
    const logStmt = db.prepare(`
    INSERT INTO job_logs (id, job_id, executed_at, duration, exit_code, stdout, stderr, triggered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    logStmt.run(
        uuidv4(),
        id,
        result.completedAt,
        result.duration,
        result.exitCode,
        result.stdout,
        result.stderr,
        'manual'
    );

    res.json({
        success: true,
        data: result,
        message: 'Job execution ' + (result.status === 'completed' ? 'completed' : 'failed')
    });
}));

/**
 * POST /api/jobs/:id/toggle
 * Toggle job status (active/paused)
 */
router.post('/:id/toggle', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await crontabService.toggleJob(id);

    if (!result) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    res.json({
        success: true,
        data: {
            id: result.id,
            status: result.status,
            previousStatus: result.previousStatus
        },
        message: 'Job status updated'
    });
}));

/**
 * GET /api/jobs/:id/logs
 * Get job execution logs
 */
router.get('/:id/logs', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Check if job exists
    const job = await crontabService.getJob(id);
    if (!job) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    // Get logs from database
    const logsStmt = db.prepare(`
    SELECT * FROM job_logs 
    WHERE job_id = ? 
    ORDER BY executed_at DESC 
    LIMIT ? OFFSET ?
  `);
    const logs = logsStmt.all(id, limit, offset);

    const countStmt = db.prepare('SELECT COUNT(*) as total FROM job_logs WHERE job_id = ?');
    const { total } = countStmt.get(id);

    res.json({
        success: true,
        data: logs.map(log => ({
            id: log.id,
            jobId: log.job_id,
            executedAt: log.executed_at,
            duration: log.duration,
            exitCode: log.exit_code,
            stdout: log.stdout,
            stderr: log.stderr,
            triggeredBy: log.triggered_by
        })),
        total,
        limit,
        offset
    });
}));

/**
 * POST /api/cron/parse
 * Parse cron expression to human readable
 */
router.post('/cron/parse', validate(cronParseSchema), asyncHandler(async (req, res) => {
    const { expression } = req.body;

    const validation = crontabService.validateExpression(expression);
    const human = crontabService.parseExpression(expression);

    // Calculate next 5 runs
    const nextRuns = [];
    let currentDate = new Date();
    for (let i = 0; i < 5; i++) {
        const nextRun = crontabService.calculateNextRun(expression);
        nextRuns.push(nextRun.toISOString());
        currentDate = new Date(nextRun.getTime() + 60000);
    }

    res.json({
        success: true,
        data: {
            expression,
            human,
            nextRuns,
            isValid: validation.valid
        }
    });
}));

export default router;
