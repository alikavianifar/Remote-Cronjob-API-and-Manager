import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
    BEGIN_MARKER,
    CrontabService,
    END_MARKER,
    MockCrontab,
    SystemCrontab,
    escapeCommand,
    mergeCrontab
} from '../services/crontab.js';
import { makeFakeCrontabBin, tmpDir } from '../testkit/helpers.js';

const job = (over = {}) => ({
    id: 'j1',
    name: 'Backup',
    expression: '0 2 * * *',
    command: '/opt/backup.sh',
    status: 'active',
    ...over
});

describe('escapeCommand', () => {
    it('escapes every percent sign', () => assert.equal(escapeCommand('date +%Y-%m-%d'), 'date +\\%Y-\\%m-\\%d'));
    it('leaves other text alone', () => assert.equal(escapeCommand('echo "$(id)" `x`'), 'echo "$(id)" `x`'));
});

describe('mergeCrontab', () => {
    it('writes a managed block', () => {
        const text = mergeCrontab('', [job()]);
        assert.equal(text, `${BEGIN_MARKER}\n# CRONMGR:j1 Backup\n0 2 * * * /opt/backup.sh\n${END_MARKER}\n`);
    });

    it('comments out paused jobs', () => {
        assert.match(mergeCrontab('', [job({ status: 'paused' })]), /^#PAUSED 0 2 \* \* \* \/opt\/backup\.sh$/m);
    });

    it('keeps foreign lines exactly as they were', () => {
        const existing = 'MAILTO=ops@example.com\n*/10 * * * * /usr/bin/other --flag\n';
        const text = mergeCrontab(existing, [job()]);
        assert.ok(text.startsWith(existing));
        assert.ok(text.includes('0 2 * * * /opt/backup.sh'));
    });

    it('replaces an earlier block instead of duplicating it', () => {
        const once = mergeCrontab('MAILTO=x\n', [job()]);
        const twice = mergeCrontab(once, [job({ command: '/opt/new.sh' })]);
        assert.equal((twice.match(/BEGIN CRONMGR/g) || []).length, 1);
        assert.ok(twice.includes('/opt/new.sh'));
        assert.ok(!twice.includes('/opt/backup.sh'));
        assert.ok(twice.startsWith('MAILTO=x\n'));
    });

    it('is idempotent', () => {
        const once = mergeCrontab('A=1\n', [job()]);
        assert.equal(mergeCrontab(once, [job()]), once);
    });

    it('removes the block when no jobs remain and keeps the rest', () => {
        const once = mergeCrontab('A=1\n', [job()]);
        assert.equal(mergeCrontab(once, []), 'A=1\n');
        assert.equal(mergeCrontab(mergeCrontab('', [job()]), []), '');
    });

    it('escapes percent signs in commands', () => {
        assert.match(mergeCrontab('', [job({ command: 'date +%F' })]), /date \+\\%F/);
    });
});

describe('CrontabService with the mock driver', () => {
    it('syncs jobs', async () => {
        const driver = new MockCrontab();
        await new CrontabService(driver).sync([job()]);
        assert.match(driver.text, /0 2 \* \* \* \/opt\/backup\.sh/);
    });
});

describe('SystemCrontab (against a stand-in crontab binary)', () => {
    it('reads an empty crontab as empty text', async () => {
        const { bin } = makeFakeCrontabBin(tmpDir());
        assert.equal(await new SystemCrontab({ bin }).read(), '');
    });

    it('round-trips a crontab', async () => {
        const { bin } = makeFakeCrontabBin(tmpDir());
        const driver = new SystemCrontab({ bin });
        await driver.write('* * * * * echo hi\n');
        assert.equal(await driver.read(), '* * * * * echo hi\n');
    });

    it('never evaluates shell syntax in commands (original code ran $(...) at creation time)', async () => {
        const dir = tmpDir();
        const { bin, table } = makeFakeCrontabBin(dir);
        const marker = path.join(dir, 'pwned');
        const service = new CrontabService(new SystemCrontab({ bin }));

        await service.sync([
            job({ command: `echo $(touch ${marker}) \`touch ${marker}\` "; touch ${marker}; "` })
        ]);

        assert.equal(fs.existsSync(marker), false, 'shell syntax was executed');
        assert.ok(fs.readFileSync(table, 'utf8').includes(`$(touch ${marker})`));
    });

    it('reports a missing binary as an error', async () => {
        await assert.rejects(new SystemCrontab({ bin: '/nonexistent/crontab' }).read());
    });

    it('reports a failing crontab command', async () => {
        const dir = tmpDir();
        const bin = path.join(dir, 'crontab');
        fs.writeFileSync(bin, '#!/bin/sh\necho "bad line" >&2\nexit 1\n', { mode: 0o755 });
        await assert.rejects(new SystemCrontab({ bin }).write('x'), /bad line/);
        await assert.rejects(new SystemCrontab({ bin }).read(), /bad line/);
    });
});
