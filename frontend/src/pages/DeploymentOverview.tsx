import { Link } from 'react-router-dom';
import { useAnalytics } from '../analytics/use-analytics';
import {
    ActivityChart,
    ChartCard,
    MetricCard,
    RecentDeployments,
    StatusChart,
} from '../components/analytics/AnalyticsComponents';

export function DeploymentOverview({
    openHistory,
    openOverview,
}: {
    openHistory: () => void;
    openOverview: () => void;
}) {
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
        <section className="analytics-page deployments-overview">
            <div className="breadcrumb">WORKSPACE <span>/</span> DEPLOYMENTS</div>
            <header className="analytics-page-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> WORKSPACE</p>
                    <h1>Deployments</h1>
                    <p className="dashboard-subtitle">Deployment health and activity across your projects.</p>
                </div>
                <div className="workflow-actions">
                    <button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={summaryLoading || chartsLoading}>
                        {summaryLoading || chartsLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button className="button button-primary" type="button" onClick={openHistory}>Deployment history</button>
                </div>
            </header>
            <nav className="deployment-tabs" aria-label="Deployment views">
                <button className="deployment-tab deployment-tab-active" type="button" onClick={openOverview} aria-current="page">Deployment Overview</button>
                <button className="deployment-tab" type="button" onClick={openHistory}>Deployment History</button>
            </nav>

            {summaryError && <div className="inline-error" role="alert"><span>Deployment summary unavailable: {summaryError}</span><button className="button button-secondary" type="button" onClick={() => void refresh()}>Retry summary</button></div>}
            {chartsError && <div className="inline-error" role="alert"><span>Deployment charts unavailable: {chartsError}</span><button className="button button-secondary" type="button" onClick={() => void refresh()}>Retry charts</button></div>}
            {summary && (
                <>
                    <div className="metrics-grid metrics-grid-five">
                        <MetricCard label="TOTAL DEPLOYMENTS" value={summary.summary.total_deployments} note="Across active projects" />
                        <MetricCard label="RUNNING" value={summary.summary.running_deployments} note="Live deployments" tone="success" />
                        <MetricCard label="SUCCESSFUL" value={summary.summary.successful_deployments} note="Currently running" tone="success" />
                        <MetricCard label="FAILED" value={summary.summary.failed_deployments} note="Current failed records" tone="error" />
                        <MetricCard label="SUCCESS RATE" value={summary.summary.success_rate === null ? '—' : `${summary.summary.success_rate}%`} note="Running ÷ running and failed" />
                    </div>
                </>
            )}
            {charts && (
                <div className="analytics-grid analytics-grid-primary">
                    <ChartCard title="Deployment activity" subtitle="Daily successful, failed, and other deployment records.">
                        <ActivityChart points={charts.deployment_activity} />
                    </ChartCard>
                    <ChartCard title="Status distribution" subtitle="Current status of every deployment record." periodLabel="CURRENT">
                        <StatusChart statuses={charts.deployment_status} />
                    </ChartCard>
                </div>
            )}
            {summary && (
                <ChartCard title="Recent deployment activity" subtitle="Recent runs across your projects." className="recent-activity-card" periodLabel="LATEST">
                    <RecentDeployments deployments={summary.recent_deployments} />
                    <button className="analytics-card-link analytics-link-button" type="button" onClick={openHistory}>Browse full history <span aria-hidden="true">→</span></button>
                </ChartCard>
            )}
            {summaryLoading && !summary && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Loading deployment summary…</p></div>}
            {chartsLoading && !charts && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Loading deployment charts…</p></div>}
            {!summary && !charts && !summaryLoading && !chartsLoading && !summaryError && !chartsError && <div className="chart-empty">Deployment analytics are not available yet.</div>}
            <div className="analytics-footnote"><Link to="/projects">Manage projects</Link> to create or deploy an application.</div>
        </section>
    );
}
