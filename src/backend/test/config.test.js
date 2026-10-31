import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../config/index.js';

describe('loadConfig', () => {
    it('uses safe development defaults without hard-coded secrets', () => {
        const a = loadConfig({});
        const b = loadConfig({});
        assert.equal(a.host, '127.0.0.1');
        assert.equal(a.usingDevAdminPassword, true);
        assert.notEqual(a.jwtSecret, b.jwtSecret, 'dev secret must be random per load');
        assert.ok(a.jwtSecret.length >= 32);
    });

    it('refuses to start in production without secrets', () => {
        assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /JWT_SECRET is required[\s\S]*ADMIN_PASSWORD is required/);
    });

    it('rejects weak production secrets', () => {
        assert.throws(
            () => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'short', ADMIN_PASSWORD: 'admin123' }),
            /at least 32[\s\S]*at least 12/
        );
    });

    it('accepts a complete production configuration', () => {
        const c = loadConfig({
            NODE_ENV: 'production',
            JWT_SECRET: 'x'.repeat(40),
            ADMIN_PASSWORD: 'a-long-enough-password'
        });
        assert.equal(c.isProduction, true);
        assert.equal(c.usingDevAdminPassword, false);
    });

    it('validates numeric settings', () => {
        assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT must be a positive integer/);
        assert.equal(loadConfig({ PORT: '8080' }).port, 8080);
    });

    it('parses CORS origins', () => {
        assert.deepEqual(loadConfig({ CORS_ORIGINS: 'https://a.example, https://b.example' }).corsOrigins, [
            'https://a.example',
            'https://b.example'
        ]);
    });
});
