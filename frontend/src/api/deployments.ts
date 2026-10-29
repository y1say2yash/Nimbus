import { apiRequest, getData } from './client';

export type DeploymentStatus =
    | 'PENDING'
    | 'CLONING'
    | 'BUILDING'
    | 'STARTING'
    | 'RUNNING'
    | 'FAILED'
    | 'STOPPED'
    | 'CANCELLED';

export interface Deployment {
    deployment_id: string;
    project_id: string;
    project_name?: string;
    repository_url: string;
    branch: string;
    commit_sha: string | null;
    container_port: number;
    host_port: number | null;
    image_tag: string;
    container_name: string;
    status: DeploymentStatus;
    error_message: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    application_url?: string | null;
}

export interface DeploymentPage {
    deployments: Deployment[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface DeploymentLogs {
    deployment_id: string;
    logs: string;
}

const activeStatuses: DeploymentStatus[] = [
    'PENDING',
    'CLONING',
    'BUILDING',
    'STARTING',
];

export function isDeploymentInProgress(status: DeploymentStatus): boolean {
    return activeStatuses.includes(status);
}

function deploymentPath(projectId: string, deploymentId?: string): string {
    const base = `/projects/${encodeURIComponent(projectId)}/deployments`;
    return deploymentId
        ? `${base}/${encodeURIComponent(deploymentId)}`
        : base;
}

export async function getDeployments(
    projectId: string,
    options: {
        page?: number;
        pageSize?: number;
        statuses?: DeploymentStatus[];
    } = {},
): Promise<DeploymentPage> {
    const query = new URLSearchParams({
        page: String(options.page ?? 1),
        page_size: String(options.pageSize ?? 10),
    });
    if (options.statuses?.length) {
        query.set('status', options.statuses.join(','));
    }

    const result = await getData<DeploymentPage>(
        `${deploymentPath(projectId)}?${query.toString()}`,
    );
    if (!Array.isArray(result.deployments)) {
        throw new Error('The server returned an unexpected deployments response.');
    }

    return result;
}

export async function getAllDeployments(
    projectId: string | undefined,
    options: {
        page?: number;
        pageSize?: number;
        statuses?: DeploymentStatus[];
    } = {},
): Promise<DeploymentPage> {
    const query = new URLSearchParams({
        page: String(options.page ?? 1),
        page_size: String(options.pageSize ?? 10),
    });
    if (projectId) query.set('project_id', projectId);
    if (options.statuses?.length) query.set('status', options.statuses.join(','));

    const result = await getData<DeploymentPage>(`/deployments?${query.toString()}`);
    if (!Array.isArray(result.deployments)) {
        throw new Error('The server returned an unexpected deployments response.');
    }

    return result;
}

export async function createDeployment(projectId: string, branch: string): Promise<Deployment> {
    const body = await apiRequest<{ data: Deployment }>(deploymentPath(projectId), {
        method: 'POST',
        body: JSON.stringify({ branch }),
    });
    return body.data;
}

export async function stopDeployment(projectId: string, deploymentId: string): Promise<Deployment> {
    const body = await apiRequest<{ data: Deployment }>(
        `${deploymentPath(projectId, deploymentId)}/stop`,
        { method: 'POST' },
    );
    return body.data;
}

export async function cancelDeployment(projectId: string, deploymentId: string): Promise<Deployment> {
    const body = await apiRequest<{ data: Deployment }>(
        `${deploymentPath(projectId, deploymentId)}/cancel`,
        { method: 'POST' },
    );
    return body.data;
}

export async function redeployDeployment(projectId: string, deploymentId: string): Promise<Deployment> {
    const body = await apiRequest<{ data: Deployment }>(
        `${deploymentPath(projectId, deploymentId)}/redeploy`,
        { method: 'POST' },
    );
    return body.data;
}

export async function getDeploymentLogs(
    projectId: string,
    deploymentId: string,
): Promise<DeploymentLogs> {
    return getData<DeploymentLogs>(
        `${deploymentPath(projectId, deploymentId)}/logs`,
    );
}
