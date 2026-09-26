import { useAuth } from './auth/use-auth.ts';

function App() {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return <main>Loading...</main>;
    }

    if (!user) {
        return (
            <main>
                <h1>Nimbus</h1>
                <p>Self-hosted Continuous Deployment Platform</p>

                <a href="/api/v1/auth/github">
                    Login with GitHub
                </a>
            </main>
        );
    }

    return (
        <main>
            <h1>Welcome to Nimbus</h1>

            {user.avatar_url && (
                <img
                    src={user.avatar_url}
                    alt={user.github_username}
                    width={64}
                    height={64}
                />
            )}

            <p>GitHub: {user.github_username}</p>
            <p>Email: {user.email}</p>

            <button type="button" onClick={() => void logout()}>
                Logout
            </button>
        </main>
    );
}

export default App;