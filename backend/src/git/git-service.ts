import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

import { getGitHubAccessToken } from '../auth/auth-github-token.js';

const execFileAsync = promisify(execFile);

export interface GitCommandResult {
    stdout: string;
    stderr: string;
}

export interface CloneRepositoryResult {
    commitSha: string;
    stdout: string;
    stderr: string;
}

export class GitError extends Error {
    public readonly stderr: string;
    public readonly exitCode: number | null;

    constructor(
        message: string,
        stderr = '',
        exitCode: number | null = null,
    ) {
        super(message);
        this.name = 'GitError';
        this.stderr = stderr;
        this.exitCode = exitCode;
    }
}

async function runGit(
    args: string[],
    options: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
    } = {},
): Promise<GitCommandResult> {
    try {
        return await execFileAsync('git', args, {
            cwd: options.cwd,
            env: options.env,
            maxBuffer: 10 * 1024 * 1024,
        });
    } catch (error) {
        const gitError = error as {
            message?: string;
            stderr?: string;
            code?: number | string;
        };

        throw new GitError(
            gitError.message ?? 'Git command failed.',
            gitError.stderr ?? '',
            typeof gitError.code === 'number'
                ? gitError.code
                : null,
        );
    }
}

function createGitEnvironment(
    accessToken: string,
): NodeJS.ProcessEnv {
    return {
        ...process.env,

        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0:
            'url.https://x-access-token:${GITHUB_TOKEN}@github.com/.insteadOf',
        GIT_CONFIG_VALUE_0: 'https://github.com/',
        GITHUB_TOKEN: accessToken,
    };
}

export async function cloneRepository(
    userId: string,
    repositoryUrl: string,
    branch: string,
    workspacePath: string,
): Promise<CloneRepositoryResult> {
    const accessToken =
        await getGitHubAccessToken(userId);

    await fs.mkdir(workspacePath, {
        recursive: true,
    });

    const environment =
        createGitEnvironment(accessToken);

    const cloneResult = await runGit(
        [
            'clone',
            '--branch',
            branch,
            '--single-branch',
            '--depth',
            '1',
            repositoryUrl,
            workspacePath,
        ],
        {
            env: environment,
        },
    );

    const result = await runGit(
        ['rev-parse', 'HEAD'],
        {
            cwd: workspacePath,
            env: environment,
        },
    );

    return {
        commitSha: result.stdout.trim(),
        stdout: cloneResult.stdout,
        stderr: cloneResult.stderr,
    };
}

export async function cloneCommit(
    userId: string,
    repositoryUrl: string,
    commitSha: string,
    workspacePath: string,
): Promise<void> {
    const accessToken =
        await getGitHubAccessToken(userId);

    await fs.mkdir(workspacePath, {
        recursive: true,
    });

    const environment =
        createGitEnvironment(accessToken);

    await runGit(
        [
            'clone',
            repositoryUrl,
            workspacePath,
        ],
        {
            env: environment,
        },
    );

    await runGit(
        [
            'checkout',
            commitSha,
        ],
        {
            cwd: workspacePath,
            env: environment,
        },
    );
}