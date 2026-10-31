import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { loadConfig } from '../config/index.js';
import { createLogger } from '../lib/logger.js';
import { ensureAdmin } from '../services/authService.js';
import { CrontabService, MockCrontab, SystemCrontab } from '../services/crontab.js';
import { createRunner } from '../services/runner.js';
import { JsonStore, MEMORY } from '../store/jsonStore.js';

export const ADMIN = { username: 'admin', password: 'correct-horse-battery' };

export function tmpDir(prefix = 'cronmgr-test-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** A stand-in `crontab` executable that keeps its table in a file (supports `-l` and `-`). */
export function makeFakeCrontabBin(dir) {
    const table = path.join(dir, 'table');
    const bin = path.join(dir, 'crontab');
    fs.writeFileSync(
        bin,
        `#!/bin/sh
F="${table}"
if [ "$1" = "-l" ]; then
  if [ -f "$F" ]; then cat "$F"; else echo "no crontab for tester" >&2; exit 1; fi
elif [ "$1" = "-" ]; then
  cat > "$F"
else
  echo "unsupported" >&2; exit 2
fi
`,
        { mode: 0o755 }
    );
    return { bin, table };
}

/**
 * Start the real app on a random port with an in-memory store.
 * By default a MockCrontab and a real shell runner are used.
 */
export async function startApp({ env = {}, driver, runnerOptions, store } = {}) {
    const config = loadConfig({
        NODE_ENV: 'test',
        JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
        ADMIN_PASSWORD: ADMIN.password,
        CRONMGR_MOCK: 'false',
        ...env
    });
    const logger = createLogger({ level: 'silent' });
    const theStore = store ?? new JsonStore(MEMORY);
    ensureAdmin({ store: theStore, config, logger });

    const theDriver = driver ?? new MockCrontab();
    const crontab = new CrontabService(theDriver);
    const runner = createRunner({
        timeoutMs: config.commandTimeoutMs,
        maxOutputBytes: config.maxOutputBytes,
        ...runnerOptions
    });

    const app = createApp({ config, store: theStore, crontab, runner, logger });
    const server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;

    async function request(method, url, { body, token, headers = {} } = {}) {
        const res = await fetch(base + url, {
            method,
            headers: {
                ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
                ...(token ? { authorization: `Bearer ${token}` } : {}),
                ...headers
            },
            body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
        });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch {
            /* non-JSON body */
        }
        return { status: res.status, body: json, headers: res.headers };
    }

    const login = async () => (await request('POST', '/api/auth/login', { body: ADMIN })).body.token;

    return {
        base,
        config,
        store: theStore,
        driver: theDriver,
        request,
        login,
        close: () => new Promise((resolve) => server.close(resolve))
    };
}

export const sampleJob = (overrides = {}) => ({
    name: 'Backup',
    expression: '0 2 * * *',
    command: '/opt/scripts/backup.sh',
    description: 'Nightly backup',
    ...overrides
});
