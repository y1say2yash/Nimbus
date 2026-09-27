import crypto from 'node:crypto';

import { Router } from 'express';

import {
    exchangeCodeForAccessToken,
    getGitHubUser,
    getGitHubUserEmails,
} from './auth-github.js';

import { upsertUser } from './auth-service.js';
import { createSession, revokeSession } from './auth-session.js';
import { requireAuth } from './auth-middleware.js';

const router = Router();

router.get('/github', (_req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !redirectUri) {
        return res.status(500).json({
            error: {
                code: 'OAUTH_NOT_CONFIGURED',
                message: 'GitHub OAuth is not configured.',
            },
        });
    }

    const state = crypto.randomBytes(32).toString('hex');

    const authorizationUrl = new URL(
        'https://github.com/login/oauth/authorize',
    );

    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('scope', 'read:user user:email');
    authorizationUrl.searchParams.set('state', state);

    res.cookie('github_oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
    });

    return res.redirect(authorizationUrl.toString());
});

router.get('/github/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (
            typeof code !== 'string' ||
            typeof state !== 'string'
        ) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_OAUTH_CALLBACK',
                    message: 'Invalid OAuth callback parameters.',
                },
            });
        }

        const storedState = req.cookies.github_oauth_state;

        if (!storedState || storedState !== state) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_OAUTH_STATE',
                    message: 'Invalid OAuth state.',
                },
            });
        }

        res.clearCookie('github_oauth_state');

        const accessToken = await exchangeCodeForAccessToken(code);

        const githubUser = await getGitHubUser(accessToken);

        const email = githubUser.email ?? await getGitHubUserEmails(accessToken);

        if (!email) {
            return res.status(400).json({
                error: {
                    code: 'GITHUB_EMAIL_UNAVAILABLE',
                    message: 'No verified GitHub email address is available.',
                },
            });
        }

        const user = await upsertUser({
            githubUser,
            email,
            githubAccessToken: accessToken,
        });

        const sessionToken = await createSession(user.user_id);

        res.cookie('nimbus_session', sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.redirect('/');
    } catch (error) {
        console.error('GitHub OAuth callback failed:', error);

        return res.status(500).json({
            error: {
                code: 'OAUTH_CALLBACK_FAILED',
                message: 'GitHub authentication failed.',
            },
        });
    }
});

router.get('/me', requireAuth, (req, res) => {
    const user = (req as import('./auth-middleware.js').AuthenticatedRequest).user;

    return res.json({
        data: {
            user,
        },
    });
});

router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies?.nimbus_session;

        if (token) {
            await revokeSession(token);
        }

        res.clearCookie('nimbus_session', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return res.json({
            data: {
                message: 'Logged out successfully.',
            },
        });
    } catch (error) {
        console.error('Logout failed:', error);

        return res.status(500).json({
            error: {
                code: 'LOGOUT_FAILED',
                message: 'Logout failed.',
            },
        });
    }
});

export default router;