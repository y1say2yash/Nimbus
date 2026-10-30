import type { AuthUser } from '../auth/auth-types';

const repositoryUrl = 'https://github.com/y1say2yash/Nimbus';
const documentationUrl = `${repositoryUrl}/blob/main/docs`;

const resourceLinks = [
    { title: 'Nimbus repository', description: 'Source code and project history', href: repositoryUrl, icon: '⌘' },
    { title: 'Documentation overview', description: 'Browse project guides and references', href: `${repositoryUrl}/tree/main/docs`, icon: '▤' },
    { title: 'System architecture', description: 'Components and system boundaries', href: `${documentationUrl}/00-project-foundation/02-system-architecture.md`, icon: '⌘' },
    { title: 'Technology stack', description: 'Frameworks and infrastructure', href: `${documentationUrl}/00-project-foundation/03-technology-stack.md`, icon: '◈' },
    { title: 'Database & data model', description: 'Entities and relationships', href: `${documentationUrl}/01-system-specification/06-data-model.md`, icon: '▧' },
    { title: 'API design', description: 'Routes, conventions, and responses', href: `${documentationUrl}/01-system-specification/07-api-design.md`, icon: '⇄' },
    { title: 'Development guide', description: 'Local development workflow', href: `${documentationUrl}/02-engineering/09-development-guide.md`, icon: '⌁' },
];

const technologyGroups = [
    { label: 'FRONTEND', technologies: ['React', 'TypeScript', 'Vite'] },
    { label: 'BACKEND', technologies: ['Node.js', 'Express'] },
    { label: 'DATA', technologies: ['PostgreSQL', 'Knex.js'] },
    { label: 'INFRASTRUCTURE', technologies: ['Docker', 'Nginx'] },
];

function GitHubMark() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.7-1.48-2.48-.28-5.09-1.24-5.09-5.51 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.28-2.61 5.22-5.1 5.5.4.35.75 1.02.75 2.06v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
        </svg>
    );
}

function SettingsPage({
    user,
    logout,
}: {
    user: AuthUser;
    logout: () => Promise<void> | void;
}) {
    const environment = import.meta.env.MODE === 'production' ? 'Production build' : 'Development build';

    return (
        <section className="settings-page">
            <div className="breadcrumb">WORKSPACE <span>/</span> SETTINGS</div>
            <header className="settings-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> WORKSPACE</p>
                    <h1>Settings</h1>
                    <p className="dashboard-subtitle">View your connected account, project resources, and Nimbus environment.</p>
                </div>
            </header>

            <section className="settings-section" id="account-profile" aria-labelledby="account-profile-title">
                <div className="settings-section-heading">
                    <div>
                        <h2 id="account-profile-title">Account &amp; integrations</h2>
                        <p>Your GitHub identity and connection used by Nimbus.</p>
                    </div>
                </div>
                <div className="settings-account-grid">
                    <article className="settings-card settings-profile-card">
                        <div className="settings-card-title">
                            <h3>Profile information</h3>
                            <span className="settings-status"><i /> Connected</span>
                        </div>
                        <div className="settings-profile-summary">
                            {user.avatar_url ? (
                                <img className="settings-avatar" src={user.avatar_url} alt={`${user.github_username}'s GitHub avatar`} />
                            ) : (
                                <span className="settings-avatar avatar-fallback" aria-hidden="true">
                                    {user.github_username.slice(0, 1).toUpperCase()}
                                </span>
                            )}
                            <div>
                                <strong>{user.github_username}</strong>
                                <span>GitHub account</span>
                            </div>
                        </div>
                        <dl className="settings-detail-grid">
                            <div>
                                <dt>EMAIL</dt>
                                <dd>{user.email || 'Not provided by GitHub'}</dd>
                            </div>
                            <div>
                                <dt>GITHUB ACCOUNT ID</dt>
                                <dd>{user.github_id}</dd>
                            </div>
                        </dl>
                        <p className="settings-card-note">Profile details are managed by GitHub and cannot be edited in Nimbus.</p>
                    </article>

                    <article className="settings-card settings-github-card">
                        <div className="settings-card-title">
                            <h3>GitHub integration</h3>
                            <span className="settings-status"><i /> Connected</span>
                        </div>
                        <div className="settings-github-summary">
                            <span className="settings-github-icon"><GitHubMark /></span>
                            <div>
                                <strong>GitHub</strong>
                                <span>Connected as <b>{user.github_username}</b></span>
                            </div>
                        </div>
                        <p className="settings-card-description">
                            Nimbus uses GitHub for account authentication, repository and branch discovery, and operations required to deploy your projects.
                        </p>
                        <div className="settings-card-action">
                            <span>To switch accounts, sign out and authenticate through GitHub again.</span>
                            <button className="button button-secondary" type="button" onClick={() => void logout()}>
                                Sign out
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            <section className="settings-section" aria-labelledby="project-resources-title">
                <div className="settings-section-heading">
                    <div>
                        <h2 id="project-resources-title">Project resources</h2>
                        <p>Quick links to Nimbus source code and existing project documentation.</p>
                    </div>
                </div>
                <div className="settings-resource-grid">
                    {resourceLinks.map((resource) => (
                        <a
                            className="settings-resource-card"
                            href={resource.href}
                            key={resource.title}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="settings-resource-icon" aria-hidden="true">{resource.icon}</span>
                            <span className="settings-resource-copy">
                                <strong>{resource.title}</strong>
                                <small>{resource.description}</small>
                            </span>
                            <span className="settings-external-mark" aria-hidden="true">↗</span>
                        </a>
                    ))}
                </div>
            </section>

            <section className="settings-section" aria-labelledby="application-overview-title">
                <div className="settings-section-heading">
                    <div>
                        <h2 id="application-overview-title">Application overview</h2>
                        <p>Runtime context and core technologies powering this Nimbus workspace.</p>
                    </div>
                </div>
                <article className="settings-card settings-application-card">
                    <div className="settings-application-intro">
                        <span className="settings-app-mark" aria-hidden="true">N</span>
                        <div>
                            <div className="settings-app-title">
                                <h3>Nimbus</h3>
                                <span className="settings-environment"><i />{environment}</span>
                            </div>
                            <p>A self-hosted deployment platform for connecting GitHub repositories, building Docker images, and deploying applications on infrastructure you control.</p>
                        </div>
                    </div>
                    <div className="settings-technology-groups">
                        {technologyGroups.map((group) => (
                            <div className="settings-technology-group" key={group.label}>
                                <span>{group.label}</span>
                                <div>
                                    {group.technologies.map((technology) => (
                                        <span className="settings-tech-tag" key={technology}>{technology}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="settings-app-note">Environment reflects the frontend build mode. No application version or live health status is exposed by the current frontend configuration.</p>
                </article>
            </section>
        </section>
    );
}

export default SettingsPage;
