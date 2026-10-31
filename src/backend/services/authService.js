import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

// Compared against when the username is unknown, so response time does not reveal which usernames exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

/**
 * Make sure the configured administrator exists.
 * An explicitly configured ADMIN_PASSWORD always wins, so rotating it only needs a restart.
 */
export function ensureAdmin({ store, config, logger }) {
    const existing = store.getUserByUsername(config.adminUsername);

    if (!existing) {
        store.saveUser({
            id: crypto.randomUUID(),
            username: config.adminUsername,
            passwordHash: bcrypt.hashSync(config.adminPassword, 10),
            createdAt: new Date().toISOString()
        });
        logger.info(`Created administrator account "${config.adminUsername}"`);
    } else if (config.adminPasswordFromEnv && !bcrypt.compareSync(config.adminPassword, existing.passwordHash)) {
        store.saveUser({ ...existing, passwordHash: bcrypt.hashSync(config.adminPassword, 10) });
        logger.info(`Updated password of "${config.adminUsername}" from ADMIN_PASSWORD`);
    }

    if (config.usingDevAdminPassword) {
        logger.warn('ADMIN_PASSWORD is not set: using the development password. Do not expose this instance.');
    }
}

export async function verifyCredentials(store, username, password) {
    const user = store.getUserByUsername(username);
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    return user && ok ? user : null;
}
