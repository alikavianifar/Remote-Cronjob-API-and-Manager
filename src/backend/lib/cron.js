import cronstrue from 'cronstrue';

/**
 * Parser for standard 5-field cron expressions (minute hour day-of-month month day-of-week).
 * Supports lists, ranges, steps and month/weekday names, with Vixie-cron semantics:
 * when both day-of-month and day-of-week are restricted, a day matches if EITHER matches.
 */

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const FIELDS = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day-of-month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12, names: MONTH_NAMES, nameBase: 1 },
    { name: 'day-of-week', min: 0, max: 7, names: DAY_NAMES, nameBase: 0 }
];

export class CronSyntaxError extends Error {}

function parseValue(token, spec) {
    if (/^\d+$/.test(token)) return Number(token);
    if (spec.names) {
        const idx = spec.names.indexOf(token.toLowerCase());
        if (idx !== -1) return idx + spec.nameBase;
    }
    throw new CronSyntaxError(`Invalid value "${token}" in ${spec.name} field`);
}

function parseField(text, spec) {
    const values = new Set();
    const star = text.startsWith('*');

    for (const item of text.split(',')) {
        if (item === '') throw new CronSyntaxError(`Empty list item in ${spec.name} field`);

        const [rangePart, stepPart, ...extra] = item.split('/');
        if (extra.length > 0) throw new CronSyntaxError(`Invalid step in ${spec.name} field`);

        let step = 1;
        if (stepPart !== undefined) {
            if (!/^\d+$/.test(stepPart) || Number(stepPart) < 1) {
                throw new CronSyntaxError(`Invalid step "${stepPart}" in ${spec.name} field`);
            }
            step = Number(stepPart);
        }

        let from;
        let to;
        if (rangePart === '*') {
            from = spec.min;
            to = spec.name === 'day-of-week' ? 6 : spec.max;
        } else if (rangePart.includes('-')) {
            const [a, b, ...more] = rangePart.split('-');
            if (more.length > 0 || a === '' || b === '') {
                throw new CronSyntaxError(`Invalid range "${rangePart}" in ${spec.name} field`);
            }
            from = parseValue(a, spec);
            to = parseValue(b, spec);
            if (from > to) throw new CronSyntaxError(`Range "${rangePart}" is reversed in ${spec.name} field`);
        } else {
            if (stepPart !== undefined) {
                throw new CronSyntaxError(`A step needs "*" or a range in ${spec.name} field`);
            }
            from = to = parseValue(rangePart, spec);
        }

        if (from < spec.min || to > spec.max) {
            throw new CronSyntaxError(`${spec.name} must be between ${spec.min} and ${spec.max}`);
        }

        for (let v = from; v <= to; v += step) values.add(spec.name === 'day-of-week' && v === 7 ? 0 : v);
    }

    return { values, star };
}

/**
 * Parse an expression. Throws CronSyntaxError when it is not a valid 5-field cron expression.
 * @param {string} expression
 */
export function parseCron(expression) {
    if (typeof expression !== 'string') throw new CronSyntaxError('Expression must be a string');
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5 || parts[0] === '') {
        throw new CronSyntaxError('Expression must have exactly 5 fields: minute hour day-of-month month day-of-week');
    }
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.map((p, i) => parseField(p, FIELDS[i]));
    return { normalized: parts.join(' '), minute, hour, dayOfMonth, month, dayOfWeek };
}

/**
 * @param {string} expression
 * @returns {{ valid: true, normalized: string } | { valid: false, error: string }}
 */
export function validateExpression(expression) {
    try {
        return { valid: true, normalized: parseCron(expression).normalized };
    } catch (err) {
        if (err instanceof CronSyntaxError) return { valid: false, error: err.message };
        throw err;
    }
}

function dayMatches(parsed, date) {
    const domOk = parsed.dayOfMonth.values.has(date.getDate());
    const dowOk = parsed.dayOfWeek.values.has(date.getDay());
    if (parsed.dayOfMonth.star && parsed.dayOfWeek.star) return true;
    if (parsed.dayOfMonth.star) return dowOk;
    if (parsed.dayOfWeek.star) return domOk;
    return domOk || dowOk;
}

/**
 * Next run times strictly after `from`, in the server's local time zone (as cron itself does).
 * @param {string} expression
 * @param {number} [count]
 * @param {Date} [from]
 * @returns {Date[]}
 */
export function nextRuns(expression, count = 1, from = new Date()) {
    const parsed = parseCron(expression);
    const results = [];
    const d = new Date(from.getTime());
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);

    const limit = new Date(from.getTime());
    limit.setFullYear(limit.getFullYear() + 10);

    let guard = 0;
    while (results.length < count && d <= limit && guard++ < 1_000_000) {
        if (!parsed.month.values.has(d.getMonth() + 1)) {
            d.setMonth(d.getMonth() + 1, 1);
            d.setHours(0, 0, 0, 0);
        } else if (!dayMatches(parsed, d)) {
            d.setDate(d.getDate() + 1);
            d.setHours(0, 0, 0, 0);
        } else if (!parsed.hour.values.has(d.getHours())) {
            d.setHours(d.getHours() + 1, 0, 0, 0);
        } else if (!parsed.minute.values.has(d.getMinutes())) {
            d.setMinutes(d.getMinutes() + 1, 0, 0);
        } else {
            results.push(new Date(d.getTime()));
            d.setMinutes(d.getMinutes() + 1, 0, 0);
        }
    }
    return results;
}

/** Human-readable description (falls back to the raw expression). */
export function describeExpression(expression) {
    try {
        return cronstrue.toString(expression, { use24HourTimeFormat: true, throwExceptionOnParseError: true });
    } catch {
        return expression;
    }
}
