import { spawn } from 'node:child_process';
import os from 'node:os';

const SECRET_ENV_KEYS = ['JWT_SECRET', 'ADMIN_PASSWORD', 'ADMIN_USERNAME'];

function childEnv() {
    const env = { ...process.env };
    for (const key of SECRET_ENV_KEYS) delete env[key];
    return env;
}

class OutputBuffer {
    constructor(limit) {
        this.limit = limit;
        this.chunks = [];
        this.size = 0;
        this.truncated = false;
    }

    push(chunk) {
        if (this.size >= this.limit) {
            this.truncated = true;
            return;
        }
        const room = this.limit - this.size;
        const piece = chunk.length > room ? chunk.subarray(0, room) : chunk;
        if (piece.length < chunk.length) this.truncated = true;
        this.chunks.push(piece);
        this.size += piece.length;
    }

    toString() {
        const text = Buffer.concat(this.chunks).toString('utf8');
        return this.truncated ? `${text}\n[output truncated]` : text;
    }
}

/**
 * Executes a job's command with `/bin/sh -c`, which is what cron itself does.
 * Only authenticated administrators can reach this, and the command text is never
 * interpolated into another command line.
 */
export function createRunner({ timeoutMs, maxOutputBytes, shell = '/bin/sh' }) {
    return {
        async run(command) {
            const startedAt = new Date();
            const stdout = new OutputBuffer(maxOutputBytes);
            const stderr = new OutputBuffer(maxOutputBytes);
            let timedOut = false;

            const exitCode = await new Promise((resolve) => {
                const child = spawn(shell, ['-c', command], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: childEnv(),
                    detached: true
                });

                const timer = setTimeout(() => {
                    timedOut = true;
                    try {
                        process.kill(-child.pid, 'SIGKILL'); // whole process group
                    } catch {
                        child.kill('SIGKILL');
                    }
                }, timeoutMs);

                child.stdout.on('data', (d) => stdout.push(d));
                child.stderr.on('data', (d) => stderr.push(d));
                child.on('error', (err) => {
                    clearTimeout(timer);
                    stderr.push(Buffer.from(`Failed to start shell: ${err.message}`));
                    resolve(127);
                });
                child.on('close', (code, signal) => {
                    clearTimeout(timer);
                    if (timedOut) resolve(124);
                    else if (code !== null) resolve(code);
                    else resolve(128 + (os.constants.signals[signal] ?? 0));
                });
            });

            if (timedOut) stderr.push(Buffer.from(`\nCommand timed out after ${timeoutMs / 1000}s and was killed.`));
            const completedAt = new Date();

            return {
                exitCode,
                stdout: stdout.toString(),
                stderr: stderr.toString(),
                timedOut,
                startedAt,
                completedAt,
                duration: completedAt - startedAt
            };
        }
    };
}

/** Runner for mock mode: reports success without executing anything. */
export function createMockRunner() {
    return {
        async run(command) {
            const startedAt = new Date();
            return {
                exitCode: 0,
                stdout: `[mock mode] Simulated execution - nothing was run.\n${command}`,
                stderr: '',
                timedOut: false,
                startedAt,
                completedAt: new Date(),
                duration: 0
            };
        }
    };
}
