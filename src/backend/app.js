import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthenticate } from './middleware/auth.js';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { createAuthRouter } from './routes/auth.js';
import { createJobsRouter } from './routes/jobs.js';
import { createUtilRouter } from './routes/util.js';
import { JobService } from './services/jobService.js';

/**
 * Build the Express application from its dependencies. Nothing is started here,
 * which keeps the app easy to test.
 */
export function createApp({ config, store, crontab, runner, logger }) {
    const app = express();
    if (config.trustProxy) app.set('trust proxy', 1);

    const jobs = new JobService({ store, crontab, runner, retentionPerJob: config.logRetentionPerJob });
    const authenticate = createAuthenticate({ config, store });

    app.use(helmet());
    app.use(
        cors({
            origin(origin, callback) {
                // Requests without an Origin header (curl, server-to-server) are not browser cross-origin requests.
                callback(null, !origin || config.corsOrigins.includes(origin));
            }
        })
    );
    app.use(express.json({ limit: '100kb' }));
    app.use('/api', createRateLimiter(config.apiRateLimit));

    app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

    const loginLimiter = createRateLimiter({ ...config.loginRateLimit, message: 'Too many login attempts, please try again later' });
    app.use('/api/auth', createAuthRouter({ config, store, authenticate, loginLimiter }));
    app.use('/api/jobs', authenticate, createJobsRouter({ jobs }));
    app.use('/api', authenticate, createUtilRouter({ config, store, crontab, runner }));

    app.use(notFoundHandler);
    app.use(createErrorHandler(logger));

    return app;
}
