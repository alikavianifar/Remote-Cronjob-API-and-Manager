import { spawn } from 'node:child_process';

export const BEGIN_MARKER = '# BEGIN CRONMGR (managed block - changes made here are overwritten)';
export const END_MARKER = '# END CRONMGR';

const BEGIN_PREFIX = '# BEGIN CRONMGR';
const END_PREFIX = '# END CRONMGR';

/**
 * In a crontab, an unescaped "%" ends the command and starts its stdin, so every "%" is escaped.
 * Escaping all of them is exact: cron removes the backslash again before running the command.
 */
export function escapeCommand(command) {
    return command.replace(/%/g, '\\%');
}

/** Render the managed block (marker lines included) for the given jobs. */
export function renderBlock(jobs) {
    if (jobs.length === 0) return [];
    const lines = [BEGIN_MARKER];
    for (const job of jobs) {
        lines.push(`# CRONMGR:${job.id} ${job.name}`);
        const entry = `${job.expression} ${escapeCommand(job.command)}`;
        lines.push(job.status === 'active' ? entry : `#PAUSED ${entry}`);
    }
    lines.push(END_MARKER);
    return lines;
}

/**
 * Replace the managed block inside an existing crontab and leave every other line untouched.
 * @param {string} existing current crontab text
 * @param {Array} jobs desired jobs
 */
export function mergeCrontab(existing, jobs) {
    const kept = [];
    let inBlock = false;
    for (const line of existing.split('\n')) {
        if (!inBlock && line.startsWith(BEGIN_PREFIX)) {
            inBlock = true;
        } else if (inBlock && line.startsWith(END_PREFIX)) {
            inBlock = false;
        } else if (!inBlock) {
            kept.push(line);
        }
    }
    while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();

    const block = renderBlock(jobs);
    const out = [...kept];
    if (block.length > 0) {
        if (out.length > 0) out.push('');
        out.push(...block);
    }
    return out.length > 0 ? `${out.join('\n')}\n` : '';
}

function runProcess(bin, args, { input, timeoutMs = 10_000 } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

        child.stdout.on('data', (d) => (stdout += d));
        child.stderr.on('data', (d) => (stderr += d));
        child.stdin.on('error', () => {}); // the process may exit before reading stdin
        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr });
        });
        child.stdin.end(input ?? '');
    });
}

/** Driver that talks to the real `crontab` binary. No shell is involved at any point. */
export class SystemCrontab {
    mode = 'system';

    constructor({ bin = 'crontab' } = {}) {
        this.bin = bin;
    }

    async read() {
        const { code, stdout, stderr } = await runProcess(this.bin, ['-l']);
        if (code === 0) return stdout;
        if (/no crontab for/i.test(stderr)) return '';
        throw new Error(`crontab -l failed: ${stderr.trim() || `exit code ${code}`}`);
    }

    async write(text) {
        const { code, stderr } = await runProcess(this.bin, ['-'], { input: text });
        if (code !== 0) throw new Error(`crontab - failed: ${stderr.trim() || `exit code ${code}`}`);
    }
}

/** In-memory driver for development on systems without cron, and for tests. */
export class MockCrontab {
    mode = 'mock';
    text = '';

    async read() {
        return this.text;
    }

    async write(text) {
        this.text = text;
    }
}

/** Keeps the crontab's managed block in sync with the stored jobs. */
export class CrontabService {
    constructor(driver) {
        this.driver = driver;
    }

    get mode() {
        return this.driver.mode;
    }

    async sync(jobs) {
        const current = await this.driver.read();
        const next = mergeCrontab(current, jobs);
        if (next !== current) await this.driver.write(next);
    }

    async check() {
        await this.driver.read();
    }
}
