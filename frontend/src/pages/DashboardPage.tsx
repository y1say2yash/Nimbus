import { Link } from 'react-router-dom';
import { useAnalytics } from '../analytics/use-analytics';
import {
    ActivityChart,
    ChartCard,
    MetricCard,
    RecentDeployments,
    StatusChart,
} from '../components/analytics/AnalyticsComponents';

function DashboardPage({ username }: { username: string }) {
    const {
        summary,
        charts,
        summaryLoading,
        chartsLoading,
        summaryError,
        chartsError,
        refresh,
    } = useAnalytics();

    return (
        <section className="analytics-page">
            <div className="breadcrumb">WORKSPACE <span>/</span> OVERVIEW</div>
            <header className="analytics-page-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</p>
                    <h1>Welcome back, <span className="gold-text">{username}.</span></h1>
                    <p className="dashboard-subtitle">A clear view of your projects and deployment activity.</p>
                </div>
                <button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={summaryLoading || chartsLoading}>
                    {summaryLoading || chartsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
            </header>

            {summaryError && (
                <div className="inline-error" role="alert">
                    <span>Summary unavailable: {summaryError}</span>
                    <button className="button button-secondary" type="button" onClick={() => void refresh()}>Try again</button>
                </div>
            )}

            {chartsError && (
                <div className="inline-error" role="alert">
                    <span>Charts unavailable: {chartsError}</span>
                    <button className="button button-secondary" type="button" onClick={() => void refresh()}>Retry charts</button>
                </div>
            )}

            {summary && (
                <>
                    <div className="metrics-grid">
                        <MetricCard label="TOTAL PROJECTS" value={summary.summary.total_projects} note="Non-deleted workspaces" />
                        <MetricCard label="ACTIVE PROJECTS" value={summary.summary.active_projects} note="Enabled workspace projects" tone="success" />
                        <MetricCard label="TOTAL DEPLOYMENTS" value={summary.summary.total_deployments} note="Across active projects" />
                        <MetricCard label="RUNNING" value={summary.summary.running_deployments} note="Currently serving traffic" tone="success" />
                        <MetricCard label="FAILED" value={summary.summary.failed_deployments} note="Current failed deployments" tone="error" />
                        <MetricCard label="SUCCESS RATE" value={summary.summary.success_rate === null ? '—' : `${summary.summary.success_rate}%`} note="Running ÷ running and failed" />
                    </div>
                </>
            )}

            {charts && (
                <div className="analytics-grid analytics-grid-primary">
                    <ChartCard title="Deployment activity" subtitle="Successful, failed, and other deployments by day.">
                        <ActivityChart points={charts.deployment_activity} />
                    </ChartCard>
                    <ChartCard title="Deployment status" subtitle="Current status of each deployment record." periodLabel="CURRENT">
                        <StatusChart statuses={charts.deployment_status} />
                    </ChartCard>
                </div>
            )}
            {summary && (
                <div className="analytics-grid dashboard-lower-grid">
                    <ChartCard title="Recent deployments" subtitle="Your latest deployment activity." className="recent-activity-card" periodLabel="LATEST">
                        <RecentDeployments deployments={summary.recent_deployments} />
                        <Link className="analytics-card-link" to="/deployments?tab=history">View deployment history <span aria-hidden="true">→</span></Link>
                    </ChartCard>
                    <ChartCard title="Project overview" subtitle={`${summary.summary.projects_with_running_deployments} of ${summary.summary.active_projects} active projects currently running.`}>
                        {summary.projects.length === 0 ? (
                            <div className="chart-empty">
                                <p>No active projects yet. Connect a GitHub repository to get started.</p>
                                <Link className="button button-primary" to="/projects/new">Create a project</Link>
                            </div>
                        ) : (
                            <div className="project-summary-list">
                                {summary.projects.slice(0, 5).map((project) => (
                                    <Link className="project-summary-row" to={`/projects/${encodeURIComponent(project.project_id)}`} key={project.project_id}>
                                        <span><strong>{project.project_name}</strong><small>{project.default_branch}</small></span>
                                        {project.latest_deployment_status ? (
                                            <span className={`deployment-status status-${project.latest_deployment_status.toLowerCase()}`}>{project.latest_deployment_status}</span>
                                        ) : <small>No deployments</small>}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <Link className="analytics-card-link" to="/projects">View all projects <span aria-hidden="true">→</span></Link>
                    </ChartCard>
                </div>
            )}
            {summaryLoading && !summary && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Gathering workspace summary…</p></div>}
            {chartsLoading && !charts && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Loading deployment charts…</p></div>}
            {!summary && !charts && !summaryLoading && !chartsLoading && !summaryError && !chartsError && <div className="chart-empty">Analytics are not available yet.</div>}
        </section>
    );
}

export default DashboardPage;
