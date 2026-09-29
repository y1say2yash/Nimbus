import database from '../config/knex.js';

import {
    stopRuntime,
} from '../runtime/runtime-service.js';

import {
    removeDeploymentRoute,
    writeDeploymentRoute,
} from '../runtime/runtime-routing.js';

import {
    readDeploymentLogs,
    writeDeploymentLog,
} from '../logs/log-service.js';

import {
    allocateDeploymentPort,
    buildDeployment,
    cleanupDeploymentWorkspace,
    cleanupFailedRuntime,
    prepareDeployment,
    prepareDeploymentAtCommit,
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

export class DeploymentStateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DeploymentStateError';
    }
}

export class DeploymentCancelledError extends Error {
    constructor() {
        super('Deployment was cancelled.');
        this.name = 'DeploymentCancelledError';
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
const cancelledDeployments = new Set<string>();
const deploymentControllers =
    new Map<string, AbortController>();

function throwIfDeploymentCancelled(
    deploymentId: string,
): void {
    if (cancelledDeployments.has(deploymentId)) {
        throw new DeploymentCancelledError();
    }
}

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

export async function stopDeployment(
    userId: string,
    projectId: string,
    deploymentId: string,
) {
    const deployment = await getDeployment(
        userId,
        projectId,
        deploymentId,
    );

    if (deployment.status !== 'RUNNING') {
        throw new DeploymentStateError(
            `Deployment cannot be stopped because its current status is ${deployment.status}.`,
        );
    }

    const project = await database('projects')
        .select('project_name')
        .where('project_id', projectId)
        .where('user_id', userId)
        .where('is_active', true)
        .first();

    if (!project) {
        throw new DeploymentProjectNotFoundError();
    }

    await writeDeploymentLog(
        deploymentId,
        'Stop requested by user.',
    );

    try {
        await writeDeploymentLog(
            deploymentId,
            `Stopping container "${deployment.container_name}".`,
        );

        await stopRuntime(
            deployment.container_name,
        );

        await writeDeploymentLog(
            deploymentId,
            `Container "${deployment.container_name}" stopped.`,
        );

        await removeDeploymentRoute(
            project.project_name,
        );

        await writeDeploymentLog(
            deploymentId,
            `Application route /apps/${project.project_name}/ removed.`,
        );

        await updateDeployment(
            deploymentId,
            {
                status: 'STOPPED',
                finished_at: database.fn.now(),
            },
        );

        await writeDeploymentLog(
            deploymentId,
            'Deployment stopped successfully.',
        );
    } catch (error) {
        await writeDeploymentLog(
            deploymentId,
            `Failed to stop deployment: ${error instanceof Error
                ? error.message
                : 'Unknown error.'
            }`,
        );

        throw error;
    }

    return getDeployment(
        userId,
        projectId,
        deploymentId,
    );
}

export async function cancelDeployment(
    userId: string,
    projectId: string,
    deploymentId: string,
) {
    const deployment = await getDeployment(
        userId,
        projectId,
        deploymentId,
    );

    const cancellableStatuses: DeploymentStatus[] = [
        'PENDING',
        'CLONING',
        'BUILDING',
        'STARTING',
    ];

    if (
        !cancellableStatuses.includes(
            deployment.status as DeploymentStatus,
        )
    ) {
        throw new DeploymentStateError(
            `Deployment cannot be cancelled because its current status is ${deployment.status}.`,
        );
    }

    /*
     * Mark the deployment as cancelled before aborting the
     * active operation. This ensures the execution path can
     * recognize the cancellation even if the underlying
     * Docker/Git operation throws an AbortError.
     */
    cancelledDeployments.add(
        deploymentId,
    );

    await writeDeploymentLog(
        deploymentId,
        'Cancellation requested by user.',
    );

    /*
     * Abort the currently running Git/Docker operation.
     */
    const controller =
        deploymentControllers.get(
            deploymentId,
        );

    if (controller) {
        controller.abort();
    }

    return getDeployment(
        userId,
        projectId,
        deploymentId,
    );
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

export async function redeployDeployment(
    userId: string,
    projectId: string,
    deploymentId: string,
) {
    if (activeDeploymentProjects.has(projectId)) {
        throw new DeploymentConflictError();
    }

    const sourceDeployment =
        await getDeployment(
            userId,
            projectId,
            deploymentId,
        );

    if (!sourceDeployment.commit_sha) {
        throw new DeploymentStateError(
            'Deployment cannot be redeployed because it has no associated commit.',
        );
    }

    const existingDeployment =
        await database('deployments')
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

    const project =
        await database('projects')
            .select(
                'project_id',
                'project_name',
                'repository_url',
                'container_port',
            )
            .where('project_id', projectId)
            .where('user_id', userId)
            .where('is_active', true)
            .first();

    if (!project) {
        throw new DeploymentProjectNotFoundError();
    }

    const timestamp = Date.now();

    const imageTag =
        `nimbus/${projectId}:deployment-${timestamp}`;

    const containerName =
        `nimbus-${projectId}-${timestamp}`;

    const [deployment] =
        await database('deployments')
            .insert({
                project_id: project.project_id,
                repository_url:
                    sourceDeployment.repository_url,
                branch:
                    sourceDeployment.branch,
                commit_sha:
                    sourceDeployment.commit_sha,
                container_port:
                    sourceDeployment.container_port,
                image_tag: imageTag,
                container_name: containerName,
                status: 'PENDING',
            })
            .returning('*');

    activeDeploymentProjects.add(
        projectId,
    );

    void executeDeployment({
        userId,
        projectId,
        projectName: project.project_name,
        deploymentId:
            deployment.deployment_id,
        repositoryUrl:
            sourceDeployment.repository_url,
        branch:
            sourceDeployment.branch,
        containerPort:
            sourceDeployment.container_port,
        imageTag,
        containerName,
        commitSha:
            sourceDeployment.commit_sha,
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
    commitSha?: string;
}): Promise<void> {
    const controller =
        new AbortController();

    deploymentControllers.set(
        input.deploymentId,
        controller,
    );

    let workspacePath: string | null = null;
    let containerStarted = false;

    try {
        await writeDeploymentLog(
            input.deploymentId,
            `Deployment started for project "${input.projectName}".`,
        );

        await updateDeployment(
            input.deploymentId,
            {
                status: 'CLONING',
            },
        );

        if (input.commitSha) {
            await writeDeploymentLog(
                input.deploymentId,
                `Redeploying exact commit ${input.commitSha} from ${input.repositoryUrl}.`,
            );
        } else {
            await writeDeploymentLog(
                input.deploymentId,
                `Cloning branch "${input.branch}" from ${input.repositoryUrl}.`,
            );
        }

        const workspace = input.commitSha
            ? await prepareDeploymentAtCommit({
                userId: input.userId,
                repositoryUrl: input.repositoryUrl,
                branch: input.branch,
                containerPort: input.containerPort,
                imageTag: input.imageTag,
                containerName: input.containerName,
                commitSha: input.commitSha,
            })
            : await prepareDeployment({
                userId: input.userId,
                repositoryUrl: input.repositoryUrl,
                branch: input.branch,
                containerPort: input.containerPort,
                imageTag: input.imageTag,
                containerName: input.containerName,
            });

        workspacePath = workspace.path;

        throwIfDeploymentCancelled(
            input.deploymentId,
        );

        if (workspace.gitOutput.stdout.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Git stdout:\n${workspace.gitOutput.stdout.trim()}`,
            );
        }

        if (workspace.gitOutput.stderr.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Git stderr:\n${workspace.gitOutput.stderr.trim()}`,
            );
        }

        await writeDeploymentLog(
            input.deploymentId,
            `Repository cloned successfully. Commit: ${workspace.commitSha}.`,
        );

        throwIfDeploymentCancelled(
            input.deploymentId,
        );

        await updateDeployment(
            input.deploymentId,
            {
                commit_sha: workspace.commitSha,
                status: 'BUILDING',
            },
        );

        await writeDeploymentLog(
            input.deploymentId,
            `Building Docker image "${input.imageTag}".`,
        );

        const buildResult =
            await buildDeployment(
                input.imageTag,
                workspace.path,
                controller.signal,
            );

        throwIfDeploymentCancelled(
            input.deploymentId,
        );

        if (buildResult.stdout.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Docker build stdout:\n${buildResult.stdout.trim()}`,
            );
        }

        if (buildResult.stderr.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Docker build stderr:\n${buildResult.stderr.trim()}`,
            );
        }

        await writeDeploymentLog(
            input.deploymentId,
            `Docker image "${input.imageTag}" built successfully.`,
        );

        const hostPort =
            await allocateDeploymentPort();

        await writeDeploymentLog(
            input.deploymentId,
            `Allocated host port ${hostPort}.`,
        );

        await updateDeployment(
            input.deploymentId,
            {
                host_port: hostPort,
                status: 'STARTING',
            },
        );

        throwIfDeploymentCancelled(
            input.deploymentId,
        );

        await writeDeploymentLog(
            input.deploymentId,
            `Starting container "${input.containerName}".`,
        );

        const startResult =
            await startDeployment({
                containerName: input.containerName,
                imageTag: input.imageTag,
                hostPort,
                containerPort: input.containerPort,
            });

        if (startResult.stdout.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Docker run stdout:\n${startResult.stdout.trim()}`,
            );
        }

        if (startResult.stderr.trim()) {
            await writeDeploymentLog(
                input.deploymentId,
                `Docker run stderr:\n${startResult.stderr.trim()}`,
            );
        }

        containerStarted = true;

        /*
         * The container has started, but the deployment may have
         * been cancelled while Docker was starting it.
         *
         * If cancellation was requested, immediately remove the
         * newly started runtime before doing anything else.
         */
        try {
            throwIfDeploymentCancelled(
                input.deploymentId,
            );
        } catch (error) {
            await cleanupFailedRuntime(
                input.containerName,
            );

            containerStarted = false;

            throw error;
        }

        await writeDeploymentLog(
            input.deploymentId,
            `Container "${input.containerName}" started successfully.`,
        );

        await writeDeploymentLog(
            input.deploymentId,
            'Waiting for application health check on /health.',
        );

        await verifyDeployment(
            input.containerName,
            input.containerPort,
        );

        /*
         * Do not allow a cancelled deployment to proceed to
         * route activation.
         */
        throwIfDeploymentCancelled(
            input.deploymentId,
        );

        await writeDeploymentLog(
            input.deploymentId,
            'Application health check passed.',
        );

        /*
         * The deployment is healthy.
         *
         * From this point onward we enter the finalization phase:
         *
         * 1. Activate the new Nginx route.
         * 2. Stop the previous deployment.
         * 3. Mark this deployment as RUNNING.
         *
         * Cancellation is no longer checked during this short
         * finalization phase so that we do not leave Nginx pointing
         * at a deployment that is later marked CANCELLED.
         */
        await writeDeploymentRoute({
            projectName: input.projectName,
            containerName: input.containerName,
            containerPort: input.containerPort,
        });

        await writeDeploymentLog(
            input.deploymentId,
            `Application route activated at /apps/${input.projectName}/.`,
        );

        await stopPreviousDeployment(
            input.projectId,
            input.deploymentId,
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

        await writeDeploymentLog(
            input.deploymentId,
            'Deployment completed successfully.',
        );
    } catch (error) {
        /*
         * Cancellation is different from a deployment failure.
         *
         * A cancelled deployment should become CANCELLED,
         * not FAILED.
         */
        if (
            error instanceof DeploymentCancelledError ||
            cancelledDeployments.has(
                input.deploymentId,
            )
        ) {
            await writeDeploymentLog(
                input.deploymentId,
                'Deployment cancellation acknowledged.',
            );

            if (containerStarted) {
                await cleanupFailedRuntime(
                    input.containerName,
                );

                await writeDeploymentLog(
                    input.deploymentId,
                    `Cleaned up cancelled container "${input.containerName}".`,
                );
            }

            await updateDeployment(
                input.deploymentId,
                {
                    status: 'CANCELLED',
                    finished_at: database.fn.now(),
                },
            );

            return;
        }

        /*
         * Existing failure handling.
         *
         * Any error that is not a cancellation is a genuine
         * deployment failure.
         */
        console.error(
            `Deployment ${input.deploymentId} failed:`,
            error,
        );

        await writeDeploymentLog(
            input.deploymentId,
            `Deployment failed: ${error instanceof Error
                ? error.message
                : 'Unknown deployment error.'
            }`,
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

            await writeDeploymentLog(
                input.deploymentId,
                `Cleaned up failed container "${input.containerName}".`,
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
        /*
         * Always clean up the temporary Git workspace.
         */
        if (workspacePath) {
            await cleanupDeploymentWorkspace(
                workspacePath,
            );

            await writeDeploymentLog(
                input.deploymentId,
                'Temporary deployment workspace cleaned up.',
            );
        }

        /*
         * Cancellation is stored in memory only while the
         * deployment is running. Once execution has finished,
         * remove the entry so the Set does not grow forever.
         */
        cancelledDeployments.delete(
            input.deploymentId,
        );

        deploymentControllers.delete(
            input.deploymentId,
        );

        /*
         * Allow another deployment for this project.
         */
        activeDeploymentProjects.delete(
            input.projectId,
        );
    }
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
    logDeploymentId: string,
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
        await writeDeploymentLog(
            logDeploymentId,
            `Stopping previous deployment ${previousDeployment.deployment_id}.`,
        );

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

        await writeDeploymentLog(
            logDeploymentId,
            `Previous deployment ${previousDeployment.deployment_id} stopped.`,
        );
    } catch (error) {
        console.error(
            `Failed to stop previous deployment ${previousDeployment.deployment_id}:`,
            error,
        );

        await writeDeploymentLog(
            logDeploymentId,
            `Warning: failed to stop previous deployment ${previousDeployment.deployment_id}.`,
        );
    }
}

export async function getDeploymentLogs(
    userId: string,
    projectId: string,
    deploymentId: string,
) {
    await getDeployment(
        userId,
        projectId,
        deploymentId,
    );

    const logs =
        await readDeploymentLogs(
            deploymentId,
        );

    return {
        deployment_id: deploymentId,
        logs,
    };
}