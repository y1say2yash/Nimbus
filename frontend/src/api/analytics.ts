import { getData } from './client';
import type { Deployment, DeploymentStatus } from './deployments';

export interface AnalyticsSummary {
    total_projects: number;
    active_projects: number;
    projects_with_running_deployments: number;
    projects_without_running_deployments: number;
    total_deployments: number;
    running_deployments: number;
    successful_deployments: number;
    failed_deployments: number;
    success_rate: number | null;
}

export interface ActivityPoint {
    date: string;
    successful: number;
    failed: number;
    other?: number;
    in_progress?: number;
}

export interface AnalyticsProject {
    project_id: string;
    project_name: string;
    repository_url: string;
    default_branch: string;
    created_at: string;
    latest_deployment_status: DeploymentStatus | null;
    latest_deployment_branch: string | null;
    latest_deployment_commit_sha: string | null;
    latest_deployment_created_at: string | null;
}

export interface DashboardSummary {
    summary: AnalyticsSummary;
    projects: AnalyticsProject[];
    recent_deployments: RecentDeployment[];
}

export interface DashboardCharts {
    deployment_status: { status: DeploymentStatus; count: number }[];
    deployment_activity: ActivityPoint[];
    build_activity: ActivityPoint[];
    build_summary: {
        total: number;
        successful: number;
        failed: number;
        in_progress: number;
    };
    project_activity: { date: string; projects: number }[];
    project_deployment_activity: {
        project_id: string;
        project_name: string;
        deployments: number;
    }[];
}

export type RecentDeployment = Pick<
        Deployment,
        | 'deployment_id'
        | 'project_id'
        | 'project_name'
        | 'repository_url'
        | 'branch'
        | 'commit_sha'
        | 'status'
        | 'created_at'
        | 'application_url'
    >;

export interface DashboardAnalytics extends DashboardSummary, DashboardCharts {}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
    return getData<DashboardAnalytics>('/dashboard/analytics');
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    return getData<DashboardSummary>('/dashboard/summary');
}

export async function getDashboardCharts(): Promise<DashboardCharts> {
    return getData<DashboardCharts>('/dashboard/charts');
}
