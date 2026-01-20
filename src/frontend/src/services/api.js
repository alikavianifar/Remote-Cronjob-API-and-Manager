// API service for communicating with backend
import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    logout: async () => {
        localStorage.removeItem('token');
        return { success: true };
    }
};

// Jobs API
export const jobsAPI = {
    getAll: async () => {
        const response = await api.get('/jobs');
        return response.data;
    },

    getOne: async (id) => {
        const response = await api.get(`/jobs/${id}`);
        return response.data;
    },

    create: async (jobData) => {
        const response = await api.post('/jobs', jobData);
        return response.data;
    },

    update: async (id, jobData) => {
        const response = await api.put(`/jobs/${id}`, jobData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/jobs/${id}`);
        return response.data;
    },

    run: async (id) => {
        const response = await api.post(`/jobs/${id}/run`);
        return response.data;
    },

    toggle: async (id) => {
        const response = await api.post(`/jobs/${id}/toggle`);
        return response.data;
    },

    getLogs: async (id, limit = 20, offset = 0) => {
        const response = await api.get(`/jobs/${id}/logs`, { params: { limit, offset } });
        return response.data;
    }
};

// Utility API
export const utilAPI = {
    health: async () => {
        const response = await api.get('/health');
        return response.data;
    },

    selfTest: async () => {
        const response = await api.get('/test');
        return response.data;
    },

    parseCron: async (expression) => {
        const response = await api.post('/cron/parse', { expression });
        return response.data;
    }
};

export default api;
