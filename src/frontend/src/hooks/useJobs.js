import { useCallback, useEffect, useState } from 'react';
import { errorMessage, jobsAPI } from '../services/api';

/** Wraps an API call so every action resolves to { success, data?, error?, details? }. */
async function attempt(call, fallbackMessage) {
    try {
        const response = await call();
        return response.success ? { success: true, data: response.data } : { success: false, error: fallbackMessage };
    } catch (err) {
        return { success: false, error: errorMessage(err, fallbackMessage), details: err.response?.data?.details };
    }
}

/** Jobs state and the actions that change it. */
export function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await attempt(() => jobsAPI.getAll(), 'Failed to load jobs');
        if (result.success) setJobs(result.data);
        else setError(result.error);
        setLoading(false);
    }, []);

    const replaceJob = (updated) => setJobs((prev) => prev.map((job) => (job.id === updated.id ? updated : job)));

    const createJob = async (jobData) => {
        const result = await attempt(() => jobsAPI.create(jobData), 'Failed to create job');
        if (result.success) setJobs((prev) => [...prev, result.data]);
        return result;
    };

    const updateJob = async (id, jobData) => {
        const result = await attempt(() => jobsAPI.update(id, jobData), 'Failed to update job');
        if (result.success) replaceJob(result.data);
        return result;
    };

    const deleteJob = async (id) => {
        const result = await attempt(() => jobsAPI.delete(id), 'Failed to delete job');
        if (result.success) setJobs((prev) => prev.filter((job) => job.id !== id));
        return result;
    };

    const toggleJob = async (id) => {
        const result = await attempt(() => jobsAPI.toggle(id), 'Failed to change job status');
        if (result.success) replaceJob(result.data);
        return result;
    };

    const runJob = async (id) => {
        const result = await attempt(() => jobsAPI.run(id), 'Failed to run job');
        if (result.success) {
            setJobs((prev) =>
                prev.map((job) =>
                    job.id === id ? { ...job, lastRun: result.data.completedAt, lastExitCode: result.data.exitCode } : job
                )
            );
        }
        return result;
    };

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob, runJob, toggleJob };
}
