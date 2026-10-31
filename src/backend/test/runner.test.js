import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMockRunner, createRunner } from '../services/runner.js';

const runner = (over = {}) => createRunner({ timeoutMs: 5000, maxOutputBytes: 1024, ...over });

describe('runner', () => {
    it('captures stdout and a zero exit code', async () => {
        const r = await runner().run('echo hello');
        assert.equal(r.exitCode, 0);
        assert.equal(r.stdout.trim(), 'hello');
    });

    it('captures stderr and a non-zero exit code', async () => {
        const r = await runner().run('echo oops >&2; exit 3');
        assert.equal(r.exitCode, 3);
        assert.equal(r.stderr.trim(), 'oops');
    });

    it('supports pipes and redirects like cron does', async () => {
        const r = await runner().run('printf "a\\nb\\n" | wc -l');
        assert.equal(r.stdout.trim(), '2');
    });

    it('reports an unknown command as 127', async () => {
        assert.equal((await runner().run('definitely-not-a-command-xyz')).exitCode, 127);
    });

    it('kills commands that exceed the timeout, including their children', async () => {
        const started = Date.now();
        const r = await runner({ timeoutMs: 300 }).run('sleep 30 & sleep 30');
        assert.equal(r.timedOut, true);
        assert.equal(r.exitCode, 124);
        assert.match(r.stderr, /timed out/);
        assert.ok(Date.now() - started < 5000);
    });

    it('truncates very large output', async () => {
        const r = await runner({ maxOutputBytes: 100 }).run('head -c 100000 /dev/zero | tr "\\0" "x"');
        assert.ok(r.stdout.length < 200);
        assert.match(r.stdout, /\[output truncated\]/);
    });

    it('does not leak server secrets to commands', async () => {
        process.env.JWT_SECRET = 'leak-me';
        process.env.ADMIN_PASSWORD = 'leak-me-too';
        try {
            const r = await runner().run('echo "[$JWT_SECRET][$ADMIN_PASSWORD]"');
            assert.equal(r.stdout.trim(), '[][]');
        } finally {
            delete process.env.JWT_SECRET;
            delete process.env.ADMIN_PASSWORD;
        }
    });

    it('mock runner never executes anything', async () => {
        const r = await createMockRunner().run('touch /tmp/should-not-exist-cronmgr');
        assert.equal(r.exitCode, 0);
        assert.match(r.stdout, /Simulated/);
    });
});
