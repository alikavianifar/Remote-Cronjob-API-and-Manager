import { useCallback, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from './components/Header';
import JobList from './components/JobList';
import JobForm from './components/JobForm';
import LogViewer from './components/LogViewer';
import Login from './components/Login';
import { ToastProvider, useToast } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { useEscapeKey } from './hooks/useEscapeKey';
import { useJobs } from './hooks/useJobs';
import { errorMessage, utilAPI } from './services/api';
import './App.css';

function DeleteConfirm({ job, onCancel, onConfirm }) {
    useEscapeKey(onCancel);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal delete-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <h3>Delete Job?</h3>
                    <p>Are you sure you want to delete "{job.name}"? This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    const toast = useToast();
    const { user, logout } = useAuth();
    const { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob, runJob, toggleJob } = useJobs();

    const [showForm, setShowForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [logJob, setLogJob] = useState(null);
    const [jobToDelete, setJobToDelete] = useState(null);

    const closeForm = useCallback(() => {
        setShowForm(false);
        setEditingJob(null);
    }, []);
    const closeLogs = useCallback(() => setLogJob(null), []);
    const cancelDelete = useCallback(() => setJobToDelete(null), []);

    const handleCreateNew = () => {
        setEditingJob(null);
        setShowForm(true);
    };

    const handleEdit = (job) => {
        setEditingJob(job);
        setShowForm(true);
    };

    const handleSave = async (jobData) => {
        const result = editingJob ? await updateJob(editingJob.id, jobData) : await createJob(jobData);
        if (result.success) {
            toast.success(editingJob ? 'Job updated successfully' : 'Job created successfully');
            closeForm();
        } else {
            toast.error(result.error);
        }
        return result;
    };

    const confirmDelete = async () => {
        const result = await deleteJob(jobToDelete.id);
        if (result.success) toast.success('Job deleted successfully');
        else toast.error(result.error);
        setJobToDelete(null);
    };

    const handleRun = async (job) => {
        const result = await runJob(job.id);
        if (!result.success) return toast.error(result.error);

        const { exitCode, timedOut } = result.data;
        if (exitCode === 0) toast.success(`Job "${job.name}" finished successfully`);
        else if (timedOut) toast.warning(`Job "${job.name}" timed out and was stopped`);
        else toast.warning(`Job "${job.name}" finished with exit code ${exitCode}`);
    };

    const handleToggle = async (job) => {
        const result = await toggleJob(job.id);
        if (result.success) toast.success(`Job "${job.name}" ${result.data.status === 'active' ? 'activated' : 'paused'}`);
        else toast.error(result.error);
    };

    const handleTest = async () => {
        try {
            toast.info('Running system self-test...');
            const result = await utilAPI.selfTest();
            const { passed, total } = result.summary;
            if (result.success) toast.success(`Self-test passed: ${passed}/${total} checks`);
            else toast.error(`Self-test failed: ${result.tests.filter((t) => !t.passed).map((t) => t.name).join(', ')}`);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to run self-test'));
        }
    };

    return (
        <div className="app">
            <Header user={user} onLogout={logout} onTest={handleTest} />

            <main className="main-content">
                {error && (
                    <div className="app-error" role="alert">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                        <button className="btn btn-secondary" onClick={fetchJobs}>
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    </div>
                )}
                <JobList
                    jobs={jobs}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={setJobToDelete}
                    onRun={handleRun}
                    onToggle={handleToggle}
                    onViewLogs={setLogJob}
                    onCreateNew={handleCreateNew}
                />
            </main>

            {showForm && <JobForm job={editingJob} onSave={handleSave} onClose={closeForm} />}
            {logJob && <LogViewer job={logJob} onClose={closeLogs} />}
            {jobToDelete && <DeleteConfirm job={jobToDelete} onCancel={cancelDelete} onConfirm={confirmDelete} />}
        </div>
    );
}

export default function App() {
    const { isAuthenticated, login } = useAuth();

    if (!isAuthenticated) return <Login onLogin={login} />;

    return (
        <ToastProvider>
            <Dashboard />
        </ToastProvider>
    );
}
