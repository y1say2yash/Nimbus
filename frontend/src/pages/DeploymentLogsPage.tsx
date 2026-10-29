import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getDeploymentLogs, type DeploymentLogs } from '../api/deployments';

function DeploymentLogsPage() {
    const { projectId = '', deploymentId = '' } = useParams();
    const [result, setResult] = useState<DeploymentLogs | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState('');
    const requestKey = `${projectId}/${deploymentId}`;
    const requestSequence = useRef(0);

    const loadLogs = useCallback(async () => {
        const requestId = ++requestSequence.current;
        try {
            const data = await getDeploymentLogs(projectId, deploymentId);
            if (requestId === requestSequence.current) {
                setResult(data);
                setError('');
                setLoadedKey(requestKey);
            }
        } catch (loadError) {
            if (requestId === requestSequence.current) {
                setError(loadError instanceof Error ? loadError.message : 'Could not load deployment logs.');
                setLoadedKey(requestKey);
            }
        } finally {
            if (requestId === requestSequence.current) {
                setLoading(false);
            }
        }
    }, [projectId, deploymentId, requestKey]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadLogs();
        }, 0);
        return () => {
            window.clearTimeout(timer);
            requestSequence.current += 1;
        };
    }, [loadLogs]);

    return (
        <section className="workflow-page">
            <div className="breadcrumb">
                WORKSPACE <span>/</span> <Link to={`/deployments?project_id=${encodeURIComponent(projectId)}`}>DEPLOYMENTS</Link>
                <span>/</span> LOGS
            </div>
            <header className="workflow-heading">
                <div>
                    <p className="eyebrow"><span className="eyebrow-line" /> DEPLOYMENT</p>
                    <h1>Combined deployment logs</h1>
                    <p className="dashboard-subtitle">Deployment {deploymentId}</p>
                </div>
                <div className="workflow-actions">
                    <Link className="button button-secondary" to={`/deployments?project_id=${encodeURIComponent(projectId)}`}>Back to deployments</Link>
                    <button className="button button-primary" type="button" onClick={() => { setLoading(true); setError(''); void loadLogs(); }} disabled={loading}>
                        {loading ? 'Refreshing…' : 'Refresh logs'}
                    </button>
                </div>
            </header>

            {loadedKey === requestKey && error ? (
                <div className="projects-state projects-state-error" role="alert">
                    <span className="state-symbol" aria-hidden="true">!</span>
                    <h2>Logs unavailable</h2>
                    <p>{error}</p>
                    <button className="button button-secondary" type="button" onClick={() => { setLoading(true); setError(''); void loadLogs(); }}>Try again</button>
                </div>
            ) : loading || loadedKey !== requestKey ? (
                <div className="projects-state" role="status"><span className="loading-indicator" /><p>Loading deployment logs...</p></div>
            ) : (
                <section className="log-panel" aria-label="Combined deployment log output">
                    <div className="log-panel-heading">
                        <span>DEPLOYMENT ACTIVITY</span>
                        <span>{result?.logs ? `${result.logs.split('\n').length} lines` : 'No output'}</span>
                    </div>
                    {result?.logs ? (
                        <pre>{result.logs}</pre>
                    ) : (
                        <p className="log-empty">No deployment log output is available yet.</p>
                    )}
                </section>
            )}
        </section>
    );
}

export default DeploymentLogsPage;
