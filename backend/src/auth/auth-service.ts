import database from '../config/knex.js';

import type { GitHubUser } from './auth-github.js';

interface UpsertUserInput {
    githubUser: GitHubUser;
    email: string;
}

export async function upsertUser({
    githubUser,
    email,
}: UpsertUserInput) {
    const existingUser = await database('users')
        .where('github_id', githubUser.id)
        .first();

    if (existingUser) {
        const [user] = await database('users')
            .where('user_id', existingUser.user_id)
            .update({
                github_username: githubUser.login,
                email,
                avatar_url: githubUser.avatar_url,
                is_active: true,
                updated_at: database.fn.now(),
                deleted_at: null,
            })
            .returning([
                'user_id',
                'github_id',
                'github_username',
                'email',
                'avatar_url',
                'is_active',
            ]);

        return user;
    }

    const [user] = await database('users')
        .insert({
            github_id: githubUser.id,
            github_username: githubUser.login,
            email,
            avatar_url: githubUser.avatar_url,
            is_active: true,
        })
        .returning([
            'user_id',
            'github_id',
            'github_username',
            'email',
            'avatar_url',
            'is_active',
        ]);

    return user;
}