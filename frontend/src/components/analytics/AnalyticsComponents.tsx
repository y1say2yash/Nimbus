import type { ActivityPoint, DashboardAnalytics } from '../../api/analytics';
import type { DeploymentStatus } from '../../api/deployments';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
    RUNNING: 'var(--color-chart-success)',
    FAILED: 'var(--color-chart-failure)',
    BUILDING: 'var(--color-chart-progress)',
    CLONING: 'var(--color-chart-progress)',
    STARTING: 'var(--color-chart-progress)',
    PENDING: 'var(--color-chart-pending)',
    STOPPED: 'var(--color-chart-stopped)',
    CANCELLED: 'var(--color-chart-cancelled)',
    SUCCESSFUL: 'var(--color-chart-success)',
    IN_PROGRESS: 'var(--color-chart-progress)',
    OTHER: 'var(--color-chart-neutral)',
};

function hasValidApplicationUrl(value: string | null | undefined): value is string {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function MetricCard({
    label,
    value,
    note,
    tone = 'gold',
}: {
    label: string;
    value: string | number;
    note: string;
    tone?: 'gold' | 'success' | 'error' | 'muted';
}) {
    return (
        <article className={`metric-card metric-${tone}`}>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{note}</span>
        </article>
    );
}

export function ChartCard({
    title,
    subtitle,
    children,
    className = '',
    periodLabel = 'LAST 30 DAYS',
}: {
    title: string;
    subtitle: string;
    children: import('react').ReactNode;
    className?: string;
    periodLabel?: string;
}) {
    return (
        <section className={`analytics-card ${className}`}>
            <div className="analytics-card-heading">
                <div>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>
                <span className="analytics-period">{periodLabel}</span>
            </div>
            {children}
        </section>
    );
}

function getDailyPoints(points: ActivityPoint[]) {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date(`${today}T00:00:00Z`);
    const days: ActivityPoint[] = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
        const date = new Date(now);
        date.setUTCDate(now.getUTCDate() - offset);
        const key = date.toISOString().slice(0, 10);
        const point = points.find((item) => item.date === key);
        days.push(point ?? { date: key, successful: 0, failed: 0, other: 0, in_progress: 0 });
    }

    return days;
}

