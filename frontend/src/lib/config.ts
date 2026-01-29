// API Configuration
// Use /api for proxy through Next.js (works with ngrok)
// Use http://localhost:3001 for direct backend access (local development)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Direct backend URL (for file uploads and socket connections that bypass Next.js proxy)
export const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper function to create API endpoint
export function apiUrl(path: string): string {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  return `${base}${endpoint}`;
}

// Default headers for API requests
export const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

// Helper function for fetch with default headers
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };
  
  return fetch(url, { ...options, headers });
}

// Helper function for authenticated fetch
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(path, { ...options, headers });
}
