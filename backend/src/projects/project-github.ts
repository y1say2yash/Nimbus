import { getGitHubAccessToken } from '../auth/auth-github-token.js';

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    private: boolean;
    owner: {
        login: string;
    };
}

export async function getAvailableRepositories(
    userId: string,
): Promise<GitHubRepository[]> {
    const accessToken = await getGitHubAccessToken(userId);

    const repositories: GitHubRepository[] = [];
    let page = 1;

    while (true) {
        const url = new URL(
            'https://api.github.com/user/repos',
        );

        url.searchParams.set('visibility', 'all');
        url.searchParams.set(
            'affiliation',
            'owner,collaborator,organization_member',
        );
        url.searchParams.set('sort', 'updated');
        url.searchParams.set('direction', 'desc');
        url.searchParams.set('per_page', '100');
        url.searchParams.set('page', String(page));

        const response = await fetch(url, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${accessToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            throw new GitHubRepositoryError(
                'Failed to fetch GitHub repositories.',
                response.status,
            );
        }

        const pageRepositories =
            (await response.json()) as GitHubRepository[];

        repositories.push(...pageRepositories);

        if (pageRepositories.length < 100) {
            break;
        }

        page += 1;
    }

    return repositories;
}

export interface GitHubBranch {
    name: string;
}

export async function getProjectBranches(
    userId: string,
    repositoryId: number,
): Promise<GitHubBranch[]> {
    const accessToken = await getGitHubAccessToken(userId);

    const branches: GitHubBranch[] = [];
    let page = 1;

    while (true) {
        const url = new URL(
            `https://api.github.com/repositories/${repositoryId}/branches`,
        );

        url.searchParams.set('per_page', '100');
        url.searchParams.set('page', String(page));

        const response = await fetch(url, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${accessToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            throw new GitHubRepositoryError(
                'Failed to fetch GitHub repository branches.',
                response.status,
            );
        }

        const pageBranches =
            (await response.json()) as GitHubBranch[];

        branches.push(...pageBranches);

        if (pageBranches.length < 100) {
            break;
        }

        page += 1;
    }

    return branches.map((branch) => ({
        name: branch.name,
    }));
}

export async function getGitHubRepository(
    userId: string,
    repositoryId: number,
): Promise<GitHubRepository> {
    const accessToken = await getGitHubAccessToken(userId);

    const response = await fetch(
        `https://api.github.com/repositories/${repositoryId}`,
        {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${accessToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        },
    );

    if (!response.ok) {
        throw new GitHubRepositoryError(
            'GitHub repository is unavailable or inaccessible.',
            response.status,
        );
    }

    return (await response.json()) as GitHubRepository;
}

export class GitHubRepositoryError extends Error {
    public readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'GitHubRepositoryError';
        this.status = status;
    }
}