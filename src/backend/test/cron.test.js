import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeExpression, nextRuns, validateExpression } from '../lib/cron.js';

describe('validateExpression', () => {
    for (const ok of ['* * * * *', '*/5 * * * *', '0 2 * * 1-5', '0,30 8-18/2 1,15 */3 *', '0 0 * jan mon', '0 0 * * 7', '  0   0 * * *  ']) {
        it(`accepts "${ok}"`, () => assert.equal(validateExpression(ok).valid, true));
    }

    for (const bad of [
        '',
        '* * * *',
        '* * * * * *',
        '60 * * * *',
        '* 24 * * *',
        '* * 0 * *',
        '* * 32 * *',
        '* * * 13 *',
        '* * * * 8',
        '*/0 * * * *',
        '5/10 * * * *',
        '10-5 * * * *',
        '0 0 L * *',
        '@daily',
        'a b c d e',
        '1,,2 * * * *',
        '1-2-3 * * * *',
        '* * * * * ; rm -rf /'
    ]) {
        it(`rejects "${bad}"`, () => assert.equal(validateExpression(bad).valid, false));
    }

    it('normalises whitespace', () => {
        assert.equal(validateExpression('  0   2 *  * * ').normalized, '0 2 * * *');
    });
});

describe('nextRuns', () => {
    const from = new Date(2026, 9, 31, 10, 7, 30); // Sat 31 Oct 2026 10:07:30 local

    it('returns the next minute for every-minute jobs', () => {
        const [next] = nextRuns('* * * * *', 1, from);
        assert.deepEqual([next.getHours(), next.getMinutes(), next.getSeconds()], [10, 8, 0]);
    });

    it('handles steps', () => {
        const runs = nextRuns('*/15 * * * *', 3, from).map((d) => d.getMinutes());
        assert.deepEqual(runs, [15, 30, 45]);
    });

    it('rolls over to the next day', () => {
        const [next] = nextRuns('0 2 * * *', 1, from);
        assert.deepEqual([next.getMonth(), next.getDate(), next.getHours()], [10, 1, 2]);
    });

    it('lists the next five runs in ascending order', () => {
        const runs = nextRuns('0 * * * *', 5, from);
        assert.equal(runs.length, 5);
        for (let i = 1; i < runs.length; i++) assert.ok(runs[i] > runs[i - 1]);
    });

    it('treats day-of-month and day-of-week as OR when both are restricted', () => {
        // Day-of-month 13 OR any Friday: the next match after Sat 31 Oct is Friday 6 Nov.
        const [next] = nextRuns('0 0 13 * 5', 1, from);
        assert.deepEqual([next.getMonth(), next.getDate()], [10, 6]);
    });

    it('only uses day-of-week when day-of-month is "*"', () => {
        const days = nextRuns('0 0 * * 1', 3, from).map((d) => d.getDay());
        assert.deepEqual(days, [1, 1, 1]);
    });

    it('treats 7 as Sunday', () => {
        assert.equal(nextRuns('0 0 * * 7', 1, from)[0].getDay(), 0);
    });

    it('finds rare dates such as 29 February', () => {
        const [next] = nextRuns('0 0 29 2 *', 1, from);
        assert.deepEqual([next.getFullYear(), next.getMonth(), next.getDate()], [2028, 1, 29]);
    });

    it('supports month and weekday names', () => {
        const [next] = nextRuns('30 6 * jan mon', 1, from);
        assert.deepEqual([next.getFullYear(), next.getMonth(), next.getDay()], [2027, 0, 1]);
    });

    it('returns an empty list for impossible dates', () => {
        assert.deepEqual(nextRuns('0 0 31 2 *', 1, from), []);
    });

    it('throws for invalid expressions', () => {
        assert.throws(() => nextRuns('nope', 1, from));
    });
});

describe('describeExpression', () => {
    it('describes a schedule in words', () => {
        assert.match(describeExpression('0 2 * * 1-5'), /02:00/);
    });
    it('falls back to the raw expression', () => {
        assert.equal(describeExpression('not cron'), 'not cron');
    });
});
