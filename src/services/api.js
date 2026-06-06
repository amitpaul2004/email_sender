import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized (e.g., token expired), redirect or clear state
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login/register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

export const campaignService = {
  getAll: async (search = '', status = 'all') => {
    const response = await api.get(`/campaigns?search=${search}&status=${status}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/campaigns', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/campaigns/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data;
  },
  send: async (id) => {
    const response = await api.post(`/campaigns/${id}/send`);
    return response.data;
  },
  pause: async (id) => {
    const response = await api.post(`/campaigns/${id}/pause`);
    return response.data;
  },
  schedule: async (id, scheduledAt) => {
    const response = await api.post(`/campaigns/${id}/schedule`, { scheduledAt });
    return response.data;
  },
  duplicate: async (id) => {
    const response = await api.post(`/campaigns/${id}/duplicate`);
    return response.data;
  },
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/campaigns/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getAnalyticsSummary: async () => {
    const response = await api.get('/campaigns/analytics/summary');
    return response.data;
  },
  exportCSVUrl: (id) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/campaigns/${id}/export?token=${token}`;
  },
};

export const templateService = {
  getAll: async () => {
    const response = await api.get('/templates');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/templates', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },
};

export default api;
