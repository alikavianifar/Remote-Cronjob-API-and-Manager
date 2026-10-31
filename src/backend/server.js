import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { createLogger } from './lib/logger.js';
import { ensureAdmin } from './services/authService.js';
import { CrontabService, MockCrontab, SystemCrontab } from './services/crontab.js';
import { createMockRunner, createRunner } from './services/runner.js';
import { JsonStore } from './store/jsonStore.js';

const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });

try {
    const config = loadConfig();
    const store = new JsonStore(config.dataFile);
    ensureAdmin({ store, config, logger });

    const crontab = new CrontabService(config.mockMode ? new MockCrontab() : new SystemCrontab({ bin: config.crontabBin }));
    const runner = config.mockMode
        ? createMockRunner()
        : createRunner({ timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });

    if (config.mockMode) logger.warn('Mock mode: the real crontab is not touched and commands are not executed.');
    else await crontab.check().catch((err) => logger.warn(`Crontab is not accessible: ${err.message}`));

    const app = createApp({ config, store, crontab, runner, logger });
    const server = app.listen(config.port, config.host, () => {
        logger.info(`Cronjob Manager API listening on http://${config.host}:${config.port} (${config.env})`);
    });

    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 5000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (err) {
    logger.error(err.message);
    process.exit(1);
}
