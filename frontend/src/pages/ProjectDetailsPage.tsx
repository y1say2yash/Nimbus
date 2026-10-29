import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiRequestError } from '../api/client';
import {
    createDeployment,
    getDeployments,
    isDeploymentInProgress,
    type Deployment,
    type DeploymentStatus,
} from '../api/deployments';
import { getProject, getProjectBranches } from '../api/projects';
import type { GitHubBranch, Project } from '../types/project';

const liveStatuses: DeploymentStatus[] = [
    'RUNNING',
    'PENDING',
    'CLONING',
    'BUILDING',
    'STARTING',
];

function getApplicationUrl(deployment: Deployment | undefined): string | null {
    if (deployment?.status !== 'RUNNING' || !deployment.application_url) {
        return null;
    }

    try {
        const url = new URL(deployment.application_url);
        if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password
        ) {
            return null;
        }

        const isLocalUrl = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        const currentHostIsLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (isLocalUrl && !currentHostIsLocal) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

function ProjectDetailsPage() {
    const { projectId = '' } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [branches, setBranches] = useState<GitHubBranch[]>([]);
    const [branch, setBranch] = useState('');
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedProjectId, setLoadedProjectId] = useState('');
    const [branchesError, setBranchesError] = useState('');
    const [deploymentsError, setDeploymentsError] = useState('');
    const [pageError, setPageError] = useState('');
    const [operationError, setOperationError] = useState<{ projectId: string; message: string } | null>(null);
    const [feedback, setFeedback] = useState<{ projectId: string; message: string } | null>(null);
    const [busyProjectId, setBusyProjectId] = useState('');
    const projectSequence = useRef(0);
    const liveRequestSequence = useRef(0);

    const refreshLiveDeployments = useCallback(async () => {
        const requestProjectId = projectId;
        const requestProjectSequence = projectSequence.current;
        const requestId = ++liveRequestSequence.current;
        try {
            const result = await getDeployments(requestProjectId, {
                page: 1,
                pageSize: 10,
                statuses: liveStatuses,
            });
            if (
                projectSequence.current !== requestProjectSequence ||
                liveRequestSequence.current !== requestId
            ) {
                return;
            }
            setDeployments(result.deployments);
            setDeploymentsError('');
        } catch (error) {
            if (
                projectSequence.current === requestProjectSequence &&
                liveRequestSequence.current === requestId
            ) {
                setDeploymentsError(error instanceof Error ? error.message : 'Could not refresh deployment status.');
            }
        }
    }, [projectId]);

    useEffect(() => {
        let cancelled = false;
        projectSequence.current += 1;

        async function loadProject() {
            try {
                const data = await getProject(projectId);
                if (cancelled) return;
                setProject(data);
                setPageError('');
                setBranch(data.default_branch);

                const [branchResult, deploymentResult] = await Promise.allSettled([
                    getProjectBranches(projectId),
                    getDeployments(projectId, {
                        page: 1,
                        pageSize: 10,
                        statuses: liveStatuses,
                    }),
                ]);
                if (cancelled) return;

                if (branchResult.status === 'fulfilled') {
                    setBranches(branchResult.value);
                    if (!branchResult.value.some((item) => item.name === data.default_branch)) {
                        setBranchesError('The project default branch was not returned by GitHub.');
                    } else {
                        setBranchesError('');
                    }
                } else {
                    setBranchesError(branchResult.reason instanceof Error
                        ? branchResult.reason.message
                        : 'Could not load repository branches.');
                }

                if (deploymentResult.status === 'fulfilled') {
                    setDeployments(deploymentResult.value.deployments);
                    setDeploymentsError('');
                } else {
                    setDeploymentsError(deploymentResult.reason instanceof Error
                        ? deploymentResult.reason.message
                        : 'Could not load deployment status.');
                }
            } catch (error) {
                if (!cancelled) {
                    if (error instanceof ApiRequestError && error.status === 404) {
                        setPageError('This project could not be found or is no longer active.');
                    } else {
                        setPageError(error instanceof Error ? error.message : 'Could not load this project.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoadedProjectId(projectId);
                    setLoading(false);
                }
            }
        }

        void loadProject();
        return () => {
            cancelled = true;
            projectSequence.current += 1;
            liveRequestSequence.current += 1;
        };
    }, [projectId]);

    const hasInProgressDeployment = deployments.some((deployment) =>
        isDeploymentInProgress(deployment.status),
    );

    useEffect(() => {
        if (!hasInProgressDeployment) return undefined;
        const interval = window.setInterval(() => {
            void refreshLiveDeployments();
        }, 5000);
        return () => window.clearInterval(interval);
    }, [hasInProgressDeployment, refreshLiveDeployments]);

    async function handleDeploy() {
        const requestProjectId = projectId;
        const requestProjectSequence = projectSequence.current;
        setBusyProjectId(requestProjectId);
        setOperationError(null);
        setFeedback(null);
        try {
            const deployment = await createDeployment(requestProjectId, branch);
            if (projectSequence.current !== requestProjectSequence) return;
            setDeployments((current) => [
                deployment,
                ...current.filter((item) => item.deployment_id !== deployment.deployment_id),
            ]);
            setFeedback({
                projectId: requestProjectId,
                message: 'Deployment request accepted. Status will refresh automatically while it runs.',
            });
            await refreshLiveDeployments();
        } catch (error) {
            if (projectSequence.current === requestProjectSequence) {
                setOperationError({
                    projectId: requestProjectId,
                    message: error instanceof Error ? error.message : 'Could not start the deployment.',
                });
                await refreshLiveDeployments();
            }
        } finally {
            if (projectSequence.current === requestProjectSequence) {
                setBusyProjectId('');
            }
        }
    }

    if (loading || loadedProjectId !== projectId) {
        return <div className="projects-state" role="status"><span className="loading-indicator" /><p>Opening project...</p></div>;
    }

    if (pageError || !project) {
        return (
            <section className="workflow-page">
                <div className="breadcrumb"><Link to="/projects">WORKSPACE / PROJECTS</Link></div>
                <div className="projects-state projects-state-error" role="alert">
                    <span className="state-symbol" aria-hidden="true">!</span>
                    <h2>Project unavailable</h2>
                    <p>{pageError || 'This project could not be loaded.'}</p>
                    <Link className="button button-secondary" to="/projects">Back to projects</Link>
                </div>
            </section>
        );
    }

    const runningDeployment = deployments.find((deployment) => deployment.status === 'RUNNING');
    const applicationUrl = getApplicationUrl(runningDeployment);

    return (
        <section className="workflow-page">
            <div className="breadcrumb">
                WORKSPACE <span>/</span> <Link to="/projects">PROJECTS</Link> <span>/</span> {project.project_name.toUpperCase()}
            </div>
            <header className="workflow-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> PROJECT OVERVIEW</p>
                    <h1>{project.project_name}</h1>
                    <p className="dashboard-subtitle">{project.repository_url}</p>
                </div>
                <Link className="button button-secondary" to="/projects">Back to projects</Link>
            </header>

            <div className="project-workspace-grid">
                <section className="project-config-card">
                    <div className="section-heading">
                        <div>
                            <h2>Project configuration</h2>
                            <p>Repository and runtime settings for this workspace.</p>
                        </div>
                    </div>
                    <dl className="project-config-list">
                        <div><dt>Repository</dt><dd>{project.repository_url.replace(/\.git$/, '').split('/').slice(-2).join('/')}</dd></div>
                        <div><dt>Repository URL</dt><dd><a href={project.repository_url} target="_blank" rel="noreferrer">{project.repository_url}</a></dd></div>
                        <div><dt>Default branch</dt><dd>{project.default_branch}</dd></div>
                        <div><dt>Container port</dt><dd>{project.container_port}</dd></div>
                        <div><dt>Project status</dt><dd className={project.is_active ? 'text-success' : 'text-muted'}>{project.is_active ? 'Active' : 'Inactive'}</dd></div>
                    </dl>

                    <div className="running-deployment">
                        <div className="running-deployment-heading">
                            <div>
                                <span className="section-caption">CURRENT APPLICATION</span>
                                <h3>{runningDeployment ? 'Running deployment' : 'No running deployment'}</h3>
                            </div>
                            {runningDeployment && (
                                <span className="deployment-status status-running">RUNNING</span>
                            )}
                        </div>
                        {runningDeployment ? (
                            <div className="running-deployment-content">
                                <p>
                                    Branch <strong>{runningDeployment.branch}</strong>
                                    {runningDeployment.commit_sha && <> · Commit <strong>{runningDeployment.commit_sha.slice(0, 10)}</strong></>}
                                </p>
                                {applicationUrl && (
                                    <a className="button button-primary visit-app-button" href={applicationUrl} target="_blank" rel="noopener noreferrer">
                                        Visit App <span aria-hidden="true">↗</span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p>{hasInProgressDeployment ? 'A deployment is in progress. The running application will appear here when the new deployment is ready.' : 'Deploy a branch to make an application available.'}</p>
                        )}
                        {deploymentsError && <p className="workflow-error" role="alert">{deploymentsError}</p>}
                    </div>
                </section>

                <section className="deploy-panel project-deploy-panel">
                    <div className="section-heading">
                        <div>
                            <h2>Deploy this project</h2>
                            <p>Select a repository branch to start a deployment.</p>
                        </div>
                        <span className="section-caption">MANUAL DEPLOY</span>
                    </div>
                    <label className="form-field deploy-branch-field">
                        <span>BRANCH</span>
                        <select value={branch} onChange={(event) => setBranch(event.target.value)} disabled={!branch}>
                            {branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                            {branches.length === 0 && <option value={project.default_branch}>{project.default_branch}</option>}
                        </select>
                    </label>
                    <button
                        className="button button-primary deploy-submit"
                        type="button"
                        disabled={!project.is_active || hasInProgressDeployment || busyProjectId === projectId || !branch}
                        onClick={() => void handleDeploy()}
                    >
                        {busyProjectId === projectId ? 'Starting…' : 'Deploy branch'}
                    </button>
                    {branchesError && <p className="workflow-note" role="status">{branchesError} Deploying the configured default branch remains available.</p>}
                    {operationError?.projectId === projectId && <p className="workflow-error" role="alert">{operationError.message}</p>}
                    {feedback?.projectId === projectId && <p className="workflow-success" role="status">{feedback.message}</p>}
                    <Link className="deployment-history-link" to={`/deployments?project_id=${encodeURIComponent(project.project_id)}`}>
                        View deployment history <span aria-hidden="true">→</span>
                    </Link>
                </section>
            </div>
        </section>
    );
}

export default ProjectDetailsPage;
