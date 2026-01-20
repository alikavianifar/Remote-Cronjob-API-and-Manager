import { useState } from 'react';
import {
    Play,
    Pause,
    Trash2,
    Edit,
    Clock,
    Terminal,
    ChevronRight,
    FileText,
    MoreVertical
} from 'lucide-react';
import './JobList.css';

export default function JobList({
    jobs,
    loading,
    onEdit,
    onDelete,
    onRun,
    onToggle,
    onViewLogs,
    onCreateNew
}) {
    const [runningJobs, setRunningJobs] = useState(new Set());

    const handleRun = async (job) => {
        setRunningJobs(prev => new Set([...prev, job.id]));
        await onRun(job);
        setRunningJobs(prev => {
            const next = new Set(prev);
            next.delete(job.id);
            return next;
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatNextRun = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        const now = new Date();
        const diff = date - now;

        if (diff < 0) return 'Overdue';
        if (diff < 60000) return 'In a moment';
        if (diff < 3600000) return `In ${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `In ${Math.floor(diff / 3600000)}h`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="job-list">
                <div className="job-list-header">
                    <h2>Jobs</h2>
                </div>
                <div className="job-list-loading">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="job-card skeleton-card">
                            <div className="skeleton" style={{ width: '60%', height: '20px' }} />
                            <div className="skeleton" style={{ width: '80%', height: '16px', marginTop: '12px' }} />
                            <div className="skeleton" style={{ width: '40%', height: '16px', marginTop: '8px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="job-list">
            <div className="job-list-header">
                <div>
                    <h2>Scheduled Jobs</h2>
                    <p className="text-muted">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} configured</p>
                </div>
                <button className="btn btn-primary" onClick={onCreateNew}>
                    + New Job
                </button>
            </div>

            {jobs.length === 0 ? (
                <div className="job-list-empty">
                    <Clock size={48} className="empty-icon" />
                    <h3>No jobs configured</h3>
                    <p>Create your first cron job to get started</p>
                    <button className="btn btn-primary" onClick={onCreateNew}>
                        Create First Job
                    </button>
                </div>
            ) : (
                <div className="job-list-grid">
                    {jobs.map(job => (
                        <div key={job.id} className={`job-card ${job.status}`}>
                            <div className="job-card-header">
                                <div className="job-status">
                                    <span className={`status-dot ${job.status}`} />
                                    <span className={`badge badge-${job.status}`}>
                                        {job.status}
                                    </span>
                                </div>
                                <div className="job-actions">
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => onEdit(job)}
                                        title="Edit"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => onViewLogs(job)}
                                        title="View Logs"
                                    >
                                        <FileText size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => onDelete(job)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="job-card-body">
                                <h3 className="job-name">{job.name}</h3>
                                <div className="job-expression">
                                    <code>{job.expression}</code>
                                    <span className="job-expression-human">
                                        {job.expressionHuman || 'Custom schedule'}
                                    </span>
                                </div>
                                <div className="job-command">
                                    <Terminal size={14} />
                                    <code>{job.command}</code>
                                </div>
                                {job.description && (
                                    <p className="job-description">{job.description}</p>
                                )}
                            </div>

                            <div className="job-card-footer">
                                <div className="job-timing">
                                    <div className="job-timing-item">
                                        <span className="job-timing-label">Last run</span>
                                        <span className="job-timing-value">
                                            {formatDate(job.lastRun)}
                                            {job.lastExitCode === 0 && <span className="text-success"> ✓</span>}
                                            {job.lastExitCode > 0 && <span className="text-error"> ✗</span>}
                                        </span>
                                    </div>
                                    <div className="job-timing-item">
                                        <span className="job-timing-label">Next run</span>
                                        <span className="job-timing-value">{formatNextRun(job.nextRun)}</span>
                                    </div>
                                </div>

                                <div className="job-card-actions">
                                    <button
                                        className={`btn ${job.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={() => onToggle(job)}
                                        title={job.status === 'active' ? 'Pause' : 'Activate'}
                                    >
                                        {job.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                        {job.status === 'active' ? 'Pause' : 'Activate'}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleRun(job)}
                                        disabled={runningJobs.has(job.id)}
                                        title="Force Run"
                                    >
                                        {runningJobs.has(job.id) ? (
                                            <>
                                                <span className="loading-spinner" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play size={16} />
                                                Force Run
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
