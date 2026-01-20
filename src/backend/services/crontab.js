// Crontab service for reading/writing cron jobs
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import cronstrue from 'cronstrue';
import config from '../config/index.js';
import logger from './logger.js';

const execAsync = promisify(exec);

// Mock data for Windows development
let mockCrontab = [
    {
        id: uuidv4(),
        name: 'System Backup',
        expression: '0 2 * * *',
        command: '/opt/scripts/backup.sh',
        description: 'Daily system backup at 2 AM',
        status: 'active',
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        nextRun: new Date(Date.now() + 82800000).toISOString(),
        lastExitCode: 0
    },
    {
        id: uuidv4(),
        name: 'Log Rotation',
        expression: '0 0 * * 0',
        command: 'logrotate /etc/logrotate.conf',
        description: 'Weekly log rotation every Sunday',
        status: 'active',
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        nextRun: new Date(Date.now() + 518400000).toISOString(),
        lastExitCode: 0
    },
    {
        id: uuidv4(),
        name: 'Health Check',
        expression: '*/5 * * * *',
        command: 'curl -s http://localhost/health',
        description: 'Check server health every 5 minutes',
        status: 'paused',
        lastRun: null,
        nextRun: null,
        lastExitCode: null
    }
];

class CrontabService {
    constructor() {
        this.mockMode = config.crontab.mockMode;
        if (this.mockMode) {
            logger.info('Running in MOCK mode (Windows detected)');
        }
    }

    /**
     * Parse cron expression to human readable format
     */
    parseExpression(expression) {
        try {
            return cronstrue.toString(expression);
        } catch (error) {
            return 'Invalid expression';
        }
    }

    /**
     * Validate cron expression
     */
    validateExpression(expression) {
        // Basic validation for 5-field cron expression
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) {
            return { valid: false, error: 'Expression must have exactly 5 fields' };
        }

