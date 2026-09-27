import database from '../config/knex.js';

import { decryptGitHubToken } from './auth-token-crypto.js';

export async function getGitHubAccessToken(
    userId: string,
): Promise<string> {
    const user = await database('users')
        .select('github_access_token_encrypted')
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!user?.github_access_token_encrypted) {
        throw new Error('GitHub access token is not available.');
    }

    return decryptGitHubToken(
        user.github_access_token_encrypted,
    );
}