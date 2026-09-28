import database from '../config/knex.js';

import {
    stopRuntime,
} from '../runtime/runtime-service.js';

import {
    writeDeploymentRoute,
} from '../runtime/runtime-routing.js';

import {
    allocateDeploymentPort,
    buildDeployment,
    cleanupDeploymentWorkspace,
    cleanupFailedRuntime,
    prepareDeployment,
    startDeployment,
    verifyDeployment,
} from './deployment-engine.js';

export interface CreateDeploymentInput {
    branch?: string;
}

export class DeploymentNotFoundError extends Error {
    constructor() {
        super('Deployment not found.');
        this.name = 'DeploymentNotFoundError';
    }
}

export class DeploymentProjectNotFoundError extends Error {
    constructor() {
        super('Project not found.');
        this.name = 'DeploymentProjectNotFoundError';
    }
}

export class DeploymentConflictError extends Error {
    constructor() {
        super(
            'Another deployment is already in progress for this project.',
        );
        this.name = 'DeploymentConflictError';
    }
}

type DeploymentStatus =
    | 'PENDING'
    | 'CLONING'
    | 'BUILDING'
    | 'STARTING'
    | 'RUNNING'
    | 'FAILED'
    | 'STOPPED'
    | 'CANCELLED';

const activeDeploymentProjects = new Set<string>();

export async function listDeployments(
    userId: string,
    projectId: string,
) {
    const project = await database('projects')
        .select('project_id')
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!project) {
        throw new DeploymentProjectNotFoundError();
    }

    return database('deployments')
        .select(
            'deployment_id',
            'project_id',
            'repository_url',
            'branch',
            'commit_sha',
            'container_port',
            'host_port',
            'image_tag',
            'container_name',
            'status',
            'error_message',
            'created_at',
            'started_at',
            'finished_at',
        )
        .where('project_id', projectId)
        .orderBy('created_at', 'desc');
}

export async function getDeployment(
    userId: string,
    projectId: string,
    deploymentId: string,
) {
    const deployment = await database('deployments')
        .join(
            'projects',
            'deployments.project_id',
            'projects.project_id',
        )
        .select(
            'deployments.deployment_id',
            'deployments.project_id',
            'deployments.repository_url',
            'deployments.branch',
            'deployments.commit_sha',
            'deployments.container_port',
            'deployments.host_port',
            'deployments.image_tag',
            'deployments.container_name',
            'deployments.status',
            'deployments.error_message',
            'deployments.created_at',
            'deployments.started_at',
            'deployments.finished_at',
        )
        .where(
            'deployments.deployment_id',
            deploymentId,
        )
        .where(
            'deployments.project_id',
            projectId,
        )
        .where(
            'projects.user_id',
            userId,
        )
        .where(
            'projects.is_active',
            true,
        )
        .first();

    if (!deployment) {
        throw new DeploymentNotFoundError();
    }

    return deployment;
}

export async function createDeployment(
    userId: string,
    projectId: string,
    input: CreateDeploymentInput,
) {
    if (activeDeploymentProjects.has(projectId)) {
        throw new DeploymentConflictError();
    }

    const project = await database('projects')
        .select(
            'project_id',
            'project_name',
            'repository_url',
            'default_branch',
            'container_port',
        )
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!project) {
        throw new DeploymentProjectNotFoundError();
    }

    const existingDeployment = await database(
        'deployments',
    )
        .select('deployment_id')
        .where('project_id', projectId)
        .whereIn('status', [
            'PENDING',
            'CLONING',
            'BUILDING',
            'STARTING',
        ])
        .first();

    if (existingDeployment) {
        throw new DeploymentConflictError();
    }

    const branch =
        input.branch?.trim() ||
        project.default_branch;

    const timestamp = Date.now();

    const imageTag =
        `nimbus/${projectId}:deployment-${timestamp}`;

    const containerName =
        `nimbus-${projectId}-${timestamp}`;

    const [deployment] = await database('deployments')
        .insert({
            project_id: project.project_id,
            repository_url: project.repository_url,
            branch,
            container_port: project.container_port,
            image_tag: imageTag,
            container_name: containerName,
            status: 'PENDING',
        })
        .returning('*');

    activeDeploymentProjects.add(projectId);

    void executeDeployment({
        userId,
        projectId,
        projectName: project.project_name,
        deploymentId: deployment.deployment_id,
        repositoryUrl: project.repository_url,
        branch,
        containerPort: project.container_port,
        imageTag,
        containerName,
    });

    return deployment;
}

