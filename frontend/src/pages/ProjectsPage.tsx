
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../api/projects';
import type { Project } from '../types/project';

function getRepositoryName(url: string): string {
    return url.replace(/\.git$/, '').split('/').slice(-2).join('/');
}

function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadProjects = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await getProjects();
            setProjects(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load projects.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadProjects();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadProjects]);

    return (
        <section className="projects-page">
            <div className="breadcrumb">
                WORKSPACE <span>/</span> PROJECTS
            </div>

            <header className="projects-heading">
                <div>
                    <p className="eyebrow">
                        <span className="eyebrow-line" />
                        YOUR WORKSPACE
                    </p>
                    <h1>Projects</h1>
                    <p className="dashboard-subtitle">
                        Your repositories, ready for the journey from code to
                        deployment.
                    </p>
                </div>

            </header>

            <div className="projects-toolbar">
                <div>
                    <span className="section-caption">YOUR REPOSITORIES</span>
                    <p>{loading ? 'Gathering your projects...' : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}</p>
                </div>
                <div className="projects-toolbar-actions">
                    <Link className="button button-primary" to="/projects/new">
                        <span aria-hidden="true">+</span>
                        New project
                    </Link>
                    <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void loadProjects()}
                        disabled={loading}
                    >
                        <span aria-hidden="true">↻</span>
                        Refresh
                    </button>
                </div>
            </div>

            {loading && (
                <div className="projects-state" role="status">
                    <span className="loading-indicator" />
                    <p>Opening the workspace...</p>
                </div>
            )}

            {!loading && error && (
                <div className="projects-state projects-state-error" role="alert">
                    <span className="state-symbol" aria-hidden="true">
                        !
                    </span>
                    <h2>Could not load projects</h2>
                    <p>{error}</p>
                    <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void loadProjects()}
                    >
                        Try again
                    </button>
                </div>
            )}

            {!loading && !error && projects.length === 0 && (
                <div className="projects-state projects-empty">
                    <div className="empty-emblem" aria-hidden="true">
                        ✧
                    </div>
                    <p className="panel-kicker">A NEW CHAPTER</p>
                    <h2>Your workspace awaits</h2>
                    <p>
                        Connect a GitHub repository to create your first Nimbus
                        project. Your deployments will appear here as your
                        journey unfolds.
                    </p>
                    <Link className="button button-primary" to="/projects/new">
                        <span aria-hidden="true">+</span>
                        Create your first project
                    </Link>
                </div>
            )}

            {!loading && !error && projects.length > 0 && (
                <div className="projects-grid">
                    {projects.map((project) => (
                        <article
                            className="project-card"
                            key={project.project_id}
                        >
                            <div className="project-card-top">
                                <div className="project-icon" aria-hidden="true">
                                    ◈
                                </div>
                                <span
                                    className={`project-status ${project.is_active
                                            ? 'project-status-active'
                                            : 'project-status-inactive'
                                        }`}
                                >
                                    <span className="status-dot" />
                                    {project.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>

                            <h2>{project.project_name}</h2>
                            <p className="project-repository">
                                {getRepositoryName(project.repository_url)}
                            </p>

                            <div className="project-card-details">
                                <div>
                                    <span>DEFAULT BRANCH</span>
                                    <strong>
                                        <span aria-hidden="true">⑂ </span>
                                        {project.default_branch}
                                    </strong>
                                </div>
                                <div>
                                    <span>CONTAINER PORT</span>
                                    <strong>{project.container_port}</strong>
                                </div>
                            </div>

                            <Link
                                className="project-card-link"
                                to={`/projects/${encodeURIComponent(project.project_id)}`}
                            >
                                View project
                                <span aria-hidden="true">↗</span>
                            </Link>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default ProjectsPage;
