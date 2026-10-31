import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEV_ADMIN_PASSWORD = 'admin123';

function toInt(value, fallback, name) {
    if (value === undefined || value === '') return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`Invalid configuration: ${name} must be a positive integer (got "${value}")`);
    }
    return n;
}

/**
 * Build the runtime configuration from environment variables.
 * Throws when a production deployment would start with unsafe defaults.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadConfig(env = process.env) {
    const nodeEnv = env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    const problems = [];

    let jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
        if (isProduction) {
            problems.push('JWT_SECRET is required in production');
        } else {
            // Random per process: tokens never survive a restart, and no secret is ever committed.
            jwtSecret = crypto.randomBytes(32).toString('hex');
        }
    } else if (isProduction && jwtSecret.length < 32) {
        problems.push('JWT_SECRET must be at least 32 characters in production');
    }

    const adminUsername = env.ADMIN_USERNAME || 'admin';
    let adminPassword = env.ADMIN_PASSWORD;
    const adminPasswordFromEnv = Boolean(adminPassword);
    if (!adminPassword) {
        if (isProduction) {
            problems.push('ADMIN_PASSWORD is required in production');
        } else {
            adminPassword = DEV_ADMIN_PASSWORD;
        }
    } else if (isProduction && adminPassword.length < 12) {
        problems.push('ADMIN_PASSWORD must be at least 12 characters in production');
    }

    if (problems.length > 0) {
        throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    }

    const platformMock = process.platform === 'win32';
    const mockMode = env.CRONMGR_MOCK !== undefined ? env.CRONMGR_MOCK === 'true' : platformMock;

    return Object.freeze({
        env: nodeEnv,
        isProduction,
        host: env.HOST || '127.0.0.1',
        port: toInt(env.PORT, 3000, 'PORT'),
        trustProxy: env.TRUST_PROXY === 'true',
        corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        jwtSecret,
        jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
        adminUsername,
        adminPassword,
        adminPasswordFromEnv,
        usingDevAdminPassword: !adminPasswordFromEnv,
        dataFile: env.DATA_FILE ? path.resolve(env.DATA_FILE) : path.join(backendDir, 'data', 'db.json'),
        crontabBin: env.CRONTAB_BIN || 'crontab',
        mockMode,
        commandTimeoutMs: toInt(env.COMMAND_TIMEOUT_MS, 60_000, 'COMMAND_TIMEOUT_MS'),
        maxOutputBytes: toInt(env.MAX_OUTPUT_BYTES, 64 * 1024, 'MAX_OUTPUT_BYTES'),
        logRetentionPerJob: toInt(env.LOG_RETENTION_PER_JOB, 200, 'LOG_RETENTION_PER_JOB'),
        loginRateLimit: {
            windowMs: toInt(env.LOGIN_RATE_WINDOW_MS, 15 * 60_000, 'LOGIN_RATE_WINDOW_MS'),
            max: toInt(env.LOGIN_RATE_MAX, 10, 'LOGIN_RATE_MAX')
        },
        apiRateLimit: {
            windowMs: toInt(env.API_RATE_WINDOW_MS, 15 * 60_000, 'API_RATE_WINDOW_MS'),
            max: toInt(env.API_RATE_MAX, 600, 'API_RATE_MAX')
        },
        logLevel: env.LOG_LEVEL || 'info'
    });
}
