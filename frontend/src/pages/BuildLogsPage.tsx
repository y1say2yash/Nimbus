import { Link } from 'react-router-dom';
import { useAnalytics } from '../analytics/use-analytics';
import {
    ActivityChart,
    ChartCard,
    MetricCard,
    RecentDeployments,
} from '../components/analytics/AnalyticsComponents';

function BuildLogsPage() {
    const {
        summary,
        charts,
        summaryLoading,
        chartsLoading,
        summaryError,
        chartsError,
        refresh,
    } = useAnalytics();
    const builds = charts?.build_summary;

    return (
        <section className="analytics-page">
            <div className="breadcrumb">WORKSPACE <span>/</span> BUILD LOGS</div>
            <header className="analytics-page-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> BUILD ACTIVITY</p>
                    <h1>Build logs</h1>
                    <p className="dashboard-subtitle">Build outcomes derived from the deployment lifecycle; log views include combined deployment output.</p>
                </div>
                <button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={summaryLoading || chartsLoading}>
                    {summaryLoading || chartsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
            </header>

            {summaryError && <div className="inline-error" role="alert"><span>Recent builds unavailable: {summaryError}</span><button className="button button-secondary" type="button" onClick={() => void refresh()}>Retry summary</button></div>}
            {chartsError && <div className="inline-error" role="alert"><span>Build analytics unavailable: {chartsError}</span><button className="button button-secondary" type="button" onClick={() => void refresh()}>Retry charts</button></div>}

            {builds && (
                <>
                    <div className="metrics-grid metrics-grid-four">
                        <MetricCard label="TOTAL BUILDS" value={builds.total} note="Deployment build attempts" />
                        <MetricCard label="SUCCESSFUL" value={builds.successful} note="Reached running or stopped" tone="success" />
                        <MetricCard label="FAILED" value={builds.failed} note="Failed deployment builds" tone="error" />
                        <MetricCard label="IN PROGRESS" value={builds.in_progress} note="Pending, cloning, building, or starting" tone="muted" />
                    </div>

                    <ChartCard title="Build activity" subtitle="Build outcome by deployment creation date.">
                        <ActivityChart points={charts?.build_activity ?? []} build />
                    </ChartCard>
                </>
            )}

            {summary && (
                <ChartCard title="Recent build activity" subtitle="Build outcomes are separated from runtime state; logs are the existing combined deployment output." className="recent-activity-card" periodLabel="LATEST">
                    <RecentDeployments deployments={summary.recent_deployments} buildView />
                    <Link className="analytics-card-link" to="/deployments?tab=history">Open deployment history <span aria-hidden="true">→</span></Link>
                </ChartCard>
            )}
            {chartsLoading && !charts && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Loading build metrics…</p></div>}
            {summaryLoading && !summary && <div className="analytics-loading" role="status"><span className="loading-indicator" /><p>Loading recent build activity…</p></div>}
            {!charts && !summary && !chartsLoading && !summaryLoading && !chartsError && !summaryError && <div className="chart-empty">Build activity is not available yet.</div>}
        </section>
    );
}

export default BuildLogsPage;
