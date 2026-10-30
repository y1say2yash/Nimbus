import database from '../config/knex.js';
import { getDeploymentUrl } from '../runtime/runtime-url.js';

const rangeStart = database.raw("((date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '29 days') AT TIME ZONE 'UTC')");

function projectScope(userId: string) {
    return database('projects')
        .where('user_id', userId)
        .where('is_active', true);
}

function allProjectsScope(userId: string) {
    return database('projects')
        .where('user_id', userId)
        .whereNull('deleted_at');
}

function deploymentScope(userId: string) {
    return database('deployments')
        .join('projects', 'deployments.project_id', 'projects.project_id')
        .where('projects.user_id', userId)
        .where('projects.is_active', true);
}

export async function getDashboardSummary(userId: string) {
    const [summaryRows, projectRows, recentRows] = await Promise.all([
        allProjectsScope(userId)
            .leftJoin('deployments', 'projects.project_id', 'deployments.project_id')
            .select(
                database.raw('COUNT(DISTINCT projects.project_id)::int AS total_projects'),
                database.raw("COUNT(DISTINCT projects.project_id) FILTER (WHERE projects.is_active = true)::int AS active_projects"),
                database.raw("COUNT(DISTINCT projects.project_id) FILTER (WHERE projects.is_active = true AND deployments.status = 'RUNNING')::int AS projects_with_running_deployments"),
                database.raw("COUNT(deployments.deployment_id) FILTER (WHERE projects.is_active = true)::int AS total_deployments"),
                database.raw("COUNT(deployments.deployment_id) FILTER (WHERE projects.is_active = true AND deployments.status = 'RUNNING')::int AS running_deployments"),
                database.raw("COUNT(deployments.deployment_id) FILTER (WHERE projects.is_active = true AND deployments.status = 'FAILED')::int AS failed_deployments"),
            ),
        projectScope(userId)
            .leftJoin(database.raw(`LATERAL (
                SELECT deployment_id, branch, commit_sha, status, created_at
                FROM deployments
                WHERE deployments.project_id = projects.project_id
                ORDER BY created_at DESC, deployment_id DESC
                LIMIT 1
            ) AS latest_deployment ON true`))
            .select(
                'projects.project_id',
                'projects.project_name',
                'projects.repository_url',
                'projects.default_branch',
                'projects.created_at',
                'latest_deployment.status as latest_deployment_status',
                'latest_deployment.branch as latest_deployment_branch',
                'latest_deployment.commit_sha as latest_deployment_commit_sha',
                'latest_deployment.created_at as latest_deployment_created_at',
            )
            .orderBy('projects.created_at', 'desc'),
        deploymentScope(userId)
            .select(
                'deployments.deployment_id',
                'deployments.project_id',
                'projects.project_name',
                'deployments.repository_url',
                'deployments.branch',
                'deployments.commit_sha',
                'deployments.status',
                'deployments.created_at',
            )
            .orderBy('deployments.created_at', 'desc')
            .orderBy('deployments.deployment_id', 'desc')
            .limit(8),
    ]);

    const summary = summaryRows[0];
    const running = Number(summary.running_deployments);
    const failed = Number(summary.failed_deployments);
    const outcomes = running + failed;
    const totalProjects = Number(summary.total_projects);
    const activeProjects = Number(summary.active_projects);
    const projectsWithRunningDeployments = Number(summary.projects_with_running_deployments);

    return {
        summary: {
            total_projects: totalProjects,
            active_projects: activeProjects,
            projects_with_running_deployments: projectsWithRunningDeployments,
            projects_without_running_deployments: activeProjects - projectsWithRunningDeployments,
            total_deployments: Number(summary.total_deployments),
            running_deployments: running,
            successful_deployments: running,
            failed_deployments: failed,
            success_rate: outcomes === 0 ? null : Math.round((running / outcomes) * 100),
        },
        projects: projectRows,
        recent_deployments: recentRows.map((row) => ({
            ...row,
            application_url: row.status === 'RUNNING' ? getDeploymentUrl(row.project_name) : null,
        })),
    };
}

