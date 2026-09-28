import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
    buildImage,
    DockerError,
} from '../docker/docker-service.js';
import {
    findAvailableHostPort,
} from '../docker/docker-port.js';
import {
    cloneRepository,
    GitError,
} from '../git/git-service.js';
import {
    removeRuntime,
    startRuntime,
    verifyRuntimeHealth,
} from '../runtime/runtime-service.js';

export interface DeploymentInput {
    userId: string;
    repositoryUrl: string;
    branch: string;
    containerPort: number;
    imageTag: string;
    containerName: string;
}

export interface DeploymentWorkspace {
    path: string;
    commitSha: string;
}

export async function prepareDeployment(
    input: DeploymentInput,
): Promise<DeploymentWorkspace> {
    const workspacePath = await fs.mkdtemp(
        path.join(
            os.tmpdir(),
            'nimbus-deployment-',
        ),
    );

    try {
        const commitSha = await cloneRepository(
            input.userId,
            input.repositoryUrl,
            input.branch,
            workspacePath,
        );

        return {
            path: workspacePath,
            commitSha,
        };
    } catch (error) {
        await fs.rm(workspacePath, {
            recursive: true,
            force: true,
        });

        throw wrapDeploymentError(error);
    }
}

export async function buildDeployment(
    imageTag: string,
    workspacePath: string,
): Promise<void> {
    try {
        await buildImage(
            imageTag,
            workspacePath,
        );
    } catch (error) {
        throw wrapDeploymentError(error);
    }
}

export async function allocateDeploymentPort(): Promise<number> {
    return findAvailableHostPort();
}

export async function startDeployment(
    input: {
        containerName: string;
        imageTag: string;
        hostPort: number;
        containerPort: number;
    },
): Promise<void> {
    try {
        await startRuntime(input);
    } catch (error) {
        throw wrapDeploymentError(error);
    }
}

export async function verifyDeployment(
    containerName: string,
    containerPort: number,
): Promise<void> {
    try {
        await verifyRuntimeHealth(
            containerName,
            containerPort,
        );
    } catch (error) {
        throw wrapDeploymentError(error);
    }
}

export async function cleanupDeploymentWorkspace(
    workspacePath: string,
): Promise<void> {
    await fs.rm(workspacePath, {
        recursive: true,
        force: true,
    });
}

export async function cleanupFailedRuntime(
    containerName: string,
): Promise<void> {
    try {
        await removeRuntime(containerName);
    } catch (error) {
        console.error(
            `Failed to clean up deployment container ${containerName}:`,
            error,
        );
    }
}

function wrapDeploymentError(error: unknown): Error {
    if (error instanceof GitError) {
        return new Error(
            `Git operation failed: ${error.message}`,
            { cause: error },
        );
    }

    if (error instanceof DockerError) {
        return new Error(
            `Docker operation failed: ${error.message}`,
            { cause: error },
        );
    }

    if (error instanceof Error) {
        return error;
    }

    return new Error('Deployment operation failed.');
}