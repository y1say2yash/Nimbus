import fs from 'node:fs/promises';

import {
    execFile,
} from 'node:child_process';

import {
    promisify,
} from 'node:util';

const execFileAsync = promisify(execFile);

const ROUTES_FILE =
    '/shared/nginx/generated/deployments.conf';

const NGINX_CONTAINER =
    'nimbus-nginx';

interface DeploymentRoute {
    projectName: string;
    containerName: string;
    containerPort: number;
}

function escapeRegex(value: string): string {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );
}

function createRoute(
    route: DeploymentRoute,
): string {
    const projectName =
        escapeRegex(route.projectName);

    return `
location ^~ /apps/${projectName}/ {
    proxy_pass http://${route.containerName}:${route.containerPort}/;

    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
`;
}

export async function writeDeploymentRoute(
    route: DeploymentRoute,
): Promise<void> {
    await fs.mkdir(
        '/shared/nginx/generated',
        {
            recursive: true,
        },
    );

    const existing =
        await readRoutesFile();

    const routeMarker =
        `# NIMBUS_ROUTE:${route.projectName}`;

    const newRoute =
        `${routeMarker}\n${createRoute(route)}\n# END_NIMBUS_ROUTE:${route.projectName}`;

    const updated =
        replaceRoute(
            existing,
            route.projectName,
            newRoute,
        );

    await fs.writeFile(
        ROUTES_FILE,
        updated,
        'utf8',
    );

    await reloadNginx();
}

export async function removeDeploymentRoute(
    projectName: string,
): Promise<void> {
    const existing =
        await readRoutesFile();

    const updated =
        removeRoute(
            existing,
            projectName,
        );

    await fs.writeFile(
        ROUTES_FILE,
        updated,
        'utf8',
    );

    await reloadNginx();
}

async function readRoutesFile(): Promise<string> {
    try {
        return await fs.readFile(
            ROUTES_FILE,
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

function replaceRoute(
    content: string,
    projectName: string,
    newRoute: string,
): string {
    const startMarker =
        `# NIMBUS_ROUTE:${projectName}`;

    const endMarker =
        `# END_NIMBUS_ROUTE:${projectName}`;

    const startIndex =
        content.indexOf(startMarker);

    const endIndex =
        content.indexOf(endMarker);

    if (
        startIndex !== -1 &&
        endIndex !== -1 &&
        endIndex > startIndex
    ) {
        return (
            content.slice(0, startIndex) +
            newRoute +
            content.slice(
                endIndex + endMarker.length,
            )
        );
    }

    return `${content}\n${newRoute}\n`;
}

function removeRoute(
    content: string,
    projectName: string,
): string {
    const startMarker =
        `# NIMBUS_ROUTE:${projectName}`;

    const endMarker =
        `# END_NIMBUS_ROUTE:${projectName}`;

    const startIndex =
        content.indexOf(startMarker);

    const endIndex =
        content.indexOf(endMarker);

    if (
        startIndex === -1 ||
        endIndex === -1
    ) {
        return content;
    }

    return (
        content.slice(0, startIndex) +
        content.slice(
            endIndex + endMarker.length,
        )
    );
}

async function reloadNginx(): Promise<void> {
    await execFileAsync(
        'docker',
        [
            'exec',
            NGINX_CONTAINER,
            'nginx',
            '-s',
            'reload',
        ],
        {
            maxBuffer: 1024 * 1024,
        },
    );
}