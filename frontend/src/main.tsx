import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

function App() {
    return (
        <main>
            <h1>Nimbus</h1>
            <p>Self-hosted Continuous Deployment Platform</p>
        </main>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);