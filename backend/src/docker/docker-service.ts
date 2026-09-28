import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface DockerCommandResult {
    stdout: string;
    stderr: string;
}

export class DockerError extends Error {
    public readonly stderr: string;
    public readonly exitCode: number | null;

    constructor(
        message: string,
        stderr = '',
        exitCode: number | null = null,
    ) {
        super(message);
        this.name = 'DockerError';
        this.stderr = stderr;
        this.exitCode = exitCode;
    }
}

async function runDocker(
    args: string[],
    options: {
        cwd?: string;
    } = {},
): Promise<DockerCommandResult> {
    try {
        const result = await execFileAsync('docker', args, {
            cwd: options.cwd,
            maxBuffer: 10 * 1024 * 1024,
        });

        return {
            stdout: result.stdout,
            stderr: result.stderr,
        };
    } catch (error) {
        const commandError = error as {
            message?: string;
            stderr?: string;
            code?: number | string;
        };

        const exitCode =
            typeof commandError.code === 'number'
                ? commandError.code
                : null;

        throw new DockerError(
            commandError.message ?? 'Docker command failed.',
            commandError.stderr ?? '',
            exitCode,
        );
    }
}

export async function checkDockerAvailable(): Promise<void> {
    await runDocker(['version', '--format', '{{.Server.Version}}']);
}

export async function buildImage(
    imageTag: string,
    buildContext: string,
): Promise<DockerCommandResult> {
    return runDocker([
        'build',
        '--tag',
        imageTag,
        buildContext,
    ]);
}

export async function runContainer(options: {
    containerName: string;
    imageTag: string;
    hostPort: number;
    containerPort: number;
    network?: string;
}): Promise<DockerCommandResult> {
    const args = [
        'run',
        '--detach',
        '--name',
        options.containerName,
    ];

    if (options.network) {
        args.push(
            '--network',
            options.network,
        );
    }

    args.push(
        '--publish',
        `${options.hostPort}:${options.containerPort}`,
        options.imageTag,
    );

    return runDocker(args);
}

export async function stopContainer(
    containerName: string,
): Promise<DockerCommandResult> {
    return runDocker([
        'stop',
        containerName,
    ]);
}

export async function removeContainer(
    containerName: string,
): Promise<DockerCommandResult> {
    return runDocker([
        'rm',
        containerName,
    ]);
}

export async function removeImage(
    imageTag: string,
): Promise<DockerCommandResult> {
    return runDocker([
        'rmi',
        imageTag,
    ]);
}

export async function inspectContainer(
    containerName: string,
): Promise<string> {
    const result = await runDocker([
        'inspect',
        '--format',
        '{{json .State}}',
        containerName,
    ]);

    return result.stdout.trim();
}