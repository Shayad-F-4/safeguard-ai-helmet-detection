import axios from 'axios';

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 5000; // 5 seconds cache

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://safeguard-ai-backend-0qpi.onrender.com/api';
  }
  return '/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000, // 15s default - reduced for faster failure
});

// Request interceptor for caching GET requests
api.interceptors.request.use((config) => {
  if (config.method === 'get') {
    const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
    const cached = getCached(cacheKey);
    if (cached) {
      config.adapter = () => Promise.resolve({ data: cached, status: 200, statusText: 'OK', headers: {}, config });
    }
  }
  return config;
});

// Response interceptor for caching successful GET responses
api.interceptors.response.use((res) => {
  if (res.config.method === 'get' && res.status === 200) {
    const cacheKey = `${res.config.url}?${JSON.stringify(res.config.params || {})}`;
    setCached(cacheKey, res.data);
  }
  return res;
});

// Global response interceptor — log errors, guard against HTML fallback responses
api.interceptors.response.use(
  (res) => {
    if (typeof res.data === 'string' && res.data.trim().startsWith('<!DOCTYPE')) {
      const errorMsg = `Received HTML instead of JSON from API: ${res.config?.url}. Backend route not found or proxy misconfigured.`;
      console.warn(`[API Proxy Warning] ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }
    return res;
  },
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Unknown error';
    console.error(`[API Error] ${err.config?.method?.toUpperCase()} ${err.config?.url}: ${msg}`);
    return Promise.reject(err);
  }
);

// ── Health & Dashboard ─────────────────────────────────────────────────────
export const checkHealth        = ()       => api.get('/health');
export const getDashboardStats  = ()       => api.get('/dashboard/stats');

// ── Detection ──────────────────────────────────────────────────────────────
export const detectImage  = (formData, onProgress) =>
  api.post('/detect/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 120000,
  });

export const detectFrame = (frameData) =>
  api.post('/detect/frame', frameData);

export const detectVideo = (formData, onProgress) =>
  api.post('/detect/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 300000, // 5min for large videos
  });

// ── Detections & Sessions ──────────────────────────────────────────────────
export const getDetections  = (params) => api.get('/detections', { params });
export const getDetection   = (id)     => api.get(`/detections/${id}`);
export const getSessions    = (params) => api.get('/sessions', { params });
export const deleteSession  = (id)     => api.delete(`/sessions/${id}`);

// ── Alerts ─────────────────────────────────────────────────────────────────
export const getAlerts    = (params)       => api.get('/alerts', { params });
export const createAlert  = (data)         => api.post('/alerts', data);
export const updateAlert  = (id, data)     => api.patch(`/alerts/${id}`, data);
export const getAlertStats = ()            => api.get('/alerts/stats');

// ── Analytics & Reports ────────────────────────────────────────────────────
export const getAnalytics     = (period)  => api.get('/analytics', { params: { period } });
export const generateReport   = (data)    => api.post('/reports', data);

// ── Cameras ────────────────────────────────────────────────────────────────
export const getCameras    = ()           => api.get('/cameras');
export const createCamera  = (data)       => api.post('/cameras', data);
export const updateCamera  = (id, data)   => api.put(`/cameras/${id}`, data);
export const deleteCamera  = (id)         => api.delete(`/cameras/${id}`);
export const testCamera       = (id)         => api.post(`/cameras/${id}/test`);
export const getCameraSnapshot = (id, params) => api.get(`/cameras/${id}/snapshot`, { params });
export const getCameraFeedUrl  = (id)         => `${api.defaults.baseURL}/cameras/${id}/feed`;

// ── Model & Settings ───────────────────────────────────────────────────────
export const getModelInfo     = ()        => api.get('/model');
export const getSettings      = ()        => api.get('/settings');
export const updateSettings   = (data)    => api.put('/settings', data);
