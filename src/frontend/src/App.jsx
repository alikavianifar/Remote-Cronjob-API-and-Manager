import { useState } from 'react';
import Header from './components/Header';
import JobList from './components/JobList';
import JobForm from './components/JobForm';
import LogViewer from './components/LogViewer';
import Login from './components/Login';
import { ToastProvider, useToast } from './components/Toast';
import { useJobs, useAuth } from './hooks/useJobs';
import { utilAPI } from './services/api';
import './App.css';

function Dashboard() {
    const toast = useToast();
    const { user, logout } = useAuth();
    const {
        jobs,
        loading,
        error,
        fetchJobs,
        createJob,
        updateJob,
        deleteJob,
        runJob,
        toggleJob
    } = useJobs();

    const [showForm, setShowForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [showLogs, setShowLogs] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const handleCreateNew = () => {
        setEditingJob(null);
        setShowForm(true);
    };

    const handleEdit = (job) => {
        setEditingJob(job);
        setShowForm(true);
    };

    const handleSave = async (jobData) => {
        let result;
        if (editingJob) {
            result = await updateJob(editingJob.id, jobData);
        } else {
            result = await createJob(jobData);
        }

        if (result.success) {
            toast.success(editingJob ? 'Job updated successfully' : 'Job created successfully');
            setShowForm(false);
            setEditingJob(null);
        } else {
            toast.error(result.error || 'Failed to save job');
        }

        return result;
    };

    const handleDelete = (job) => {
        setShowDeleteConfirm(job);
    };

    const confirmDelete = async () => {
        if (!showDeleteConfirm) return;

        const result = await deleteJob(showDeleteConfirm.id);
        if (result.success) {
            toast.success('Job deleted successfully');
        } else {
            toast.error(result.error || 'Failed to delete job');
        }
        setShowDeleteConfirm(null);
    };

    const handleRun = async (job) => {
        const result = await runJob(job.id);
        if (result.success) {
            toast.success(`Job "${job.name}" executed successfully`);
        } else {
            toast.error(result.error || 'Failed to run job');
        }
    };

    const handleToggle = async (job) => {
        const result = await toggleJob(job.id);
        if (result.success) {
            toast.success(`Job "${job.name}" ${result.data.status === 'active' ? 'activated' : 'paused'}`);
        } else {
            toast.error(result.error || 'Failed to toggle job');
        }
    };

    const handleViewLogs = (job) => {
        setSelectedJob(job);
        setShowLogs(true);
    };

    const handleTest = async () => {
        try {
            toast.info('Running system self-test...');
            const result = await utilAPI.selfTest();
            if (result.success) {
                toast.success(`Self-test passed: ${result.summary.passed}/${result.summary.total} tests`);
            } else {
                toast.error(`Self-test failed: ${result.summary.failed} tests failed`);
            }
        } catch (err) {
            toast.error('Failed to run self-test');
        }
    };

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    return (
        <div className="app">
            <Header user={user} onLogout={handleLogout} onTest={handleTest} />

            <main className="main-content">
                <JobList
                    jobs={jobs}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRun={handleRun}
                    onToggle={handleToggle}
                    onViewLogs={handleViewLogs}
                    onCreateNew={handleCreateNew}
                />
            </main>

            {showForm && (
                <JobForm
                    job={editingJob}
                    onSave={handleSave}
                    onClose={() => {
                        setShowForm(false);
                        setEditingJob(null);
                    }}
                />
            )}

            {showLogs && selectedJob && (
                <LogViewer
                    job={selectedJob}
                    onClose={() => {
                        setShowLogs(false);
                        setSelectedJob(null);
                    }}
                />
            )}

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-body">
                            <h3>Delete Job?</h3>
                            <p>Are you sure you want to delete "{showDeleteConfirm.name}"? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={confirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function App() {
    const { isAuthenticated, loading, login } = useAuth();

    if (loading) {
        return (
            <div className="app-loading">
                <span className="loading-spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLogin={login} />;
    }

    return (
        <ToastProvider>
            <Dashboard />
        </ToastProvider>
    );
}

export default App;