export async function getDashboardCharts(userId: string) {
    const [statusRows, deploymentActivityRows, buildActivityRows, projectActivityRows, projectDeploymentRows] = await Promise.all([
        deploymentScope(userId)
            .select('deployments.status')
            .select(database.raw('COUNT(deployments.deployment_id)::int AS count'))
            .groupBy('deployments.status'),
        deploymentScope(userId)
            .where('deployments.created_at', '>=', rangeStart)
            .select(database.raw("to_char(date_trunc('day', deployments.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date"))
            .select(
                database.raw("COUNT(*) FILTER (WHERE deployments.status = 'RUNNING')::int AS successful"),
                database.raw("COUNT(*) FILTER (WHERE deployments.status = 'FAILED')::int AS failed"),
                database.raw("COUNT(*) FILTER (WHERE deployments.status NOT IN ('RUNNING', 'FAILED'))::int AS other"),
            )
            .groupByRaw("date_trunc('day', deployments.created_at AT TIME ZONE 'UTC')")
            .orderByRaw("date_trunc('day', deployments.created_at AT TIME ZONE 'UTC')"),
        deploymentScope(userId)
            .where('deployments.created_at', '>=', rangeStart)
            .select(database.raw("to_char(date_trunc('day', deployments.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date"))
            .select(
                database.raw("COUNT(*) FILTER (WHERE deployments.status IN ('RUNNING', 'STOPPED'))::int AS successful"),
                database.raw("COUNT(*) FILTER (WHERE deployments.status = 'FAILED')::int AS failed"),
                database.raw("COUNT(*) FILTER (WHERE deployments.status IN ('PENDING', 'CLONING', 'BUILDING', 'STARTING'))::int AS in_progress"),
            )
            .groupByRaw("date_trunc('day', deployments.created_at AT TIME ZONE 'UTC')")
            .orderByRaw("date_trunc('day', deployments.created_at AT TIME ZONE 'UTC')"),
        allProjectsScope(userId)
            .where('created_at', '>=', rangeStart)
            .select(database.raw("to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date"))
            .select(database.raw('COUNT(project_id)::int AS count'))
            .groupByRaw("date_trunc('day', created_at AT TIME ZONE 'UTC')")
            .orderByRaw("date_trunc('day', created_at AT TIME ZONE 'UTC')"),
        deploymentScope(userId)
            .select('projects.project_id', 'projects.project_name')
            .select(database.raw('COUNT(deployments.deployment_id)::int AS deployments'))
            .groupBy('projects.project_id', 'projects.project_name')
            .orderByRaw('COUNT(deployments.deployment_id) DESC')
            .orderBy('projects.project_name', 'asc')
            .limit(8),
    ]);

    const successfulBuilds = statusRows
        .filter((row) => row.status === 'RUNNING' || row.status === 'STOPPED')
        .reduce((total, row) => total + Number(row.count), 0);
    const failedBuilds = statusRows
        .filter((row) => row.status === 'FAILED')
        .reduce((total, row) => total + Number(row.count), 0);
    const inProgressBuilds = statusRows
        .filter((row) => ['PENDING', 'CLONING', 'BUILDING', 'STARTING'].includes(row.status))
        .reduce((total, row) => total + Number(row.count), 0);

    return {
        deployment_status: statusRows.map((row) => ({
            status: row.status,
            count: Number(row.count),
        })),
        deployment_activity: deploymentActivityRows.map((row) => ({
            date: row.date,
            successful: Number(row.successful),
            failed: Number(row.failed),
            other: Number(row.other),
        })),
        build_activity: buildActivityRows.map((row) => ({
            date: row.date,
            successful: Number(row.successful),
            failed: Number(row.failed),
            in_progress: Number(row.in_progress),
        })),
        build_summary: {
            total: statusRows.reduce((total, row) => total + Number(row.count), 0),
            successful: successfulBuilds,
            failed: failedBuilds,
            in_progress: inProgressBuilds,
        },
        project_activity: projectActivityRows.map((row) => ({
            date: row.date,
            projects: Number(row.count),
        })),
        project_deployment_activity: projectDeploymentRows.map((row) => ({
            project_id: row.project_id,
            project_name: row.project_name,
            deployments: Number(row.deployments),
        })),
    };
}

export async function getDashboardAnalytics(userId: string) {
    const [summary, charts] = await Promise.all([
        getDashboardSummary(userId),
        getDashboardCharts(userId),
    ]);

    return { ...summary, ...charts };
}
