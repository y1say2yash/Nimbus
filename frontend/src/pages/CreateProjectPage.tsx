import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiRequestError } from '../api/client';
import { createProject, getAvailableRepositories } from '../api/projects';
import type { GitHubRepository } from '../types/project';

function CreateProjectPage() {
    const navigate = useNavigate();
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [selectedRepositoryId, setSelectedRepositoryId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [defaultBranch, setDefaultBranch] = useState('');
    const [containerPort, setContainerPort] = useState('3000');
    const [loadingRepositories, setLoadingRepositories] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const selectedRepository = useMemo(
        () => repositories.find((repository) => String(repository.id) === selectedRepositoryId),
        [repositories, selectedRepositoryId],
    );

    function getSuggestedProjectName(repositoryName: string): string {
        return repositoryName
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/^[^a-zA-Z0-9]+/, '')
            .slice(0, 100) || 'project';
    }

    useEffect(() => {
        let cancelled = false;

        async function loadRepositories() {
            try {
                const available = await getAvailableRepositories();
                if (!cancelled) {
                    setRepositories(available);
                    if (available.length > 0) {
                        setSelectedRepositoryId(String(available[0].id));
                        setDefaultBranch(available[0].default_branch);
                        setProjectName(getSuggestedProjectName(available[0].name));
                    }
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Could not load GitHub repositories.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingRepositories(false);
                }
            }
        }

        void loadRepositories();
        return () => {
            cancelled = true;
        };
    }, []);

    function selectRepository(repositoryId: string) {
        const repository = repositories.find((item) => String(item.id) === repositoryId);
        setSelectedRepositoryId(repositoryId);
        setDefaultBranch(repository?.default_branch ?? '');
        setProjectName(repository ? getSuggestedProjectName(repository.name) : '');
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedRepository || submitting) {
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const project = await createProject({
                project_name: projectName.trim(),
                repository_url: selectedRepository.html_url,
                github_repository_id: selectedRepository.id,
                default_branch: defaultBranch.trim(),
                container_port: Number(containerPort),
            });
            navigate(`/projects/${encodeURIComponent(project.project_id)}`);
        } catch (submitError) {
            if (submitError instanceof ApiRequestError && submitError.status === 409) {
                setError(submitError.message);
            } else {
                setError(
                    submitError instanceof Error
                        ? submitError.message
                        : 'Could not create the project.',
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="workflow-page">
            <div className="breadcrumb">
                WORKSPACE <span>/</span> <Link to="/projects">PROJECTS</Link> <span>/</span> NEW
            </div>

            <header className="workflow-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</p>
                    <h1>Bring a repository in.</h1>
                    <p className="dashboard-subtitle">
                        Choose a GitHub repository and configure its first deployment target.
                    </p>
                </div>
                <Link className="button button-secondary" to="/projects">Back to projects</Link>
            </header>

            {loadingRepositories ? (
                <div className="projects-state" role="status">
                    <span className="loading-indicator" />
                    <p>Discovering your GitHub repositories...</p>
                </div>
            ) : error && repositories.length === 0 ? (
                <div className="projects-state projects-state-error" role="alert">
                    <span className="state-symbol" aria-hidden="true">!</span>
                    <h2>Repositories unavailable</h2>
                    <p>{error}</p>
                    <Link className="button button-secondary" to="/projects">Return to projects</Link>
                </div>
            ) : repositories.length === 0 ? (
                <div className="projects-state projects-empty">
                    <div className="empty-emblem" aria-hidden="true">✧</div>
                    <p className="panel-kicker">NO REPOSITORIES FOUND</p>
                    <h2>Your GitHub account has no available repositories</h2>
                    <p>Repositories you own or can access will appear here after GitHub grants access.</p>
                    <Link className="button button-secondary" to="/projects">Back to projects</Link>
                </div>
            ) : (
                <form className="workflow-form" onSubmit={(event) => void handleSubmit(event)}>
                    <label className="form-field">
                        <span>GITHUB REPOSITORY</span>
                        <select
                            value={selectedRepositoryId}
                            onChange={(event) => selectRepository(event.target.value)}
                            required
                        >
                            {repositories.map((repository) => (
                                <option key={repository.id} value={repository.id}>
                                    {repository.owner.login}/{repository.name}
                                    {repository.private ? ' · Private' : ''}
                                </option>
                            ))}
                        </select>
                        {selectedRepository && (
                            <small>
                                {selectedRepository.owner.login}/{selectedRepository.name}
                                {' · '}
                                {selectedRepository.private ? 'Private' : 'Public'}
                            </small>
                        )}
                    </label>

                    <label className="form-field">
                        <span>PROJECT NAME</span>
                        <input
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            minLength={1}
                            maxLength={100}
                            pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*"
                            title="Use letters, numbers, hyphens, and underscores; start with a letter or number."
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>DEFAULT BRANCH</span>
                        <input
                            value={defaultBranch}
                            onChange={(event) => setDefaultBranch(event.target.value)}
                            maxLength={255}
                            required
                        />
                        <small>Starts with the default branch reported by GitHub. The API verifies that the branch exists.</small>
                    </label>

                    <label className="form-field">
                        <span>CONTAINER PORT</span>
                        <input
                            type="number"
                            min={1}
                            max={65535}
                            step={1}
                            value={containerPort}
                            onChange={(event) => setContainerPort(event.target.value)}
                            required
                        />
                        <small>The port your application listens on inside its container.</small>
                    </label>

                    {error && <p className="workflow-error" role="alert">{error}</p>}

                    <div className="workflow-actions">
                        <Link className="button button-quiet" to="/projects">Cancel</Link>
                        <button className="button button-primary" type="submit" disabled={submitting || !selectedRepository}>
                            {submitting ? 'Creating project…' : 'Create project'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export default CreateProjectPage;
