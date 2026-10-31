import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { SystemCrontab } from '../services/crontab.js';
import { ADMIN, makeFakeCrontabBin, sampleJob, startApp, tmpDir } from '../testkit/helpers.js';

describe('authentication', () => {
    let ctx;
    before(async () => (ctx = await startApp()));
    after(() => ctx.close());

    it('logs in with valid credentials', async () => {
        const res = await ctx.request('POST', '/api/auth/login', { body: ADMIN });
        assert.equal(res.status, 200);
        assert.ok(res.body.token);
        assert.equal(res.body.user.username, 'admin');
        assert.equal(res.body.user.passwordHash, undefined);
    });

    it('rejects a wrong password and an unknown user with the same message', async () => {
        const a = await ctx.request('POST', '/api/auth/login', { body: { username: 'admin', password: 'nope' } });
        const b = await ctx.request('POST', '/api/auth/login', { body: { username: 'ghost', password: 'nope' } });
        assert.equal(a.status, 401);
        assert.equal(b.status, 401);
        assert.equal(a.body.error, b.body.error);
    });

    it('the development password does not work when ADMIN_PASSWORD is set', async () => {
        const res = await ctx.request('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } });
        assert.equal(res.status, 401);
    });

    it('rejects malformed login payloads', async () => {
        const res = await ctx.request('POST', '/api/auth/login', { body: { username: 'admin' } });
        assert.equal(res.status, 400);
        assert.equal(res.body.details[0].field, 'password');
    });

    it('GET /me requires a token (it used to return user: null to anyone)', async () => {
        assert.equal((await ctx.request('GET', '/api/auth/me')).status, 401);
        const token = await ctx.login();
        const res = await ctx.request('GET', '/api/auth/me', { token });
        assert.equal(res.body.user.username, 'admin');
    });

    for (const [method, url] of [
        ['GET', '/api/jobs'],
        ['POST', '/api/jobs'],
        ['GET', '/api/jobs/x'],
        ['PUT', '/api/jobs/x'],
        ['DELETE', '/api/jobs/x'],
        ['POST', '/api/jobs/x/run'],
        ['POST', '/api/jobs/x/toggle'],
        ['GET', '/api/jobs/x/logs'],
        ['GET', '/api/test'],
        ['POST', '/api/cron/parse'],
        ['POST', '/api/auth/logout']
    ]) {
        it(`${method} ${url} requires authentication`, async () => {
            const body = method === 'GET' || method === 'DELETE' ? undefined : {};
            assert.equal((await ctx.request(method, url, { body })).status, 401);
        });
    }

    it('rejects tampered, foreign and unsigned tokens', async () => {
        const token = await ctx.login();
        const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
        assert.equal((await ctx.request('GET', '/api/jobs', { token: tampered })).status, 401);

        const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
            '{"sub":"x"}'
        ).toString('base64url')}.`;
        assert.equal((await ctx.request('GET', '/api/jobs', { token: unsigned })).status, 401);
    });

    it('rejects expired tokens', async () => {
        const short = await startApp({ env: { JWT_EXPIRES_IN: '1s' } });
        try {
            const token = await short.login();
            await new Promise((r) => setTimeout(r, 2100));
            const res = await short.request('GET', '/api/jobs', { token });
            assert.equal(res.status, 401);
            assert.equal(res.body.error, 'Token expired');
        } finally {
            await short.close();
        }
    });

    it('health check is public and reveals nothing sensitive', async () => {
        const res = await ctx.request('GET', '/api/health');
        assert.equal(res.status, 200);
        assert.deepEqual(Object.keys(res.body).sort(), ['status', 'success', 'timestamp']);
    });
});

describe('rate limiting and CORS', () => {
    it('limits repeated login attempts', async () => {
        const ctx = await startApp({ env: { LOGIN_RATE_MAX: '3' } });
        try {
            const statuses = [];
            for (let i = 0; i < 5; i++) {
                statuses.push((await ctx.request('POST', '/api/auth/login', { body: { username: 'admin', password: 'bad' } })).status);
            }
            assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
            const blocked = await ctx.request('POST', '/api/auth/login', { body: ADMIN });
            assert.equal(blocked.status, 429);
            assert.ok(blocked.headers.get('retry-after'));
        } finally {
            await ctx.close();
        }
    });

    it('limits the API in general', async () => {
        const ctx = await startApp({ env: { API_RATE_MAX: '3' } });
        try {
            const statuses = [];
            for (let i = 0; i < 5; i++) statuses.push((await ctx.request('GET', '/api/health')).status);
            assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
        } finally {
            await ctx.close();
        }
    });

    it('allows only configured origins', async () => {
        const ctx = await startApp({ env: { CORS_ORIGINS: 'https://ui.example' } });
        try {
            const ok = await ctx.request('GET', '/api/health', { headers: { origin: 'https://ui.example' } });
            const bad = await ctx.request('GET', '/api/health', { headers: { origin: 'https://evil.example' } });
            assert.equal(ok.headers.get('access-control-allow-origin'), 'https://ui.example');
            assert.equal(bad.headers.get('access-control-allow-origin'), null);
        } finally {
            await ctx.close();
        }
    });

    it('sets security headers and hides the framework', async () => {
        const ctx = await startApp();
        try {
            const res = await ctx.request('GET', '/api/health');
            assert.equal(res.headers.get('x-powered-by'), null);
            assert.ok(res.headers.get('x-content-type-options'));
        } finally {
            await ctx.close();
        }
    });
});

describe('jobs API', () => {
    let ctx;
    let token;
    before(async () => {
        ctx = await startApp();
        token = await ctx.login();
    });
    after(() => ctx.close());

    const create = (over) => ctx.request('POST', '/api/jobs', { token, body: sampleJob(over) });

    it('starts empty', async () => {
        const res = await ctx.request('GET', '/api/jobs', { token });
        assert.deepEqual(res.body, { success: true, data: [] });
    });

    it('creates a job and writes it to the crontab', async () => {
        const res = await create();
        assert.equal(res.status, 201);
        const job = res.body.data;
        assert.equal(job.status, 'active');
        assert.equal(job.expressionHuman, 'At 02:00');
        assert.ok(job.nextRun);
        assert.match(ctx.driver.text, new RegExp(`CRONMGR:${job.id} Backup`));
        assert.match(ctx.driver.text, /^0 2 \* \* \* \/opt\/scripts\/backup\.sh$/m);
    });

    it('gets, lists, updates (original: HTTP 500) and persists changes to the crontab', async () => {
        const { data: job } = (await create({ name: 'Updatable' })).body;

        const got = await ctx.request('GET', `/api/jobs/${job.id}`, { token });
        assert.equal(got.body.data.name, 'Updatable');

        const upd = await ctx.request('PUT', `/api/jobs/${job.id}`, {
            token,
            body: { expression: '*/10 * * * *', command: 'echo changed' }
        });
        assert.equal(upd.status, 200);
        assert.equal(upd.body.data.expression, '*/10 * * * *');
        assert.equal(upd.body.data.name, 'Updatable');
        assert.match(ctx.driver.text, /^\*\/10 \* \* \* \* echo changed$/m);

        const list = await ctx.request('GET', '/api/jobs', { token });
        assert.ok(list.body.data.some((j) => j.id === job.id));
    });

    it('toggles a job between active and paused (original: not implemented on Linux)', async () => {
        const { data: job } = (await create({ name: 'Toggle me', command: 'echo toggle-marker' })).body;

        const paused = await ctx.request('POST', `/api/jobs/${job.id}/toggle`, { token });
        assert.equal(paused.body.data.status, 'paused');
        assert.equal(paused.body.data.nextRun, null);
        assert.match(ctx.driver.text, /^#PAUSED 0 2 \* \* \* echo toggle-marker$/m);

        const active = await ctx.request('POST', `/api/jobs/${job.id}/toggle`, { token });
        assert.equal(active.body.data.status, 'active');
        assert.match(ctx.driver.text, /^0 2 \* \* \* echo toggle-marker$/m);
    });

    it('deletes a job and removes it from the crontab (original: not implemented on Linux)', async () => {
        const { data: job } = (await create({ name: 'Delete me', command: 'echo delete-marker' })).body;
        const del = await ctx.request('DELETE', `/api/jobs/${job.id}`, { token });
        assert.equal(del.status, 200);
        assert.ok(!ctx.driver.text.includes('delete-marker'));
        assert.equal((await ctx.request('GET', `/api/jobs/${job.id}`, { token })).status, 404);
    });

    it('returns 404 for unknown jobs on every route', async () => {
        for (const [m, u] of [
            ['GET', '/api/jobs/nope'],
            ['PUT', '/api/jobs/nope'],
            ['DELETE', '/api/jobs/nope'],
            ['POST', '/api/jobs/nope/toggle'],
            ['POST', '/api/jobs/nope/run'],
            ['GET', '/api/jobs/nope/logs']
        ]) {
            const res = await ctx.request(m, u, { token, body: m === 'PUT' ? { name: 'x' } : undefined });
            assert.equal(res.status, 404, `${m} ${u}`);
        }
    });

    describe('validation', () => {
        const invalid = async (over, field) => {
            const res = await create(over);
            assert.equal(res.status, 400, JSON.stringify(over));
            assert.ok(res.body.details.some((d) => d.field === field), JSON.stringify(res.body.details));
        };

        it('rejects missing and blank fields', async () => {
            await invalid({ name: '   ' }, 'name');
            await invalid({ command: '' }, 'command');
            await invalid({ expression: undefined }, 'expression');
        });

        it('rejects invalid cron expressions with a useful message', async () => {
            const res = await create({ expression: '61 * * * *' });
            assert.equal(res.status, 400);
            assert.match(res.body.details[0].message, /minute must be between 0 and 59/);
            await invalid({ expression: '* * * *' }, 'expression');
            await invalid({ expression: '0 0 L * *' }, 'expression');
        });

        it('rejects line breaks in commands and names (crontab line injection in the original)', async () => {
            await invalid({ command: 'echo a\n* * * * * rm -rf /tmp/x' }, 'command');
            await invalid({ command: 'echo a\r* * * * * id' }, 'command');
            await invalid({ command: 'echo a\0b' }, 'command');
            await invalid({ name: 'x\n* * * * * id' }, 'name');
            assert.ok(!ctx.driver.text.includes('rm -rf /tmp/x'));
        });

        it('rejects over-long values', async () => {
            await invalid({ name: 'n'.repeat(101) }, 'name');
            await invalid({ command: 'c'.repeat(2001) }, 'command');
            await invalid({ description: 'd'.repeat(1001) }, 'description');
        });

        it('allows multi-line descriptions (they are never written to the crontab)', async () => {
            assert.equal((await create({ description: 'line one\nline two' })).status, 201);
        });

        it('rejects empty and invalid updates', async () => {
            const { data: job } = (await create()).body;
            assert.equal((await ctx.request('PUT', `/api/jobs/${job.id}`, { token, body: {} })).status, 400);
            assert.equal((await ctx.request('PUT', `/api/jobs/${job.id}`, { token, body: { expression: 'bad' } })).status, 400);
        });

        it('ignores unknown fields such as status or id in create/update', async () => {
            const res = await create({ status: 'paused', id: 'forced', lastRun: 'x' });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.status, 'active');
            assert.notEqual(res.body.data.id, 'forced');
        });

        it('returns 400 for malformed JSON and 413 for oversized bodies', async () => {
            const bad = await ctx.request('POST', '/api/jobs', { token, body: '{ nope' });
            assert.equal(bad.status, 400);
            assert.equal(bad.body.error, 'Request body is not valid JSON');
            const big = await ctx.request('POST', '/api/jobs', { token, body: { name: 'x'.repeat(200_000) } });
            assert.equal(big.status, 413);
        });
    });

    describe('crontab special characters', () => {
        it('stores "%" escaped so cron does not truncate the command', async () => {
            await create({ command: 'date +%F >> /tmp/d.log' });
            assert.match(ctx.driver.text, /date \+\\%F >> \/tmp\/d\.log/);
        });
    });

    describe('running jobs and logs', () => {
        it('returns an empty log list for a job without runs (original: HTTP 500)', async () => {
            const { data: job } = (await create()).body;
            const res = await ctx.request('GET', `/api/jobs/${job.id}/logs`, { token });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, { success: true, data: [], pagination: { total: 0, limit: 20, offset: 0 } });
        });

        it('runs a job, records the result and updates last-run information', async () => {
            const { data: job } = (await create({ command: 'echo out; echo err >&2' })).body;
            const run = await ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            assert.equal(run.status, 200);
            assert.equal(run.body.data.exitCode, 0);
            assert.equal(run.body.data.stdout.trim(), 'out');
            assert.equal(run.body.data.stderr.trim(), 'err');
            assert.equal(run.body.data.triggeredBy, 'manual');

            const after = await ctx.request('GET', `/api/jobs/${job.id}`, { token });
            assert.equal(after.body.data.lastExitCode, 0);
            assert.ok(after.body.data.lastRun);

            const logs = await ctx.request('GET', `/api/jobs/${job.id}/logs`, { token });
            assert.equal(logs.body.data.length, 1);
            assert.equal(logs.body.pagination.total, 1);
        });

        it('records failures with their exit code', async () => {
            const { data: job } = (await create({ command: 'exit 7' })).body;
            const run = await ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            assert.equal(run.status, 200);
            assert.equal(run.body.data.exitCode, 7);
            const after = await ctx.request('GET', `/api/jobs/${job.id}`, { token });
            assert.equal(after.body.data.lastExitCode, 7);
        });

        it('paginates logs newest first and validates pagination parameters', async () => {
            const { data: job } = (await create({ command: 'true' })).body;
            for (let i = 0; i < 3; i++) await ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            const page = await ctx.request('GET', `/api/jobs/${job.id}/logs?limit=2&offset=1`, { token });
            assert.equal(page.body.data.length, 2);
            assert.deepEqual(page.body.pagination, { total: 3, limit: 2, offset: 1 });
            assert.equal((await ctx.request('GET', `/api/jobs/${job.id}/logs?limit=1000`, { token })).status, 400);
            assert.equal((await ctx.request('GET', `/api/jobs/${job.id}/logs?offset=-1`, { token })).status, 400);
        });

        it('refuses to start a job that is already running', async () => {
            const { data: job } = (await create({ command: 'sleep 1' })).body;
            const first = ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            await new Promise((r) => setTimeout(r, 150));
            const second = await ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            assert.equal(second.status, 409);
            assert.equal((await first).status, 200);
        });

        it('deleting a job removes its logs', async () => {
            const { data: job } = (await create({ command: 'true' })).body;
            await ctx.request('POST', `/api/jobs/${job.id}/run`, { token });
            await ctx.request('DELETE', `/api/jobs/${job.id}`, { token });
            assert.equal(ctx.store.listLogs(job.id, { limit: 10, offset: 0 }).total, 0);
        });
    });

    describe('utilities', () => {
        it('parses an expression into words and the next five runs', async () => {
            const res = await ctx.request('POST', '/api/cron/parse', { token, body: { expression: '*/15 * * * *' } });
            assert.equal(res.status, 200);
            assert.equal(res.body.data.human, 'Every 15 minutes');
            assert.equal(res.body.data.nextRuns.length, 5);
            const times = res.body.data.nextRuns.map((t) => new Date(t).getTime());
            assert.deepEqual([...times].sort((a, b) => a - b), times);
        });

        it('rejects invalid expressions with 400', async () => {
            const res = await ctx.request('POST', '/api/cron/parse', { token, body: { expression: 'x y z' } });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });

        it('self-test passes and does not create jobs', async () => {
            const before = (await ctx.request('GET', '/api/jobs', { token })).body.data.length;
            const res = await ctx.request('GET', '/api/test', { token });
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true, JSON.stringify(res.body.tests));
            assert.equal(res.body.summary.failed, 0);
            assert.equal((await ctx.request('GET', '/api/jobs', { token })).body.data.length, before);
        });

        it('unknown routes return a JSON 404', async () => {
            const res = await ctx.request('GET', '/api/does-not-exist', { token });
            assert.equal(res.status, 404);
            assert.equal(res.body.success, false);
        });
    });
});

describe('failure handling', () => {
    it('rolls the store back when the crontab cannot be written', async () => {
        const dir = tmpDir();
        const { bin } = makeFakeCrontabBin(dir);
        const ctx = await startApp({ driver: new SystemCrontab({ bin }) });
        try {
            const token = await ctx.login();
            const ok = await ctx.request('POST', '/api/jobs', { token, body: sampleJob({ name: 'First' }) });
            assert.equal(ok.status, 201);

            fs.writeFileSync(bin, '#!/bin/sh\nif [ "$1" = "-l" ]; then exit 0; fi\necho "rejected" >&2\nexit 1\n');
            const fail = await ctx.request('POST', '/api/jobs', { token, body: sampleJob({ name: 'Second' }) });
            assert.equal(fail.status, 500);
            assert.equal(fail.body.error, 'Internal Server Error', 'internal details must not leak');

            const list = await ctx.request('GET', '/api/jobs', { token });
            assert.deepEqual(list.body.data.map((j) => j.name), ['First']);
        } finally {
            await ctx.close();
        }
    });

    it('keeps the crontab and store consistent under concurrent requests', async () => {
        const { bin, table } = makeFakeCrontabBin(tmpDir());
        const ctx = await startApp({ driver: new SystemCrontab({ bin }) });
        try {
            const token = await ctx.login();
            await Promise.all(
                Array.from({ length: 15 }, (_, i) =>
                    ctx.request('POST', '/api/jobs', { token, body: sampleJob({ name: `job-${i}`, command: `echo ${i}` }) })
                )
            );
            const jobs = (await ctx.request('GET', '/api/jobs', { token })).body.data;
            assert.equal(jobs.length, 15);
            const text = fs.readFileSync(table, 'utf8');
            for (const job of jobs) assert.ok(text.includes(`CRONMGR:${job.id} `), job.name);
            assert.equal((text.match(/BEGIN CRONMGR/g) || []).length, 1);
        } finally {
            await ctx.close();
        }
    });

    it('preserves entries it does not manage when jobs change', async () => {
        const dir = tmpDir();
        const { bin, table } = makeFakeCrontabBin(dir);
        fs.writeFileSync(table, 'MAILTO=ops@example.com\n17 3 * * * /usr/local/bin/rotate\n');
        const ctx = await startApp({ driver: new SystemCrontab({ bin }) });
        try {
            const token = await ctx.login();
            const { body } = await ctx.request('POST', '/api/jobs', { token, body: sampleJob() });
            await ctx.request('DELETE', `/api/jobs/${body.data.id}`, { token });
            assert.equal(fs.readFileSync(table, 'utf8'), 'MAILTO=ops@example.com\n17 3 * * * /usr/local/bin/rotate\n');
        } finally {
            await ctx.close();
        }
    });

    it('survives a restart: jobs and the admin account persist on disk', async () => {
        const file = path.join(tmpDir(), 'db.json');
        const { JsonStore } = await import('../store/jsonStore.js');
        const first = await startApp({ store: new JsonStore(file) });
        const token = await first.login();
        await first.request('POST', '/api/jobs', { token, body: sampleJob({ name: 'Persisted' }) });
        await first.close();

        const second = await startApp({ store: new JsonStore(file) });
        try {
            const t = await second.login();
            const list = await second.request('GET', '/api/jobs', { token: t });
            assert.deepEqual(list.body.data.map((j) => j.name), ['Persisted']);
        } finally {
            await second.close();
        }
    });

    it('applies a changed ADMIN_PASSWORD on restart', async () => {
        const { JsonStore, MEMORY } = await import('../store/jsonStore.js');
        const store = new JsonStore(MEMORY);
        const a = await startApp({ store });
        await a.close();
        const b = await startApp({ store, env: { ADMIN_PASSWORD: 'a-brand-new-password' } });
        try {
            const res = await b.request('POST', '/api/auth/login', { body: { username: 'admin', password: 'a-brand-new-password' } });
            assert.equal(res.status, 200);
            const old = await b.request('POST', '/api/auth/login', { body: ADMIN });
            assert.equal(old.status, 401);
        } finally {
            await b.close();
        }
    });
});
