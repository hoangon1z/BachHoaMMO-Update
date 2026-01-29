import axios from 'axios';
import { encryptData, decryptData } from './encryption';

// Use Next.js API routes with encryption
// Use /api for proxy through Next.js (works with ngrok)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - encrypt body and add security headers
api.interceptors.request.use(
  (config) => {
    // Add timestamp for replay attack prevention
    const timestamp = Date.now();
    config.headers['x-request-timestamp'] = timestamp.toString();
    
    // Add custom security header
    config.headers['x-api-version'] = 'v1';
    
    // Encrypt request body
    if (config.data && (config.method === 'post' || config.method === 'put')) {
      config.data = {
        encrypted: true,
        data: encryptData(config.data),
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add token to requests
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

// Response interceptor - decrypt encrypted responses
api.interceptors.response.use(
  (response) => {
    // Decrypt response if it's encrypted
    if (response.data && response.data.encrypted && response.data.data) {
      try {
        response.data = decryptData(response.data.data);
      } catch (error) {
        console.error('Failed to decrypt response:', error);
      }
    }
    return response;
  },
  (error) => {
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please slow down.');
      const resetTime = error.response.headers['x-ratelimit-reset'];
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime));
        console.warn(`Rate limit resets at: ${resetDate.toLocaleTimeString()}`);
      }
    }
    
    // Decrypt error response if encrypted
    if (error.response?.data?.encrypted && error.response?.data?.data) {
      try {
        const decryptedError = decryptData(error.response.data.data);
        error.response.data = decryptedError;
      } catch (e) {
        console.error('Failed to decrypt error response:', e);
      }
    }
    
    // Handle 401 Unauthorized - but don't auto-redirect on auth endpoints
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only auto-redirect for non-auth endpoints (auth endpoints should handle their own errors)
      const isAuthEndpoint = url.includes('/auth/') || url.includes('auth.login') || url.includes('auth.register') || url.includes('auth.me');
      
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        // Check if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('token');
          // Preserve current path for redirect after login
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);