        try {
            cronstrue.toString(expression);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Calculate next run time from cron expression
     */
    calculateNextRun(expression) {
        // Simplified calculation - in production use cron-parser
        const now = new Date();
        const parts = expression.split(' ');

        // For demo purposes, just add some time based on expression
        if (expression === '* * * * *') {
            return new Date(now.getTime() + 60000); // 1 minute
        } else if (expression.startsWith('*/')) {
            const interval = parseInt(parts[0].slice(2)) || 5;
            return new Date(now.getTime() + interval * 60000);
        } else if (parts[0] === '0' && parts[1] !== '*') {
            // Specific hour
            const nextRun = new Date(now);
            nextRun.setHours(parseInt(parts[1]), 0, 0, 0);
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            return nextRun;
        }

        // Default: next day at midnight
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    /**
     * Get all cron jobs
     */
    async getJobs() {
        if (this.mockMode) {
            return mockCrontab.map(job => ({
                ...job,
                expressionHuman: this.parseExpression(job.expression)
            }));
        }

        try {
            const { stdout } = await execAsync('crontab -l');
            return this.parseCrontabOutput(stdout);
        } catch (error) {
            if (error.message.includes('no crontab')) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get single job by ID
     */
    async getJob(id) {
        const jobs = await this.getJobs();
        return jobs.find(job => job.id === id) || null;
    }

    /**
     * Create new cron job
     */
    async createJob(jobData) {
        const newJob = {
            id: uuidv4(),
            name: jobData.name,
            expression: jobData.expression,
            command: jobData.command,
            description: jobData.description || '',
            status: 'active',
            lastRun: null,
            nextRun: this.calculateNextRun(jobData.expression).toISOString(),
            lastExitCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.mockMode) {
            mockCrontab.push(newJob);
            logger.info('Created mock job', { id: newJob.id, name: newJob.name });
            return { ...newJob, expressionHuman: this.parseExpression(newJob.expression) };
        }

        try {
            // Get current crontab
            let currentCrontab = '';
            try {
                const { stdout } = await execAsync('crontab -l');
                currentCrontab = stdout;
            } catch (e) {
                // No existing crontab
            }

            // Add new job with comment for ID tracking
            const jobLine = `# CRONMGR:${newJob.id}:${newJob.name}\n${newJob.expression} ${newJob.command}`;
            const newCrontab = currentCrontab + '\n' + jobLine;

            // Write new crontab
            await execAsync(`echo "${newCrontab}" | crontab -`);

            logger.info('Created cron job', { id: newJob.id, name: newJob.name });
            return { ...newJob, expressionHuman: this.parseExpression(newJob.expression) };
        } catch (error) {
            logger.error('Failed to create job', { error: error.message });
            throw error;
        }
    }

    /**
     * Update existing job
     */
    async updateJob(id, jobData) {
        if (this.mockMode) {
            const index = mockCrontab.findIndex(job => job.id === id);
            if (index === -1) {
                return null;
            }

            mockCrontab[index] = {
                ...mockCrontab[index],
                ...jobData,
                nextRun: jobData.expression ?
                    this.calculateNextRun(jobData.expression).toISOString() :
                    mockCrontab[index].nextRun,
                updatedAt: new Date().toISOString()
            };

            logger.info('Updated mock job', { id });
            return {
                ...mockCrontab[index],
                expressionHuman: this.parseExpression(mockCrontab[index].expression)
            };
        }

        // For Linux: would need to parse, update, and rewrite crontab
        throw new Error('Linux crontab update not yet implemented');
    }

    /**
     * Delete job
     */
    async deleteJob(id) {
        if (this.mockMode) {
            const index = mockCrontab.findIndex(job => job.id === id);
            if (index === -1) {
                return false;
            }
            mockCrontab.splice(index, 1);
            logger.info('Deleted mock job', { id });
            return true;
        }

        // For Linux: would need to parse and remove from crontab
        throw new Error('Linux crontab delete not yet implemented');
    }

    /**
     * Toggle job status
     */
    async toggleJob(id) {
        if (this.mockMode) {
            const job = mockCrontab.find(j => j.id === id);
            if (!job) {
                return null;
            }

            const previousStatus = job.status;
            job.status = job.status === 'active' ? 'paused' : 'active';
            job.updatedAt = new Date().toISOString();

            if (job.status === 'active') {
                job.nextRun = this.calculateNextRun(job.expression).toISOString();
            } else {
                job.nextRun = null;
            }

            logger.info('Toggled job status', { id, from: previousStatus, to: job.status });
            return {
                ...job,
                previousStatus,
                expressionHuman: this.parseExpression(job.expression)
            };
        }

        throw new Error('Linux crontab toggle not yet implemented');
    }

    /**
     * Force run a job
     */
    async runJob(id) {
        const job = await this.getJob(id);
        if (!job) {
            return null;
        }

        const executionId = uuidv4();
        const startTime = Date.now();

        logger.info('Force running job', { id, name: job.name, executionId });

        if (this.mockMode) {
            // Simulate execution
            return new Promise((resolve) => {
                setTimeout(() => {
                    const duration = Date.now() - startTime;
                    const result = {
                        jobId: id,
                        executionId,
                        startedAt: new Date(startTime).toISOString(),
                        completedAt: new Date().toISOString(),
                        duration,
                        exitCode: 0,
                        stdout: `Simulated execution of: ${job.command}\nOutput: Success`,
                        stderr: '',
                        status: 'completed'
                    };

                    // Update job last run
                    const jobIndex = mockCrontab.findIndex(j => j.id === id);
                    if (jobIndex !== -1) {
                        mockCrontab[jobIndex].lastRun = result.completedAt;
                        mockCrontab[jobIndex].lastExitCode = 0;
                    }

                    logger.info('Job execution completed', { id, duration });
                    resolve(result);
                }, 1500); // Simulate 1.5s execution
            });
        }

        // For Linux: actually execute the command
        try {
            const { stdout, stderr } = await execAsync(job.command, { timeout: 60000 });
            return {
                jobId: id,
                executionId,
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                duration: Date.now() - startTime,
                exitCode: 0,
                stdout,
                stderr,
                status: 'completed'
            };
        } catch (error) {
            return {
                jobId: id,
                executionId,
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                duration: Date.now() - startTime,
                exitCode: error.code || 1,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                status: 'failed'
            };
        }
    }

    /**
     * Parse crontab output to job objects
     */
    parseCrontabOutput(crontabContent) {
        const lines = crontabContent.split('\n');
        const jobs = [];
        let currentMeta = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Check for our metadata comment
            if (trimmed.startsWith('# CRONMGR:')) {
                const parts = trimmed.slice(10).split(':');
                currentMeta = { id: parts[0], name: parts[1] || 'Unknown' };
                continue;
            }

            // Skip comments and empty lines
            if (trimmed.startsWith('#') || !trimmed) {
                continue;
            }

            // Parse cron line
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 6) {
                const expression = parts.slice(0, 5).join(' ');
                const command = parts.slice(5).join(' ');

                jobs.push({
                    id: currentMeta?.id || uuidv4(),
                    name: currentMeta?.name || command.slice(0, 30),
                    expression,
                    command,
                    description: '',
                    status: 'active',
                    expressionHuman: this.parseExpression(expression),
                    lastRun: null,
                    nextRun: this.calculateNextRun(expression).toISOString(),
                    lastExitCode: null
                });
            }

            currentMeta = null;
        }

        return jobs;
    }
}

export default new CrontabService();
