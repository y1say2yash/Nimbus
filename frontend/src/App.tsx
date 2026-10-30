
import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/use-auth.ts';
import CreateProjectPage from './pages/CreateProjectPage';
import DeploymentLogsPage from './pages/DeploymentLogsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import { GlobalDeploymentsPage } from './pages/DeploymentsPage';
import BuildLogsPage from './pages/BuildLogsPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';

function LeafMark({ size = 34 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M39 8C23 7 10 14 9 27c-.5 6 3.5 10 9 10C32 37 39 23 39 8Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M8 41C14 29 23 20 34 13M17 31l-1-9m9 1 7 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function Brand({ large = false }: { large?: boolean }) {
    return (
        <div className={`brand ${large ? 'brand-large' : ''}`}>
            <span className="brand-mark">
                <LeafMark size={large ? 42 : 30} />
            </span>
            <span className="brand-name">nimbus<span>.</span></span>
        </div>
    );
}

function LoadingScreen() {
    return (
        <main className="loading-screen">
            <div className="loading-brand">
                <Brand large />
                <span className="loading-indicator" />
            </div>
            <p>Preparing your workspace</p>
        </main>
    );
}

function LoginScreen() {
    return (
        <main className="login-page">
            <div className="login-topbar">
                <Brand />
                <span className="topbar-caption">SELF-HOSTED DEPLOYMENT</span>
            </div>

            <section className="login-content">
                <div className="login-copy">
                    <div className="eyebrow">
                        <span className="eyebrow-line" />
                        YOUR CODE. YOUR INFRASTRUCTURE.
                    </div>

                    <h1>
                        Deployment,
                        <br />
                        with a little
                        <br />
                        <span className="gold-text">magic.</span>
                    </h1>

                    <p className="login-description">
                        A quieter, more thoughtful way to ship your projects.
                        Connect GitHub, build with Docker, and deploy on
                        infrastructure you control.
                    </p>

                    <div className="login-divider" />

                    <div className="feature-list">
                        <div className="feature-item">
                            <span className="feature-icon">✳</span>
                            <div>
                                <strong>Born from GitHub</strong>
                                <span>Your repositories, one workspace.</span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">⌘</span>
                            <div>
                                <strong>Powered by Docker</strong>
                                <span>Build and run in containers.</span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">❧</span>
                            <div>
                                <strong>Always your own</strong>
                                <span>Self-hosted, under your control.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login-panel-wrap">
                    <div className="ornament ornament-top">✧</div>

                    <section className="login-panel">
                        <div className="panel-emblem">
                            <LeafMark size={48} />
                        </div>

                        <p className="panel-kicker">THE GATES ARE OPEN</p>
                        <h2>Welcome to Nimbus</h2>
                        <p className="panel-description">
                            Sign in with GitHub to enter your workspace.
                        </p>

                        <a
                            className="button button-primary github-button"
                            href="/api/v1/auth/github"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.7-1.48-2.48-.28-5.09-1.24-5.09-5.51 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.28-2.61 5.22-5.1 5.5.4.35.75 1.02.75 2.06v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
                            </svg>
                            Continue with GitHub
                            <span className="button-arrow">↗</span>
                        </a>

                        <div className="secure-note">
                            <span className="secure-dot" />
                            Secure authentication via GitHub OAuth
                        </div>

                        <div className="panel-rule">
                            <span />
                            <LeafMark size={16} />
                            <span />
                        </div>

                        <p className="panel-footnote">
                            A personal deployment platform, crafted with care.
                        </p>
                    </section>

                    <div className="ornament ornament-bottom">✧</div>
                </div>
            </section>

            <footer className="page-footer">
                <span>© {new Date().getFullYear()} Nimbus</span>
                <span className="footer-center">
                    <LeafMark size={14} /> BUILT FOR THE JOURNEY
                </span>
                <span>SELF-HOSTED · OPEN HORIZONS</span>
            </footer>
        </main>
    );
}

function DashboardScreen({
    user,
    logout,
}: {
    user: {
        avatar_url?: string | null;
        github_username: string;
        email?: string | null;
    };
    logout: () => Promise<void> | void;
}) {
    return (
        <main className="dashboard-page">
            <header className="app-topbar">
                <Brand />
                <div className="environment-label">
                    <span className="status-dot" />
                    LOCAL ENVIRONMENT
                </div>
            </header>

            <div className="dashboard-layout">
                <aside className="sidebar">
                    <p className="sidebar-label">WORKSPACE</p>
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-muted'}`}
                    >
                        <span className="sidebar-symbol" aria-hidden="true">◈</span>
                        Overview
                    </NavLink>
                    <NavLink
                        to="/projects"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-muted'}`}
                    >
                        <span className="sidebar-symbol" aria-hidden="true">◈</span>
                        Projects
                    </NavLink>
                    <NavLink
                        to="/deployments"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-muted'}`}
                    >
                        <span className="sidebar-symbol">⟳</span>
                        Deployments
                    </NavLink>
                    <NavLink
                        to="/build-logs"
                        className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-muted'}`}
                    >
                        <span className="sidebar-symbol">⌁</span>
                        Build logs
                    </NavLink>

                    <div className="sidebar-bottom">
                        <Link className="sidebar-account" to="/settings#account-profile" aria-label="View account and profile settings">
                            {user.avatar_url ? (
                                <img
                                    className="sidebar-avatar"
                                    src={user.avatar_url}
                                    alt=""
                                />
                            ) : (
                                <span className="sidebar-avatar avatar-fallback">
                                    {user.github_username.slice(0, 1).toUpperCase()}
                                </span>
                            )}

                            <div className="sidebar-account-info">
                                <strong>{user.github_username}</strong>
                                <span>{user.email || 'GitHub account'}</span>
                            </div>
                        </Link>

                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `sidebar-settings ${isActive ? 'sidebar-settings-active' : ''}`}
                        >
                            <span className="sidebar-symbol">⚙</span>
                            <span>Settings</span>
                        </NavLink>

                        <button
                            className="button button-quiet sidebar-signout"
                            type="button"
                            onClick={() => void logout()}
                        >
                            Sign out
                            <span aria-hidden="true">↗</span>
                        </button>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>
        </main>
    );
}

function NotFoundPage() {
    return (
        <section className="workflow-page">
            <div className="breadcrumb">WORKSPACE <span>/</span> NOT FOUND</div>
            <div className="projects-state">
                <span className="state-symbol" aria-hidden="true">?</span>
                <h2>This page is not part of the workspace</h2>
                <p>The address may be outdated, or the page may not exist.</p>
                <Link className="button button-primary" to="/">Return to overview</Link>
            </div>
        </section>
    );
}

function App() {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <LoginScreen />;
    }

    return (
        <Routes>
            <Route element={<DashboardScreen user={user} logout={logout} />}>
                <Route index element={<DashboardPage username={user.github_username} />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/new" element={<CreateProjectPage />} />
                <Route path="deployments" element={<GlobalDeploymentsPage />} />
                <Route path="build-logs" element={<BuildLogsPage />} />
                <Route path="settings" element={<SettingsPage user={user} logout={logout} />} />
                <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                <Route
                    path="projects/:projectId/deployments/:deploymentId/logs"
                    element={<DeploymentLogsPage />}
                />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}

export default App;
