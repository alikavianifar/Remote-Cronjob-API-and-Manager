import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { JsonStore, MEMORY } from '../store/jsonStore.js';
import { tmpDir } from '../testkit/helpers.js';

const job = (id = 'a') => ({ id, name: id, expression: '* * * * *', command: 'true', status: 'active' });
const log = (id, jobId, executedAt) => ({ id, jobId, executedAt, exitCode: 0, stdout: '', stderr: '' });

describe('JsonStore', () => {
    it('persists across instances', () => {
        const file = path.join(tmpDir(), 'nested', 'db.json');
        const a = new JsonStore(file);
        a.insertJob(job('x'));
        assert.equal(new JsonStore(file).getJob('x').id, 'x');
    });

    it('writes atomically and leaves no temp files', () => {
        const dir = tmpDir();
        const store = new JsonStore(path.join(dir, 'db.json'));
        store.insertJob(job());
        assert.deepEqual(fs.readdirSync(dir), ['db.json']);
    });

    it('restricts the data file to its owner', () => {
        const dir = tmpDir();
        new JsonStore(path.join(dir, 'db.json')).insertJob(job());
        assert.equal(fs.statSync(path.join(dir, 'db.json')).mode & 0o077, 0);
    });

    it('refuses to start on a corrupt data file instead of discarding it', () => {
        const file = path.join(tmpDir(), 'db.json');
        fs.writeFileSync(file, '{ not json');
        assert.throws(() => new JsonStore(file), /not valid JSON/);
        assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');
    });

    it('returns copies, not live references', () => {
        const store = new JsonStore(MEMORY);
        store.insertJob(job('x'));
        store.getJob('x').name = 'changed';
        assert.equal(store.getJob('x').name, 'x');
    });

    it('removes logs together with their job', () => {
        const store = new JsonStore(MEMORY);
        store.insertJob(job('x'));
        store.addLog(log('l1', 'x', '2026-01-01T00:00:00Z'), 10);
        store.deleteJob('x');
        assert.equal(store.listLogs('x', { limit: 10, offset: 0 }).total, 0);
    });

    it('lists logs newest first with pagination and total', () => {
        const store = new JsonStore(MEMORY);
        for (let i = 1; i <= 5; i++) store.addLog(log(`l${i}`, 'x', `2026-01-0${i}T00:00:00Z`), 10);
        const page = store.listLogs('x', { limit: 2, offset: 1 });
        assert.equal(page.total, 5);
        assert.deepEqual(page.items.map((l) => l.id), ['l4', 'l3']);
    });

    it('keeps only the newest logs per job', () => {
        const store = new JsonStore(MEMORY);
        for (let i = 1; i <= 5; i++) store.addLog(log(`l${i}`, 'x', `2026-01-0${i}T00:00:00Z`), 3);
        store.addLog(log('other', 'y', '2026-01-01T00:00:00Z'), 3);
        assert.deepEqual(store.listLogs('x', { limit: 10, offset: 0 }).items.map((l) => l.id), ['l5', 'l4', 'l3']);
        assert.equal(store.listLogs('y', { limit: 10, offset: 0 }).total, 1);
    });

    it('restores a snapshot', () => {
        const store = new JsonStore(MEMORY);
        store.insertJob(job('x'));
        const snap = store.snapshot();
        store.insertJob(job('y'));
        store.restore(snap);
        assert.deepEqual(store.listJobs().map((j) => j.id), ['x']);
    });
});
