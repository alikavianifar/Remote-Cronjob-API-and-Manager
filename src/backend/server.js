// Main server entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import logger from './services/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import crontabService from './services/crontab.js';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.logRequest(req, res, Date.now() - start);
    });
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        mode: config.crontab.mockMode ? 'mock' : 'live'
    });
});

// Self-test endpoint (Auto Test Ability)
app.get('/api/test', async (req, res) => {
    const tests = [];
    const startTime = Date.now();

    // Test 1: Database connection
    try {
        const testStart = Date.now();
        const db = (await import('./database/db.js')).default;
        db.prepare('SELECT 1').get();
        tests.push({
            name: 'Database Connection',
            status: 'passed',
            duration: Date.now() - testStart
        });
    } catch (error) {
        tests.push({
            name: 'Database Connection',
            status: 'failed',
            error: error.message,
            duration: 0
        });
    }

    // Test 2: Crontab service
    try {
        const testStart = Date.now();
        const jobs = await crontabService.getJobs();
        tests.push({
            name: 'Crontab Service',
            status: 'passed',
            duration: Date.now() - testStart,
            details: `Found ${jobs.length} jobs`
        });
    } catch (error) {
        tests.push({
            name: 'Crontab Service',
            status: 'failed',
            error: error.message,
            duration: 0
        });
    }

    // Test 3: Cron expression parsing
    try {
        const testStart = Date.now();
        const result = crontabService.parseExpression('0 2 * * *');
        tests.push({
            name: 'Cron Expression Parser',
            status: result ? 'passed' : 'failed',
            duration: Date.now() - testStart
        });
    } catch (error) {
        tests.push({
            name: 'Cron Expression Parser',
            status: 'failed',
            error: error.message,
            duration: 0
        });
    }

    // Test 4: Logging
    try {
        const testStart = Date.now();
        logger.info('Self-test logging check');
        tests.push({
            name: 'Logging System',
            status: 'passed',
            duration: Date.now() - testStart
        });
    } catch (error) {
        tests.push({
            name: 'Logging System',
            status: 'failed',
            error: error.message,
            duration: 0
        });
    }

    // Test 5: Configuration
    try {
        const testStart = Date.now();
        const hasSecret = config.jwtSecret && config.jwtSecret.length > 10;
        tests.push({
            name: 'Configuration',
            status: hasSecret ? 'passed' : 'warning',
            duration: Date.now() - testStart,
            details: hasSecret ? 'JWT secret configured' : 'Using default JWT secret'
        });
    } catch (error) {
        tests.push({
            name: 'Configuration',
            status: 'failed',
            error: error.message,
            duration: 0
        });
    }

    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const warnings = tests.filter(t => t.status === 'warning').length;

    res.json({
        success: failed === 0,
        tests,
        summary: {
            total: tests.length,
            passed,
            failed,
            warnings,
            duration: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);

// Parse cron endpoint (no auth required for demo)
app.post('/api/cron/parse', express.json(), (req, res) => {
    const { expression } = req.body;

    if (!expression) {
        return res.status(400).json({
            success: false,
            error: 'Expression is required'
        });
    }

    const validation = crontabService.validateExpression(expression);
    const human = crontabService.parseExpression(expression);

    res.json({
        success: true,
        data: {
            expression,
            human,
            isValid: validation.valid
        }
    });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.port, config.host, () => {
    logger.info(`🚀 Server running at http://${config.host}:${config.port}`);
    logger.info(`📊 Mode: ${config.crontab.mockMode ? 'MOCK (Windows)' : 'LIVE (Linux)'}`);
    logger.info(`🔐 Default admin: ${config.defaultAdmin.username}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export default app;
