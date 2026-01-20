import { useState, useEffect } from 'react';
import { X, Terminal, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { jobsAPI } from '../services/api';
import './LogViewer.css';

export default function LogViewer({ job, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState(new Set());

    useEffect(() => {
        fetchLogs();
    }, [job.id]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await jobsAPI.getLogs(job.id);
            if (response.success) {
                setLogs(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

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
            <div className="modal log-viewer-modal" onClick={e => e.stopPropagation()}>
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
                        >
                            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={onClose}>
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
                    ) : logs.length === 0 ? (
                        <div className="log-empty">
                            <Terminal size={40} />
                            <h3>No execution logs yet</h3>
                            <p>Run the job to see execution logs here</p>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
