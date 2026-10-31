const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

/**
 * Minimal leveled logger writing to stdout/stderr.
 * @param {{ level?: keyof typeof LEVELS }} [options]
 */
export function createLogger({ level = 'info' } = {}) {
    const threshold = LEVELS[level] ?? LEVELS.info;

    const write = (name, stream) => (message, meta) => {
        if (LEVELS[name] < threshold) return;
        const suffix = meta === undefined ? '' : ` ${meta instanceof Error ? meta.stack : JSON.stringify(meta)}`;
        stream.write(`${new Date().toISOString()} ${name.toUpperCase()} ${message}${suffix}\n`);
    };

    return {
        debug: write('debug', process.stdout),
        info: write('info', process.stdout),
        warn: write('warn', process.stderr),
        error: write('error', process.stderr)
    };
}
