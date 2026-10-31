import { useCallback, useEffect, useState } from 'react';
import { X, Terminal, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { errorMessage, jobsAPI } from '../services/api';
import './LogViewer.css';

export default function LogViewer({ job, onClose }) {
    const PAGE_SIZE = 20;
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [expandedLogs, setExpandedLogs] = useState(new Set());

    useEscapeKey(onClose);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await jobsAPI.getLogs(job.id, PAGE_SIZE, 0);
            setLogs(response.data);
            setTotal(response.pagination.total);
        } catch (err) {
            setError(errorMessage(err, 'Failed to load logs'));
        } finally {
            setLoading(false);
        }
    }, [job.id]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const response = await jobsAPI.getLogs(job.id, PAGE_SIZE, logs.length);
            setLogs((prev) => [...prev, ...response.data]);
            setTotal(response.pagination.total);
        } catch (err) {
            setError(errorMessage(err, 'Failed to load more logs'));
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const toggleExpand = (logId) => {
        setExpandedLogs(prev => {
            const next = new Set(prev);
            if (next.has(logId)) {
                next.delete(logId);
            } else {
                next.add(logId);
            }
            return next;
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDuration = (ms) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal log-viewer-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Execution Logs</h2>
                        <p className="text-muted">{job.name}</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={fetchLogs}
                            title="Refresh"
                            aria-label="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="modal-body log-viewer-body">
                    {loading ? (
                        <div className="log-loading">
                            <span className="loading-spinner" />
                            <span>Loading logs...</span>
                        </div>
                    ) : error ? (
                        <div className="log-empty">
                            <XCircle size={40} />
                            <h3>{error}</h3>
                            <button className="btn btn-secondary" onClick={fetchLogs}>Try again</button>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="log-empty">
                            <Terminal size={40} />
                            <h3>No execution logs yet</h3>
                            <p>Runs started with "Force Run" are recorded here. Runs started by cron itself are not captured.</p>
                        </div>
                    ) : (
                        <div className="log-list">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className={`log-entry ${log.exitCode === 0 ? 'success' : 'error'}`}
                                >
                                    <div
                                        className="log-entry-header"
                                        onClick={() => toggleExpand(log.id)}
                                    >
                                        <div className="log-status">
                                            {log.exitCode === 0 ? (
                                                <CheckCircle size={18} className="text-success" />
                                            ) : (
                                                <XCircle size={18} className="text-error" />
                                            )}
                                        </div>
                                        <div className="log-info">
                                            <div className="log-date">{formatDate(log.executedAt)}</div>
                                            <div className="log-meta">
                                                <span>Duration: {formatDuration(log.duration)}</span>
                                                <span>Exit: {log.exitCode}</span>
                                                {log.timedOut && <span className="text-error">Timed out</span>}
                                                <span className={`badge badge-${log.triggeredBy === 'manual' ? 'info' : 'active'}`}>
                                                    {log.triggeredBy}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="log-expand">
                                            {expandedLogs.has(log.id) ? '▼' : '▶'}
                                        </div>
                                    </div>

                                    {expandedLogs.has(log.id) && (
                                        <div className="log-details">
                                            <div className="log-output">
                                                <div className="log-output-label">stdout</div>
                                                <pre className="log-output-content">
                                                    {log.stdout || '(empty)'}
                                                </pre>
                                            </div>
                                            {log.stderr && (
                                                <div className="log-output error">
                                                    <div className="log-output-label">stderr</div>
                                                    <pre className="log-output-content">
                                                        {log.stderr}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {logs.length < total && (
                                <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading...' : `Load more (${total - logs.length} remaining)`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