async function executeDeployment(input: {
    userId: string;
    projectId: string;
    projectName: string;
    deploymentId: string;
    repositoryUrl: string;
    branch: string;
    containerPort: number;
    imageTag: string;
    containerName: string;
}): Promise<void> {
    let workspacePath: string | null = null;
    let hostPort: number | null = null;
    let containerStarted = false;

    try {
        await updateDeploymentStatus(
            input.deploymentId,
            'CLONING',
        );

        const workspace =
            await prepareDeployment({
                userId: input.userId,
                repositoryUrl: input.repositoryUrl,
                branch: input.branch,
                containerPort: input.containerPort,
                imageTag: input.imageTag,
                containerName: input.containerName,
            });

        workspacePath = workspace.path;

        await updateDeployment(
            input.deploymentId,
            {
                commit_sha: workspace.commitSha,
                status: 'BUILDING',
            },
        );

        await buildDeployment(
            input.imageTag,
            workspace.path,
        );

        hostPort =
            await allocateDeploymentPort();

        await updateDeployment(
            input.deploymentId,
            {
                host_port: hostPort,
                status: 'STARTING',
            },
        );

        await startDeployment({
            containerName: input.containerName,
            imageTag: input.imageTag,
            hostPort,
            containerPort: input.containerPort,
        });

        containerStarted = true;

        await verifyDeployment(
            input.containerName,
            input.containerPort,
        );

        /*
         * The new deployment is healthy.
         *
         * Update Nginx before stopping the previous deployment
         * so the project URL immediately points to the new runtime.
         */
        await writeDeploymentRoute({
            projectName: input.projectName,
            containerName: input.containerName,
            containerPort: input.containerPort,
        });

        await stopPreviousDeployment(
            input.projectId,
            input.deploymentId,
        );

        await updateDeployment(
            input.deploymentId,
            {
                status: 'RUNNING',
                started_at: database.fn.now(),
                finished_at: database.fn.now(),
            },
        );
    } catch (error) {
        console.error(
            `Deployment ${input.deploymentId} failed:`,
            error,
        );

        /*
         * If the new runtime was started but something after
         * startup failed, remove the new runtime.
         *
         * The previous RUNNING deployment remains untouched.
         */
        if (containerStarted) {
            await cleanupFailedRuntime(
                input.containerName,
            );
        }

        await updateDeployment(
            input.deploymentId,
            {
                status: 'FAILED',
                error_message:
                    error instanceof Error
                        ? error.message
                        : 'Deployment failed.',
                finished_at: database.fn.now(),
            },
        );
    } finally {
        if (workspacePath) {
            await cleanupDeploymentWorkspace(
                workspacePath,
            );
        }

        activeDeploymentProjects.delete(
            input.projectId,
        );
    }
}

async function updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
): Promise<void> {
    await database('deployments')
        .where('deployment_id', deploymentId)
        .update({
            status,
        });
}

async function updateDeployment(
    deploymentId: string,
    values: Record<string, unknown>,
): Promise<void> {
    await database('deployments')
        .where('deployment_id', deploymentId)
        .update(values);
}

async function stopPreviousDeployment(
    projectId: string,
    currentDeploymentId: string,
): Promise<void> {
    const previousDeployment = await database(
        'deployments',
    )
        .select(
            'deployment_id',
            'container_name',
        )
        .where('project_id', projectId)
        .where('status', 'RUNNING')
        .whereNot(
            'deployment_id',
            currentDeploymentId,
        )
        .first();

    if (!previousDeployment) {
        return;
    }

    try {
        await stopRuntime(
            previousDeployment.container_name,
        );

        await database('deployments')
            .where(
                'deployment_id',
                previousDeployment.deployment_id,
            )
            .update({
                status: 'STOPPED',
                finished_at: database.fn.now(),
            });
    } catch (error) {
        console.error(
            `Failed to stop previous deployment ${previousDeployment.deployment_id}:`,
            error,
        );
    }
}