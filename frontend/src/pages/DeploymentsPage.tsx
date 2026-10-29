import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
    cancelDeployment,
    getAllDeployments,
    isDeploymentInProgress,
    redeployDeployment,
    stopDeployment,
    type Deployment,
} from '../api/deployments';
import { ApiRequestError } from '../api/client';
import { getProject, getProjects } from '../api/projects';
import type { Project } from '../types/project';

const PAGE_SIZE = 10;
const deploymentStatuses = [
    'PENDING',
    'CLONING',
    'BUILDING',
    'STARTING',
    'RUNNING',
    'FAILED',
    'STOPPED',
    'CANCELLED',
] as const;

function formatDate(value: string): string {
    return new Date(value).toLocaleString();
}

function ProjectDeploymentsContent({
    projectId,
    status,
}: {
    projectId?: string;
    status?: string;
}) {
    const [project, setProject] = useState<Project | null>(null);
    const [projectLoaded, setProjectLoaded] = useState(!projectId);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectsError, setProjectsError] = useState('');
    const [draftProjectId, setDraftProjectId] = useState(projectId ?? '');
    const [draftStatus, setDraftStatus] = useState(status ?? '');
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [operationError, setOperationError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [busyAction, setBusyAction] = useState('');
    const requestSequence = useRef(0);
    const [, setSearchParams] = useSearchParams();

    const loadPage = useCallback(async (requestedPage: number, showLoading = true) => {
        const requestId = ++requestSequence.current;
        if (showLoading) setLoading(true);
        setError('');
        try {
            const result = await getAllDeployments(projectId, {
                page: requestedPage,
                pageSize: PAGE_SIZE,
                statuses: status ? [status as (typeof deploymentStatuses)[number]] : undefined,
            });
            if (requestId !== requestSequence.current) return;
            setDeployments(result.deployments);
            setTotal(result.total);
            setTotalPages(result.total_pages);
            if (result.total_pages === 0 && requestedPage !== 1) {
                setPage(1);
            } else if (result.total_pages > 0 && requestedPage > result.total_pages) {
                setPage(result.total_pages);
            }
        } catch (loadError) {
            if (requestId !== requestSequence.current) return;
            if (loadError instanceof ApiRequestError && loadError.status === 404) {
                setError('This project could not be found or is no longer active.');
            } else {
                setError(loadError instanceof Error ? loadError.message : 'Could not load deployment history.');
            }
        } finally {
            if (requestId === requestSequence.current) {
                if (showLoading) setLoading(false);
            }
        }
    }, [projectId, status]);

    useEffect(() => {
        let cancelled = false;
        async function loadProjects() {
            try {
                const result = await getProjects();
                if (!cancelled) {
                    setProjects(result);
                    setProjectsError('');
                }
            } catch (loadError) {
                if (!cancelled) {
                    setProjectsError(loadError instanceof Error ? loadError.message : 'Could not load projects for filtering.');
                }
            }
        }

        void loadProjects();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!projectId) {
            return () => {
                cancelled = true;
            };
        }
        const selectedProjectId = projectId;

        async function loadProject() {
            try {
                const data = await getProject(selectedProjectId);
                if (!cancelled) {
                    setProject(data);
                    setProjectLoaded(true);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setProjectLoaded(true);
                    setError(
                        loadError instanceof ApiRequestError && loadError.status === 404
                            ? 'This project could not be found or is no longer active.'
                            : loadError instanceof Error
                                ? loadError.message
                                : 'Could not load this project.',
                    );
                }
            }
        }

        void loadProject();
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadPage(page);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadPage, page]);

    const hasInProgressDeployment = deployments.some((deployment) =>
        isDeploymentInProgress(deployment.status),
    );

    useEffect(() => {
        if (!hasInProgressDeployment) return undefined;
        const interval = window.setInterval(() => {
            void loadPage(page, false);
        }, 5000);
        return () => window.clearInterval(interval);
    }, [hasInProgressDeployment, loadPage, page]);

    async function performAction(
        key: string,
        action: () => Promise<Deployment>,
        successMessage: string,
    ) {
        setBusyAction(key);
        setOperationError('');
        setFeedback('');
        try {
            const changedDeployment = await action();
            setFeedback(successMessage);
            const nextPage = changedDeployment.deployment_id === key ? page : 1;
            if (nextPage !== page) setPage(nextPage);
            await loadPage(nextPage);
        } catch (actionError) {
            setOperationError(actionError instanceof Error ? actionError.message : 'The deployment action failed.');
            await loadPage(page, false);
        } finally {
            setBusyAction('');
        }
    }

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextParams = new URLSearchParams();
        if (draftProjectId) nextParams.set('project_id', draftProjectId);
        if (draftStatus) nextParams.set('status', draftStatus);
        setSearchParams(nextParams);
        setPage(1);
    }

    function clearFilters() {
        setDraftProjectId('');
        setDraftStatus('');
        setSearchParams(new URLSearchParams());
        setPage(1);
    }

    if (!projectLoaded && !error) {
        return <div className="projects-state" role="status"><span className="loading-indicator" /><p>Opening deployment history...</p></div>;
    }

    return (
        <section className="workflow-page">
            <div className="breadcrumb">
                WORKSPACE <span>/</span> DEPLOYMENTS
                {project && <><span>/</span> <Link to={`/projects/${encodeURIComponent(project.project_id)}`}>{project.project_name.toUpperCase()}</Link></>}
            </div>
            <header className="workflow-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> WORKSPACE</p>
                    <h1>Deployments</h1>
                    <p className="dashboard-subtitle">
                        {project
                            ? `Deployments for ${project.project_name}.`
                            : projectId
                                ? 'Deployments filtered to the selected project.'
                                : 'Deployment activity across your projects.'}
                    </p>
                </div>
                <div className="workflow-actions">
                    <button className="button button-secondary" type="button" onClick={() => void loadPage(page)} disabled={loading}>
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </header>

            <form className="deployment-filter-panel" onSubmit={applyFilters}>
                <label className="form-field">
                    <span>PROJECT</span>
                    <select value={draftProjectId} onChange={(event) => setDraftProjectId(event.target.value)}>
                        <option value="">All projects</option>
                        {projects.map((item) => (
                            <option key={item.project_id} value={item.project_id}>{item.project_name}</option>
                        ))}
                    </select>
                </label>
                <label className="form-field">
                    <span>STATUS</span>
                    <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                        <option value="">All statuses</option>
                        {deploymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </label>
                <div className="deployment-filter-actions">
                    <button className="button button-primary" type="submit">Apply Filters</button>
                    <button className="button button-secondary" type="button" onClick={clearFilters}>Clear Filters</button>
                </div>
                {projectsError && <p className="workflow-error" role="alert">{projectsError}</p>}
            </form>

            <section className="deployment-history">
                <div className="section-heading">
                    <div>
                        <h2>Deployment history</h2>
                        <p>{total} {total === 1 ? 'deployment' : 'deployments'} · newest first</p>
                    </div>
                    <span className="section-caption">{total ? `PAGE ${page} OF ${totalPages}` : 'NO DEPLOYMENTS'}</span>
                </div>

                {error && <div className="inline-error" role="alert"><span>{error}</span><button className="button button-secondary" type="button" onClick={() => void loadPage(page)}>Try again</button></div>}
                {operationError && <p className="workflow-error" role="alert">{operationError}</p>}
                {feedback && <p className="workflow-success" role="status">{feedback}</p>}

                {loading ? (
                    <div className="projects-state" role="status"><span className="loading-indicator" /><p>Loading deployment history...</p></div>
                ) : deployments.length === 0 && !error ? (
                    <div className="projects-state projects-empty">
                        <div className="empty-emblem" aria-hidden="true">✧</div>
                        <h2>No deployments yet</h2>
                        <p>Deploy a branch from a project overview to start deployment history.</p>
                    </div>
                ) : deployments.length > 0 ? (
                    <>
                        <div className="deployment-list">
                            {deployments.map((deployment) => {
                                const inProgress = isDeploymentInProgress(deployment.status);
                                const actionKey = deployment.deployment_id;
                                return (
                                    <article className="deployment-card" key={deployment.deployment_id}>
                                        <div className="deployment-card-heading">
                                            <div>
                                                <span className={`deployment-status status-${deployment.status.toLowerCase()}`}>{deployment.status}</span>
                                                <h3>{deployment.branch}</h3>
                                            </div>
                                            <span className="deployment-date">{formatDate(deployment.created_at)}</span>
                                        </div>
                                        <div className="deployment-meta">
                                            <span>Commit <strong>{deployment.commit_sha ? deployment.commit_sha.slice(0, 10) : 'Pending'}</strong></span>
                                            <span>Container port <strong>{deployment.container_port}</strong></span>
                                            {deployment.host_port !== null && <span>Host port <strong>{deployment.host_port}</strong></span>}
                                        </div>
                                        {deployment.error_message && <p className="workflow-error">{deployment.error_message}</p>}
                                        <div className="deployment-actions">
                                            <Link className="button button-quiet" to={`/projects/${encodeURIComponent(deployment.project_id)}`}>{deployment.project_name ?? 'View project'}</Link>
                                            <Link className="button button-quiet" to={`/projects/${encodeURIComponent(deployment.project_id)}/deployments/${encodeURIComponent(deployment.deployment_id)}/logs`}>View combined logs</Link>
                                            {deployment.status === 'RUNNING' && deployment.application_url && (
                                                <a className="button button-primary" href={deployment.application_url} target="_blank" rel="noopener noreferrer">
                                                    Visit App <span aria-hidden="true">↗</span>
                                                </a>
                                            )}
                                            {inProgress && (
                                                <button className="button button-secondary" type="button" disabled={busyAction !== ''} onClick={() => void performAction(
                                                    actionKey,
                                                    () => cancelDeployment(deployment.project_id, deployment.deployment_id),
                                                    'Cancellation requested. The deployment status will update shortly.',
                                                )}>
                                                    {busyAction === actionKey ? 'Working…' : 'Cancel'}
                                                </button>
                                            )}
                                            {deployment.status === 'RUNNING' && (
                                                <button className="button button-secondary" type="button" disabled={busyAction !== ''} onClick={() => void performAction(
                                                    actionKey,
                                                    () => stopDeployment(deployment.project_id, deployment.deployment_id),
                                                    'Deployment stopped.',
                                                )}>
                                                    {busyAction === actionKey ? 'Working…' : 'Stop'}
                                                </button>
                                            )}
                                            {deployment.commit_sha && (
                                                <button className="button button-secondary" type="button" disabled={busyAction !== '' || deployments.some((item) => item.project_id === deployment.project_id && isDeploymentInProgress(item.status))} onClick={() => void performAction(
                                                    actionKey,
                                                    () => redeployDeployment(deployment.project_id, deployment.deployment_id),
                                                    'Redeployment accepted and queued.',
                                                )}>
                                                    {busyAction === actionKey ? 'Working…' : 'Redeploy commit'}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="pagination-controls">
                            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                            <div>
                                <button className="button button-secondary" type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                                <span>Page {page} of {totalPages}</span>
                                <button className="button button-secondary" type="button" disabled={loading || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
                            </div>
                        </div>
                    </>
                ) : null}
            </section>
        </section>
    );
}

export function GlobalDeploymentsPage() {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('project_id') ?? undefined;
    const requestedStatus = searchParams.get('status') ?? '';
    const status = deploymentStatuses.includes(requestedStatus as (typeof deploymentStatuses)[number])
        ? requestedStatus
        : undefined;
    return (
        <ProjectDeploymentsContent
            key={`${projectId ?? 'all'}:${status ?? 'all'}`}
            projectId={projectId}
            status={status}
        />
    );
}
