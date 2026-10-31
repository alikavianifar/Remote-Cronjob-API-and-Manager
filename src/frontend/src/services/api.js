// API client for the backend
import axios from 'axios';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

export const tokenStorage = {
    get: () => localStorage.getItem(TOKEN_KEY),
    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY));
        } catch {
            return null;
        }
    },
    set: (token, user) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
};

// The auth context registers this so an expired session returns the user to the login form.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // A 401 from the login request itself just means wrong credentials.
        const isLogin = error.config?.url === '/auth/login';
        if (error.response?.status === 401 && !isLogin) onUnauthorized();
        return Promise.reject(error);
    }
);

/** Best human-readable message for a failed request. */
export function errorMessage(err, fallback) {
    if (err.response?.data?.error) return err.response.data.error;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server';
    return fallback;
}

export const authAPI = {
    login: async (username, password) => (await api.post('/auth/login', { username, password })).data,
    logout: async () => (await api.post('/auth/logout')).data
};

export const jobsAPI = {
    getAll: async () => (await api.get('/jobs')).data,
    getOne: async (id) => (await api.get(`/jobs/${id}`)).data,
    create: async (jobData) => (await api.post('/jobs', jobData)).data,
    update: async (id, jobData) => (await api.put(`/jobs/${id}`, jobData)).data,
    delete: async (id) => (await api.delete(`/jobs/${id}`)).data,
    run: async (id) => (await api.post(`/jobs/${id}/run`)).data,
    toggle: async (id) => (await api.post(`/jobs/${id}/toggle`)).data,
    getLogs: async (id, limit = 20, offset = 0) => (await api.get(`/jobs/${id}/logs`, { params: { limit, offset } })).data
};

export const utilAPI = {
    health: async () => (await api.get('/health')).data,
    selfTest: async () => (await api.get('/test')).data,
    parseCron: async (expression, signal) => (await api.post('/cron/parse', { expression }, { signal })).data
};

export default api;
