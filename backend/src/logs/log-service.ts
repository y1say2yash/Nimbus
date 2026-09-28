import fs from 'node:fs/promises';
import path from 'node:path';

const LOG_ROOT =
    process.env.NIMBUS_LOG_PATH ||
    '/var/lib/nimbus/logs';

function getDeploymentLogDirectory(
    deploymentId: string,
): string {
    return path.join(
        LOG_ROOT,
        deploymentId,
    );
}

function getDeploymentLogPath(
    deploymentId: string,
): string {
    return path.join(
        getDeploymentLogDirectory(
            deploymentId,
        ),
        'deployment.log',
    );
}

export async function writeDeploymentLog(
    deploymentId: string,
    message: string,
): Promise<void> {
    const directory =
        getDeploymentLogDirectory(
            deploymentId,
        );

    await fs.mkdir(directory, {
        recursive: true,
    });

    const timestamp =
        new Date().toISOString();

    await fs.appendFile(
        getDeploymentLogPath(
            deploymentId,
        ),
        `[${timestamp}] ${message}\n`,
        'utf8',
    );
}

export async function readDeploymentLogs(
    deploymentId: string,
): Promise<string> {
    try {
        return await fs.readFile(
            getDeploymentLogPath(
                deploymentId,
            ),
            'utf8',
        );
    } catch (error) {
        if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
        ) {
            return '';
        }

        throw error;
    }
}

export async function deleteDeploymentLogs(
    deploymentId: string,
): Promise<void> {
    await fs.rm(
        getDeploymentLogDirectory(
            deploymentId,
        ),
        {
            recursive: true,
            force: true,
        },
    );
}