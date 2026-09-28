import {
    inspectContainer,
    removeContainer,
    runContainer,
    stopContainer,
} from '../docker/docker-service.js';

const NIMBUS_NETWORK =
    'nimbus_nimbus_internal_network';

export interface StartRuntimeInput {
    containerName: string;
    imageTag: string;
    hostPort: number;
    containerPort: number;
}

export async function startRuntime(
    input: StartRuntimeInput,
): Promise<void> {
    await runContainer({
        ...input,
        network: NIMBUS_NETWORK,
    });
}

export async function stopRuntime(
    containerName: string,
): Promise<void> {
    await stopContainer(containerName);
}

export async function removeRuntime(
    containerName: string,
): Promise<void> {
    await removeContainer(containerName);
}

export async function getRuntimeState(
    containerName: string,
): Promise<string> {
    return inspectContainer(containerName);
}

export async function verifyRuntimeHealth(
    containerName: string,
    containerPort: number,
    timeoutMs = 30_000,
): Promise<void> {
    const startedAt = Date.now();

    const healthUrl =
        `http://${containerName}:${containerPort}/health`;

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(healthUrl, {
                signal: AbortSignal.timeout(3_000),
            });

            if (response.ok) {
                return;
            }
        } catch {
            // Container may still be starting.
        }

        await new Promise((resolve) =>
            setTimeout(resolve, 1_000),
        );
    }

    throw new Error(
        `Runtime health check failed for ${containerName}.`,
    );
}