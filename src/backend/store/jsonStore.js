import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 1;
export const MEMORY = ':memory:';

const emptyData = () => ({ version: SCHEMA_VERSION, users: [], jobs: [], logs: [] });

/**
 * Small file-backed store for users, jobs and execution logs.
 *
 * Every mutation is written to disk atomically (temp file + rename), so a crash can never leave a
 * half-written data file. Reads return copies, so callers cannot change stored state by accident.
 * Pass `:memory:` as the file to keep everything in memory (used by the tests).
 */
export class JsonStore {
    #file;
    #data;

    constructor(file) {
        this.#file = file;
        this.#data = this.#load();
    }

    #load() {
        if (this.#file === MEMORY || !fs.existsSync(this.#file)) return emptyData();

        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(this.#file, 'utf8'));
        } catch (err) {
            throw new Error(`Data file ${this.#file} is not valid JSON (${err.message}). Fix or remove it to continue.`);
        }
        if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.jobs) || !Array.isArray(parsed.logs)) {
            throw new Error(`Data file ${this.#file} has an unexpected structure.`);
        }
        return { ...emptyData(), ...parsed };
    }

    #persist() {
        if (this.#file === MEMORY) return;
        fs.mkdirSync(path.dirname(this.#file), { recursive: true });
        const tmp = `${this.#file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.#data, null, 2), { mode: 0o600 });
        fs.renameSync(tmp, this.#file);
    }

    // ---- users ----------------------------------------------------------------------------

    getUserByUsername(username) {
        const user = this.#data.users.find((u) => u.username === username);
        return user ? structuredClone(user) : null;
    }

    getUserById(id) {
        const user = this.#data.users.find((u) => u.id === id);
        return user ? structuredClone(user) : null;
    }

    saveUser(user) {
        const idx = this.#data.users.findIndex((u) => u.id === user.id);
        if (idx === -1) this.#data.users.push(structuredClone(user));
        else this.#data.users[idx] = structuredClone(user);
        this.#persist();
    }

    // ---- jobs -----------------------------------------------------------------------------

    listJobs() {
        return structuredClone(this.#data.jobs);
    }

    getJob(id) {
        const job = this.#data.jobs.find((j) => j.id === id);
        return job ? structuredClone(job) : null;
    }

    insertJob(job) {
        this.#data.jobs.push(structuredClone(job));
        this.#persist();
    }

    updateJob(id, patch) {
        const job = this.#data.jobs.find((j) => j.id === id);
        if (!job) return null;
        Object.assign(job, structuredClone(patch));
        this.#persist();
        return structuredClone(job);
    }

    deleteJob(id) {
        const before = this.#data.jobs.length;
        this.#data.jobs = this.#data.jobs.filter((j) => j.id !== id);
        if (this.#data.jobs.length === before) return false;
        this.#data.logs = this.#data.logs.filter((l) => l.jobId !== id);
        this.#persist();
        return true;
    }

    /** Capture jobs and logs so a failed multi-step operation can be rolled back. */
    snapshot() {
        return structuredClone({ jobs: this.#data.jobs, logs: this.#data.logs });
    }

    restore(snapshot) {
        this.#data.jobs = structuredClone(snapshot.jobs);
        this.#data.logs = structuredClone(snapshot.logs);
        this.#persist();
    }

    // ---- logs -----------------------------------------------------------------------------

    addLog(log, retentionPerJob) {
        this.#data.logs.push(structuredClone(log));
        const own = this.#data.logs.filter((l) => l.jobId === log.jobId);
        if (own.length > retentionPerJob) {
            const drop = new Set(
                own
                    .sort((a, b) => (a.executedAt < b.executedAt ? -1 : 1))
                    .slice(0, own.length - retentionPerJob)
                    .map((l) => l.id)
            );
            this.#data.logs = this.#data.logs.filter((l) => !drop.has(l.id));
        }
        this.#persist();
    }

    /** Newest first. */
    listLogs(jobId, { limit, offset }) {
        const all = this.#data.logs
            .filter((l) => l.jobId === jobId)
            .sort((a, b) => (a.executedAt < b.executedAt ? 1 : a.executedAt > b.executedAt ? -1 : 0));
        return { total: all.length, items: structuredClone(all.slice(offset, offset + limit)) };
    }
}
