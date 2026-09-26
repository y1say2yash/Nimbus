interface GitHubAccessTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
}

export interface GitHubUser {
    id: number;
    login: string;
    email: string | null;
    avatar_url: string | null;
}

export async function exchangeCodeForAccessToken(
    code: string,
): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('GitHub OAuth configuration is incomplete.');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange GitHub authorization code.');
    }

    const data = (await response.json()) as Partial<GitHubAccessTokenResponse>;

    if (!data.access_token) {
        throw new Error('GitHub did not return an access token.');
    }

    return data.access_token;
}

export async function getGitHubUser(
    accessToken: string,
): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch GitHub user.');
    }

    return (await response.json()) as GitHubUser;
}

export async function getGitHubUserEmails(
    accessToken: string,
): Promise<string | null> {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch GitHub user emails.');
    }

    const emails = (await response.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
    }>;

    const primaryVerifiedEmail = emails.find(
        (email) => email.primary && email.verified,
    );

    return primaryVerifiedEmail?.email ?? null;
}