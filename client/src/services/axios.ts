import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration and Account Bans
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error || '';

    // Account Banned check (403 forbidden with suspension)
    if (status === 403 && (errorMessage.toLowerCase().includes('suspended') || errorMessage.toLowerCase().includes('banned'))) {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const parsed = JSON.parse(user);
          parsed.isBanned = true;
          parsed.banReason = errorMessage;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (e) {}
      }
      if (!window.location.pathname.includes('/banned')) {
        window.location.href = '/banned';
      }
    }

    // Token Expired / Invalid (401 unauthorized)
    if (status === 401 && !error.config?.url?.includes('/login') && !error.config?.url?.includes('/account')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login?expired=true';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