export function RecentDeployments({
    deployments,
    buildView = false,
}: {
    deployments: DashboardAnalytics['recent_deployments'];
    buildView?: boolean;
}) {
    if (deployments.length === 0) {
        return <div className="chart-empty">No deployments yet. Create a project and launch its first deployment.</div>;
    }

    return (
        <div className="recent-deployments">
            {deployments.map((deployment) => {
                const applicationUrl = hasValidApplicationUrl(deployment.application_url)
                    ? deployment.application_url
                    : null;
                const showVisitApp = !buildView
                    && deployment.status === 'RUNNING'
                    && applicationUrl !== null;
                return (
                    <article className="recent-deployment" key={deployment.deployment_id}>
                        <div className="recent-deployment-status">
                            <span className={`deployment-status status-${deployment.status.toLowerCase()}`}>{deployment.status}</span>
                            <span>{new Date(deployment.created_at).toLocaleString()}</span>
                        </div>
                        <div className="recent-deployment-main">
                            <strong>{deployment.project_name}</strong>
                            <span>{deployment.branch} · {deployment.commit_sha ? deployment.commit_sha.slice(0, 8) : 'Commit pending'}</span>
                        </div>
                        <div className="recent-deployment-actions">
                            <Link className="button button-quiet recent-deployment-action" to={`/projects/${encodeURIComponent(deployment.project_id)}/deployments/${encodeURIComponent(deployment.deployment_id)}/logs`}>{buildView ? 'Build / runtime logs' : 'Logs'}</Link>
                            {showVisitApp ? (
                                <a className="button button-quiet gold-text recent-deployment-action" href={applicationUrl ?? undefined} target="_blank" rel="noopener noreferrer">Visit App ↗</a>
                            ) : (
                                <span className="recent-deployment-action-placeholder" aria-hidden="true" />
                            )}
                            <Link className="button button-quiet recent-deployment-action" to={`/projects/${encodeURIComponent(deployment.project_id)}`}>View project ↗</Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export function ActivityChart({
    points,
    build = false,
    singleSeriesLabel,
}: {
    points: ActivityPoint[];
    build?: boolean;
    singleSeriesLabel?: string;
}) {
    const days = getDailyPoints(points);
    const getValues = (point: ActivityPoint) => [
        point.successful,
        point.failed,
        build ? (point.in_progress ?? 0) : (point.other ?? 0),
    ];
    const max = Math.max(1, ...days.map((point) => getValues(point).reduce((sum, value) => sum + value, 0)));
    const hasActivity = days.some((point) => getValues(point).some((value) => value > 0));
    const chartWidth = 720;
    const chartHeight = 170;
    const barStep = chartWidth / days.length;
    const barWidth = Math.max(3, barStep * 0.56);

    if (!hasActivity) {
        return <div className="chart-empty">No activity in the last 30 days.</div>;
    }

    return (
        <>
            <div className="activity-chart-wrap">
                <svg className="activity-chart" viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`} role="img" aria-label={singleSeriesLabel ? `Daily ${singleSeriesLabel.toLowerCase()} for the last 30 days` : `Daily ${build ? 'build' : 'deployment'} activity for the last 30 days`}>
                    {[0, 0.5, 1].map((fraction) => {
                        const y = chartHeight - (chartHeight * fraction);
                        return <line key={fraction} x1="0" x2={chartWidth} y1={y} y2={y} className="chart-grid-line" />;
                    })}
                    {days.map((point, index) => {
                        const values = getValues(point);
                        let y = chartHeight;
                        const x = index * barStep + (barStep - barWidth) / 2;
                                        const colors = singleSeriesLabel
                                            ? ['var(--color-chart-accent)', 'transparent', 'transparent']
                                            : build
                                                ? [statusColors.SUCCESSFUL, statusColors.FAILED, statusColors.IN_PROGRESS]
                                                : [statusColors.SUCCESSFUL, statusColors.FAILED, statusColors.OTHER];
                        return (
                            <g key={point.date}>
                                <title>{singleSeriesLabel
                                    ? `${point.date}: ${values[0]} ${singleSeriesLabel.toLowerCase()}`
                                    : `${point.date}: ${values[0]} successful, ${values[1]} failed, ${values[2]} ${build ? 'in progress' : 'other'}`}</title>
                                {values.map((value, seriesIndex) => {
                                    const height = (value / max) * chartHeight;
                                    y -= height;
                                    return height > 0 ? (
                                        <rect
                                            key={seriesIndex}
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={height}
                                            rx="2"
                                            fill={colors[seriesIndex]}
                                        />
                                    ) : null;
                                })}
                                {index % 6 === 0 || index === days.length - 1 ? (
                                    <text x={index * barStep + barStep / 2} y={chartHeight + 18} className="chart-axis-label" textAnchor="middle">
                                        {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="chart-legend">
                {singleSeriesLabel ? (
                    <span><i style={{ backgroundColor: 'var(--color-chart-accent)' }} />{singleSeriesLabel}</span>
                ) : (
                    <>
                        <span><i style={{ backgroundColor: statusColors.SUCCESSFUL }} />Successful</span>
                        <span><i style={{ backgroundColor: statusColors.FAILED }} />Failed</span>
                        <span><i style={{ backgroundColor: build ? statusColors.IN_PROGRESS : statusColors.OTHER }} />{build ? 'In progress' : 'Other'}</span>
                    </>
                )}
            </div>
        </>
    );
}

export function StatusChart({
    statuses,
}: {
    statuses: { status: DeploymentStatus; count: number }[];
}) {
    const total = statuses.reduce((sum, item) => sum + item.count, 0);
    const circumference = 2 * Math.PI * 43;
    const entries = statuses.filter((item) => item.count > 0);

    if (total === 0) return <div className="chart-empty">No deployment status data yet.</div>;

    return (
        <div className="status-chart-layout">
            <svg className="status-donut" viewBox="0 0 112 112" role="img" aria-label={`Deployment status distribution across ${total} deployments`}>
                <circle cx="56" cy="56" r="43" fill="none" stroke="#292e3a" strokeWidth="13" />
                <g transform="rotate(-90 56 56)">
                    {entries.map((item, index) => {
                        const length = (item.count / total) * circumference;
                        const dashOffset = entries
                            .slice(0, index)
                            .reduce((sum, previous) => sum + (previous.count / total) * circumference, 0);
                        return (
                            <circle
                                key={item.status}
                                cx="56"
                                cy="56"
                                r="43"
                                fill="none"
                                stroke={statusColors[item.status]}
                                strokeWidth="13"
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={-dashOffset}
                            >
                                <title>{`${item.status}: ${item.count} (${Math.round((item.count / total) * 100)}%)`}</title>
                            </circle>
                        );
                    })}
                </g>
                <text x="56" y="53" className="donut-total" textAnchor="middle">{total}</text>
                <text x="56" y="68" className="donut-caption" textAnchor="middle">TOTAL</text>
            </svg>
            <ul className="status-legend">
                {entries.map((item) => (
                    <li key={item.status}>
                        <span><i style={{ backgroundColor: statusColors[item.status] }} />{item.status}</span>
                        <strong>{item.count} <small>{Math.round((item.count / total) * 100)}%</small></strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ProjectDeploymentChart({
    projects,
}: {
    projects: { project_id: string; project_name: string; deployments: number }[];
}) {
    if (projects.length === 0) return <div className="chart-empty">No project deployment activity yet.</div>;
    const maximum = Math.max(1, ...projects.map((project) => project.deployments));
    return (
        <div className="project-bars">
            {projects.map((project) => (
                <div className="project-bar-row" key={project.project_id} title={`${project.project_name}: ${project.deployments} deployments`}>
                    <span>{project.project_name}</span>
                    <div className="project-bar-track"><i style={{ width: `${Math.max(3, (project.deployments / maximum) * 100)}%` }} /></div>
                    <strong>{project.deployments}</strong>
                </div>
            ))}
        </div>
    );
}
