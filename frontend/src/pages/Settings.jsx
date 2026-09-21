import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-slate-700/50 last:border-0">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
    </div>
    <div className="shrink-0 w-48">{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
  </label>
);

const Settings = () => {
  const [values, setValues] = useState({
    confidence_threshold: '0.50',
    input_resolution: '640',
    camera_fps: '30',
    alert_threshold: '1',
    sound_alerts: 'false',
    auto_save_detections: 'true',
    data_retention_days: '30',
    max_upload_size_mb: '100',
    detection_device: 'cpu',
    model_selection: 'yolov8n',
    nms_threshold: '0.45',
    auto_start_camera: 'false',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // {type: 'success'|'error', msg: string}

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSettings();
        if (res.data.settings) {
          setValues(prev => ({ ...prev, ...res.data.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: String(val) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(values);
      setToast({ type: 'success', msg: 'Settings saved successfully.' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to save settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setValues({
        confidence_threshold: '0.50', input_resolution: '640', camera_fps: '30',
        alert_threshold: '1', sound_alerts: 'false', auto_save_detections: 'true',
        data_retention_days: '30', max_upload_size_mb: '100', detection_device: 'cpu',
        model_selection: 'yolov8n', nms_threshold: '0.45', auto_start_camera: 'false',
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-800 rounded-xl border border-slate-700" />)}
      </div>
    );
  }

  const confVal = parseFloat(values.confidence_threshold || 0.5);
  const fpsVal = parseInt(values.camera_fps || 30);
  const nmsVal = parseFloat(values.nms_threshold || 0.45);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure detection, camera, and alert parameters</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700 flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Detection Settings */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">🎯 Detection Parameters</h3>
        <SettingRow label="Confidence Threshold" description="Minimum confidence to include a detection (0.1 – 0.99)">
          <div className="space-y-1">
            <input type="range" min="0.10" max="0.99" step="0.01" value={confVal}
              onChange={e => set('confidence_threshold', e.target.value)}
              className="w-full accent-blue-500" />
            <div className="text-right text-blue-400 font-mono text-sm">{confVal.toFixed(2)}</div>
          </div>
        </SettingRow>
        <SettingRow label="NMS Threshold" description="Non-Maximum Suppression threshold">
          <div className="space-y-1">
            <input type="range" min="0.10" max="1.0" step="0.05" value={nmsVal}
              onChange={e => set('nms_threshold', e.target.value)}
              className="w-full accent-blue-500" />
            <div className="text-right text-blue-400 font-mono text-sm">{nmsVal.toFixed(2)}</div>
          </div>
        </SettingRow>
        <SettingRow label="Input Resolution" description="Image resize before inference">
          <select value={values.input_resolution} onChange={e => set('input_resolution', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
            <option value="320">320×320 (Fastest)</option>
            <option value="640">640×640 (Balanced)</option>
            <option value="1280">1280×1280 (Accurate)</option>
          </select>
        </SettingRow>
      </div>

      {/* Hardware */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">⚙️ Hardware & Device</h3>
        <SettingRow label="Inference Device" description="Hardware target for running the ML model">
          <select value={values.detection_device} onChange={e => set('detection_device', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
            <option value="cpu">CPU (General Purpose)</option>
            <option value="cuda">CUDA GPU (NVIDIA)</option>
            <option value="raspberry_pi">Raspberry Pi</option>
            <option value="jetson">NVIDIA Jetson</option>
          </select>
        </SettingRow>
        <SettingRow label="Model Selection" description="Active detection model">
          <select value={values.model_selection} onChange={e => set('model_selection', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
            <option value="yolov8n">YOLOv8n (Nano)</option>
            <option value="yolov8s">YOLOv8s (Small)</option>
            <option value="ssd_mobilenet">SSD-MobileNet</option>
          </select>
        </SettingRow>
        <SettingRow label="Camera FPS Limit" description="Maximum frames per second to capture">
          <div className="space-y-1">
            <input type="range" min="1" max="60" step="1" value={fpsVal}
              onChange={e => set('camera_fps', e.target.value)}
              className="w-full accent-blue-500" />
            <div className="text-right text-blue-400 font-mono text-sm">{fpsVal} fps</div>
          </div>
        </SettingRow>
        <SettingRow label="Auto-start Camera" description="Begin monitoring when app loads">
          <Toggle checked={values.auto_start_camera === 'true'} onChange={v => set('auto_start_camera', v)} />
        </SettingRow>
      </div>

      {/* Alerts */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">🚨 Alerts</h3>
        <SettingRow label="Alert Threshold" description="Minimum no-helmet detections to trigger alert">
          <input type="number" min="1" max="10" value={values.alert_threshold}
            onChange={e => set('alert_threshold', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
        </SettingRow>
        <SettingRow label="Sound Alerts" description="Play audio notification on violation">
          <Toggle checked={values.sound_alerts === 'true'} onChange={v => set('sound_alerts', v)} />
        </SettingRow>
      </div>

      {/* Storage */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">💾 Storage</h3>
        <SettingRow label="Auto-save Detections" description="Persist all detection results to database">
          <Toggle checked={values.auto_save_detections === 'true'} onChange={v => set('auto_save_detections', v)} />
        </SettingRow>
        <SettingRow label="Data Retention" description="Delete sessions older than N days">
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="365" value={values.data_retention_days}
              onChange={e => set('data_retention_days', e.target.value)}
              className="w-20 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
            <span className="text-slate-400 text-sm">days</span>
          </div>
        </SettingRow>
        <SettingRow label="Max Upload Size" description="Maximum file size for image/video uploads">
          <div className="flex items-center gap-2">
            <input type="number" min="10" max="500" value={values.max_upload_size_mb}
              onChange={e => set('max_upload_size_mb', e.target.value)}
              className="w-20 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
            <span className="text-slate-400 text-sm">MB</span>
          </div>
        </SettingRow>
      </div>
    </div>
  );
};

export default Settings;
