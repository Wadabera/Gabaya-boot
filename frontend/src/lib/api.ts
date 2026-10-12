import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gebeya_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      // Don't auto-redirect on login or check endpoints
      const url = error.config?.url || '';
      if (!url.includes('/auth/owner/verify-code') && !url.includes('/auth/admin/login')) {
        // If expired, clear token
        localStorage.removeItem('gebeya_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
