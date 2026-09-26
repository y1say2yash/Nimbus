import crypto from 'node:crypto';

import database from '../config/knex.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

export async function createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await database('sessions').insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
    });

    return token;
}

export async function getSessionUser(token: string) {
    const tokenHash = hashToken(token);

    const session = await database('sessions')
        .join('users', 'sessions.user_id', 'users.user_id')
        .select(
            'sessions.session_id',
            'sessions.user_id',
            'sessions.expires_at',
            'users.github_id',
            'users.github_username',
            'users.email',
            'users.avatar_url',
            'users.is_active',
        )
        .where('sessions.token_hash', tokenHash)
        .whereNull('sessions.revoked_at')
        .where('users.is_active', true)
        .first();

    if (!session) {
        return null;
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
        await database('sessions')
            .where('session_id', session.session_id)
            .update({
                revoked_at: database.fn.now(),
            });

        return null;
    }

    return session;
}

export async function revokeSession(token: string): Promise<void> {
    const tokenHash = hashToken(token);

    await database('sessions')
        .where('token_hash', tokenHash)
        .whereNull('revoked_at')
        .update({
            revoked_at: database.fn.now(),
        });
}