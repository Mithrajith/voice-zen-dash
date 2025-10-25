import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  get: () => localStorage.getItem('authToken'),
  set: (token: string) => localStorage.setItem('authToken', token),
  remove: () => localStorage.removeItem('authToken'),
  isValid: () => {
    const token = tokenManager.get();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token && tokenManager.isValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Token expired or invalid
      tokenManager.remove();
      
      // Redirect to login or show auth modal
      window.dispatchEvent(new CustomEvent('auth:logout'));
      
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      const networkError = new Error('Network error - please check your connection');
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalTasks?: number;
  totalTransactions?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.name === 'NetworkError') {
    return error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.errors) {
    return error.response.data.errors.join(', ');
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw new Error('Max retries exceeded');
};

// Connection status utility
export const connectionMonitor = {
  isOnline: () => navigator.onLine,
  
  onStatusChange: (callback: (isOnline: boolean) => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

export default api;