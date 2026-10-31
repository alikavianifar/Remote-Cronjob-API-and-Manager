import crypto from 'node:crypto';
import { describeExpression, nextRuns } from '../lib/cron.js';
import { conflict, notFound } from '../lib/errors.js';

/**
 * Job operations. The store is the source of truth; after every change the crontab's managed
 * block is regenerated from it. If writing the crontab fails the store change is rolled back,
 * so the two never disagree.
 */
export class JobService {
    #lock = Promise.resolve();
    #running = new Set();

    constructor({ store, crontab, runner, retentionPerJob }) {
        this.store = store;
        this.crontab = crontab;
        this.runner = runner;
        this.retentionPerJob = retentionPerJob;
    }

    /** Serialise operations that change jobs, so concurrent requests cannot interleave. */
    async #exclusive(fn) {
        const previous = this.#lock;
        let release;
        this.#lock = new Promise((resolve) => (release = resolve));
        await previous;
        try {
            return await fn();
        } finally {
            release();
        }
    }

    async #commit(change) {
        const snapshot = this.store.snapshot();
        const result = change();
        try {
            await this.crontab.sync(this.store.listJobs());
        } catch (err) {
            this.store.restore(snapshot);
            throw err;
        }
        return result;
    }

    present(job) {
        const [next] = job.status === 'active' ? nextRuns(job.expression, 1) : [];
        return {
            ...job,
            expressionHuman: describeExpression(job.expression),
            nextRun: next ? next.toISOString() : null
        };
    }

    list() {
        return this.store.listJobs().map((job) => this.present(job));
    }

    get(id) {
        const job = this.store.getJob(id);
        if (!job) throw notFound('Job');
        return this.present(job);
    }

    create(input) {
        return this.#exclusive(() =>
            this.#commit(() => {
                const now = new Date().toISOString();
                const job = {
                    id: crypto.randomUUID(),
                    name: input.name,
                    expression: input.expression,
                    command: input.command,
                    description: input.description ?? '',
                    status: 'active',
                    lastRun: null,
                    lastExitCode: null,
                    createdAt: now,
                    updatedAt: now
                };
                this.store.insertJob(job);
                return this.present(job);
            })
        );
    }

    update(id, patch) {
        return this.#exclusive(() => {
            if (!this.store.getJob(id)) throw notFound('Job');
            return this.#commit(() => {
                const updated = this.store.updateJob(id, { ...patch, updatedAt: new Date().toISOString() });
                return this.present(updated);
            });
        });
    }

    remove(id) {
        return this.#exclusive(() => {
            if (!this.store.getJob(id)) throw notFound('Job');
            return this.#commit(() => {
                this.store.deleteJob(id);
            });
        });
    }

    toggle(id) {
        return this.#exclusive(() => {
            const job = this.store.getJob(id);
            if (!job) throw notFound('Job');
            return this.#commit(() => {
                const status = job.status === 'active' ? 'paused' : 'active';
                const updated = this.store.updateJob(id, { status, updatedAt: new Date().toISOString() });
                return this.present(updated);
            });
        });
    }

    async run(id, triggeredBy = 'manual') {
        const job = this.store.getJob(id);
        if (!job) throw notFound('Job');
        if (this.#running.has(id)) throw conflict('This job is already running');

        this.#running.add(id);
        try {
            const result = await this.runner.run(job.command);
            const entry = {
                id: crypto.randomUUID(),
                jobId: id,
                executedAt: result.startedAt.toISOString(),
                completedAt: result.completedAt.toISOString(),
                duration: result.duration,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                timedOut: result.timedOut,
                triggeredBy
            };
            // The job may have been deleted while it was running.
            if (this.store.getJob(id)) {
                this.store.addLog(entry, this.retentionPerJob);
                this.store.updateJob(id, { lastRun: entry.completedAt, lastExitCode: entry.exitCode });
            }
            return entry;
        } finally {
            this.#running.delete(id);
        }
    }

    logs(id, { limit, offset }) {
        if (!this.store.getJob(id)) throw notFound('Job');
        return this.store.listLogs(id, { limit, offset });
    }
}
