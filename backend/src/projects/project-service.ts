import database from '../config/knex.js';

export interface CreateProjectInput {
    project_name: string;
    repository_url: string;
    github_repository_id: number;
    default_branch: string;
    container_port: number;
}

export interface UpdateProjectInput {
    project_name?: string;
    repository_url?: string;
    default_branch?: string;
    container_port?: number;
}

function validateProjectName(projectName: string): void {
    if (
        projectName.length < 1 ||
        projectName.length > 100 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(projectName)
    ) {
        throw new ProjectValidationError(
            'Project name must be 1-100 characters and may contain letters, numbers, hyphens, and underscores.',
        );
    }
}

function validateRepositoryUrl(repositoryUrl: string): void {
    try {
        const url = new URL(repositoryUrl);

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'github.com' ||
            !url.pathname.split('/').filter(Boolean).length
        ) {
            throw new Error();
        }
    } catch {
        throw new ProjectValidationError(
            'Repository URL must be a valid GitHub HTTPS repository URL.',
        );
    }
}

function validateBranch(branch: string): void {
    if (
        branch.length < 1 ||
        branch.length > 255 ||
        branch.includes(' ') ||
        branch.startsWith('/') ||
        branch.endsWith('/')
    ) {
        throw new ProjectValidationError('Invalid branch name.');
    }
}

function validateContainerPort(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new ProjectValidationError(
            'Container port must be an integer between 1 and 65535.',
        );
    }
}

function validateGitHubRepositoryId(repositoryId: number): void {
    if (!Number.isInteger(repositoryId) || repositoryId <= 0) {
        throw new ProjectValidationError(
            'GitHub repository ID must be a positive integer.',
        );
    }
}

export class ProjectValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProjectValidationError';
    }
}

export class ProjectNotFoundError extends Error {
    constructor() {
        super('Project not found.');
        this.name = 'ProjectNotFoundError';
    }
}

export async function listProjects(userId: string) {
    return database('projects')
        .select(
            'project_id',
            'github_repository_id',
            'repository_url',
            'project_name',
            'default_branch',
            'container_port',
            'is_active',
            'created_at',
            'updated_at',
        )
        .where('user_id', userId)
        .where('is_active', true)
        .orderBy('created_at', 'desc');
}

export async function getProject(
    userId: string,
    projectId: string,
) {
    const project = await database('projects')
        .select(
            'project_id',
            'github_repository_id',
            'repository_url',
            'project_name',
            'default_branch',
            'container_port',
            'is_active',
            'created_at',
            'updated_at',
        )
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!project) {
        throw new ProjectNotFoundError();
    }

    return project;
}

export async function createProject(
    userId: string,
    input: CreateProjectInput,
) {
    validateProjectName(input.project_name);
    validateRepositoryUrl(input.repository_url);
    validateGitHubRepositoryId(input.github_repository_id);
    validateBranch(input.default_branch);
    validateContainerPort(input.container_port);

    try {
        const [project] = await database('projects')
            .insert({
                user_id: userId,
                github_repository_id: input.github_repository_id,
                repository_url: input.repository_url,
                project_name: input.project_name,
                default_branch: input.default_branch,
                container_port: input.container_port,
                is_active: true,
            })
            .returning([
                'project_id',
                'github_repository_id',
                'repository_url',
                'project_name',
                'default_branch',
                'container_port',
                'is_active',
                'created_at',
                'updated_at',
            ]);

        return project;
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === '23505'
        ) {
            throw new ProjectConflictError(
                'A project with this name already exists.',
            );
        }

        throw error;
    }
}

export async function updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput,
) {
    if (Object.keys(input).length === 0) {
        throw new ProjectValidationError(
            'At least one project field must be provided.',
        );
    }

    if (input.project_name !== undefined) {
        validateProjectName(input.project_name);
    }

    if (input.repository_url !== undefined) {
        validateRepositoryUrl(input.repository_url);
    }

    if (input.default_branch !== undefined) {
        validateBranch(input.default_branch);
    }

    if (input.container_port !== undefined) {
        validateContainerPort(input.container_port);
    }

    const existingProject = await database('projects')
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    try {
        const [project] = await database('projects')
            .where('project_id', projectId)
            .where('user_id', userId)
            .where('is_active', true)
            .update({
                ...input,
                updated_at: database.fn.now(),
            })
            .returning([
                'project_id',
                'github_repository_id',
                'repository_url',
                'project_name',
                'default_branch',
                'container_port',
                'is_active',
                'created_at',
                'updated_at',
            ]);

        return project;
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === '23505'
        ) {
            throw new ProjectConflictError(
                'A project with this name already exists.',
            );
        }

        throw error;
    }
}

export async function deleteProject(
    userId: string,
    projectId: string,
): Promise<void> {
    const updatedRows = await database('projects')
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .update({
            is_active: false,
            deleted_at: database.fn.now(),
            updated_at: database.fn.now(),
        });

    if (updatedRows === 0) {
        throw new ProjectNotFoundError();
    }
}

export class ProjectConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProjectConflictError';
    }
}