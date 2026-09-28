import {
    execFile,
} from 'node:child_process';
import {
    promisify,
} from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_START_PORT = 10000;
const DEFAULT_END_PORT = 20000;

async function getDockerPublishedPorts(): Promise<Set<number>> {
    try {
        const {
            stdout,
        } = await execFileAsync(
            'docker',
            [
                'ps',
                '--format',
                '{{.Ports}}',
            ],
            {
                maxBuffer: 10 * 1024 * 1024,
            },
        );

        const ports = new Set<number>();

        for (const line of stdout.split('\n')) {
            const matches = line.matchAll(
                /(?:0\.0\.0\.0|:::):(\d+)->/g,
            );

            for (const match of matches) {
                const port = Number(match[1]);

                if (Number.isInteger(port)) {
                    ports.add(port);
                }
            }
        }

        return ports;
    } catch (error) {
        throw new Error(
            `Failed to inspect Docker published ports: ${
                error instanceof Error
                    ? error.message
                    : 'Unknown error.'
            }`,
            {
                cause: error,
            },
        );
    }
}

export async function findAvailableHostPort(
    startPort = DEFAULT_START_PORT,
    endPort = DEFAULT_END_PORT,
): Promise<number> {
    if (
        !Number.isInteger(startPort) ||
        !Number.isInteger(endPort) ||
        startPort < 1 ||
        endPort > 65535 ||
        startPort > endPort
    ) {
        throw new Error('Invalid host port range.');
    }

    const publishedPorts =
        await getDockerPublishedPorts();

    for (
        let port = startPort;
        port <= endPort;
        port += 1
    ) {
        if (!publishedPorts.has(port)) {
            return port;
        }
    }

    throw new Error(
        `No available host port found between ${startPort} and ${endPort}.`,
    );
}