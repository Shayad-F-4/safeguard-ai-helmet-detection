import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60s for video uploads
});

// Global response interceptor — log errors, don't swallow them
api.interceptors.response.use(
  (res) => res,
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
export const testCamera    = (id)         => api.post(`/cameras/${id}/test`);

// ── Model & Settings ───────────────────────────────────────────────────────
export const getModelInfo     = ()        => api.get('/model');
export const getSettings      = ()        => api.get('/settings');
export const updateSettings   = (data)    => api.put('/settings', data);
