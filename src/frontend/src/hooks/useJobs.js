import { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '../services/api';

/**
 * Custom hook for managing jobs state
 */
export function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobsAPI.getAll();
            if (response.success) {
                setJobs(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    }, []);

    const createJob = async (jobData) => {
        try {
            const response = await jobsAPI.create(jobData);
            if (response.success) {
                setJobs(prev => [...prev, response.data]);
                return { success: true, data: response.data };
            }
            return { success: false, error: 'Failed to create job' };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to create job',
                details: err.response?.data?.details
            };
        }
    };

    const updateJob = async (id, jobData) => {
        try {
            const response = await jobsAPI.update(id, jobData);
            if (response.success) {
                setJobs(prev => prev.map(job =>
                    job.id === id ? { ...job, ...response.data } : job
                ));
                return { success: true, data: response.data };
            }
            return { success: false, error: 'Failed to update job' };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to update job',
                details: err.response?.data?.details
            };
        }
    };

    const deleteJob = async (id) => {
        try {
            const response = await jobsAPI.delete(id);
            if (response.success) {
                setJobs(prev => prev.filter(job => job.id !== id));
                return { success: true };
            }
            return { success: false, error: 'Failed to delete job' };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to delete job'
            };
        }
    };

    const runJob = async (id) => {
        try {
            const response = await jobsAPI.run(id);
            if (response.success) {
                // Update job with new last run info
                setJobs(prev => prev.map(job =>
                    job.id === id ? {
                        ...job,
                        lastRun: response.data.completedAt,
                        lastExitCode: response.data.exitCode
                    } : job
                ));
                return { success: true, data: response.data };
            }
            return { success: false, error: 'Failed to run job' };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to run job'
            };
        }
    };

    const toggleJob = async (id) => {
        try {
            const response = await jobsAPI.toggle(id);
            if (response.success) {
                setJobs(prev => prev.map(job =>
                    job.id === id ? { ...job, status: response.data.status } : job
                ));
                return { success: true, data: response.data };
            }
            return { success: false, error: 'Failed to toggle job' };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to toggle job'
            };
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return {
        jobs,
        loading,
        error,
        fetchJobs,
        createJob,
        updateJob,
        deleteJob,
        runJob,
        toggleJob
    };
}

/**
 * Custom hook for managing auth state
 */
export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setIsAuthenticated(true);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    return {
        isAuthenticated,
        user,
        loading,
        login,
        logout
    };
}
