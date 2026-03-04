import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const adminService = {
    getStats: () => api.get('/admin/stats'),
    getUsers: (limit = 50, skip = 0) => api.get(`/admin/users?limit=${limit}&skip=${skip}`),
    updateUserRole: (userId: string, isAdmin: boolean) => api.patch(`/admin/users/${userId}/role?is_admin=${isAdmin}`),
    getTransactions: (limit = 100) => api.get(`/admin/transactions?limit=${limit}`),
};

export const authService = {
    login: (credentials: any) => api.post('/auth/login', credentials),
    me: () => api.get('/auth/me'),
};

export default api;
