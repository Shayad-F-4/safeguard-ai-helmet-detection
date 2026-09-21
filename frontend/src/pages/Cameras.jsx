import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Plus, Edit2, Trash2, Video, Activity, X, Save,
  Power, RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2,
  MapPin, Loader2,
} from 'lucide-react';
import { getCameras, createCamera, updateCamera, deleteCamera, testCamera } from '../services/api';

/* ─── Form default ──────────────────────────────────────────────────── */
const EMPTY_FORM = { name: '', location: '', source: 'webcam', fps: 30 };

/* ─── Status config ─────────────────────────────────────────────────── */
const statusCfg = {
  active:   { dot: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]', text: 'text-green-400', label: 'Active' },
  inactive: { dot: 'bg-slate-500',  text: 'text-slate-400',  label: 'Inactive' },
};

/* ─── CameraCard ────────────────────────────────────────────────────── */
const CameraCard = ({ cam, onEdit, onDelete, onToggle, onTest }) => {
  const [testing, setTesting]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = statusCfg[cam.status] || statusCfg.inactive;

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(cam);
    setToggling(false);
  };

  const handleTest = async () => {
    setTesting(true);
    await onTest(cam.id);
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete camera "${cam.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(cam.id);
    setDeleting(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col group hover:border-slate-500 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/50">
      {/* Preview Area */}
      <div className="h-36 bg-gradient-to-br from-slate-900 to-slate-800 relative flex items-center justify-center border-b border-slate-700 overflow-hidden">
        <Camera className="w-14 h-14 text-slate-700/60" />

        {/* Live pulse overlay when active */}
        {cam.status === 'active' && (
          <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-400">LIVE</span>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
        </div>

        {/* FPS badge */}
        {cam.fps > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-0.5 rounded text-xs font-mono text-slate-300 backdrop-blur-sm">
            {cam.fps} fps
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex-1">
        <h3 className="text-base font-semibold text-slate-100 truncate">{cam.name}</h3>
        <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5 mb-4">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{cam.location || 'No location set'}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> Source
            </span>
            <span className="text-slate-300 truncate max-w-[120px] text-right">{cam.source || '—'}</span>
          </div>
          {cam.last_active && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Last active
              </span>
              <span className="text-slate-400 text-xs">
                {new Date(cam.last_active).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 bg-slate-900/40 border-t border-slate-700 flex justify-between items-center gap-2">
        {/* Toggle active/inactive */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          title={cam.status === 'active' ? 'Deactivate camera' : 'Activate camera'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            cam.status === 'active'
              ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
              : 'text-green-400 border-green-500/30 hover:bg-green-500/10'
          }`}
        >
          {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {cam.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>

        <div className="flex gap-1.5">
          <button
            onClick={handleTest}
            disabled={testing}
            title="Test camera"
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(cam)}
            title="Edit camera"
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete camera"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── CameraForm ─────────────────────────────────────────────────────── */
const CameraForm = ({ initial = EMPTY_FORM, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial);
  const [err, setErr]   = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Camera name is required.'); return; }
    setErr('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Camera Name <span className="text-red-400">*</span></label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Main Entrance Cam"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Location</label>
          <input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="e.g. Zone A, Gate 1"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Source / URL</label>
          <input
            value={form.source}
            onChange={e => set('source', e.target.value)}
            placeholder="webcam / rtsp://... / http://..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">FPS Limit</label>
          <input
            type="number" min="1" max="120"
            value={form.fps}
            onChange={e => set('fps', parseInt(e.target.value) || 30)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Camera'}
        </button>
      </div>
    </form>
  );
};

/* ─── Skeleton ───────────────────────────────────────────────────────── */
const Skeleton = () => (
  <div className="animate-pulse bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
    <div className="h-36 bg-slate-700" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-slate-700 rounded w-3/4" />
      <div className="h-3 bg-slate-700 rounded w-1/2" />
      <div className="h-3 bg-slate-700 rounded w-2/3" />
    </div>
    <div className="h-12 bg-slate-900/40 border-t border-slate-700" />
  </div>
);

/* ─── Main Page ──────────────────────────────────────────────────────── */
const Cameras = () => {
  const [cameras, setCameras]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editCam, setEditCam]   = useState(null); // null = add mode
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  /* ── Fetch ── */
  const fetchCameras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCameras();
      setCameras(res.data.cameras || []);
    } catch (err) {
      setError('Failed to load cameras. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Add / Edit ── */
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editCam) {
        await updateCamera(editCam.id, form);
        showToast(`"${form.name}" updated.`);
      } else {
        await createCamera(form);
        showToast(`"${form.name}" added.`);
      }
      setShowForm(false);
      setEditCam(null);
      fetchCameras();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save camera.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cam) => {
    setEditCam(cam);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => { setShowForm(false); setEditCam(null); };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      await deleteCamera(id);
      showToast('Camera deleted.');
      fetchCameras();
    } catch (err) {
      showToast('Failed to delete camera.', 'error');
    }
  };

  /* ── Toggle status ── */
  const handleToggle = async (cam) => {
    const newStatus = cam.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCamera(cam.id, { status: newStatus });
      fetchCameras();
    } catch (err) {
      showToast('Failed to update camera status.', 'error');
    }
  };

  /* ── Test ── */
  const handleTest = async (id) => {
    try {
      await testCamera(id);
      showToast('Camera test successful!');
      fetchCameras();
    } catch (err) {
      showToast('Camera test failed.', 'error');
    }
  };

  /* ── Stats ── */
  const activeCount   = cameras.filter(c => c.status === 'active').length;
  const inactiveCount = cameras.filter(c => c.status !== 'active').length;

  return (
    <div className="space-y-6">

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-500/15 border-red-500/40 text-red-300'
            : 'bg-green-500/15 border-green-500/40 text-green-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Camera Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''} configured
            {activeCount > 0 && ` · ${activeCount} active`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCameras}
            disabled={loading}
            className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg border border-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditCam(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Camera
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {cameras.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: cameras.length, cls: 'text-blue-400' },
            { label: 'Active', value: activeCount, cls: 'text-green-400', icon: Wifi },
            { label: 'Inactive', value: inactiveCount, cls: 'text-slate-400', icon: WifiOff },
          ].map(({ label, value, cls, icon: Icon }) => (
            <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              {Icon && <Icon className={`w-5 h-5 ${cls}`} />}
              <div>
                <div className={`text-2xl font-bold font-mono ${cls}`}>{value}</div>
                <div className="text-slate-500 text-xs">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-slate-800 border border-blue-500/30 rounded-xl p-6 shadow-xl shadow-blue-500/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              {editCam ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
              {editCam ? `Edit — ${editCam.name}` : 'Add New Camera'}
            </h2>
            <button onClick={handleCancel} className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <CameraForm
            initial={editCam ? { name: editCam.name, location: editCam.location || '', source: editCam.source || 'webcam', fps: editCam.fps || 30 } : EMPTY_FORM}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={fetchCameras} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} />)
          : cameras.length === 0 && !error
          ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-800/50 border border-dashed border-slate-700 rounded-xl">
              <Camera className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-medium text-slate-300 mb-2">No cameras configured</h3>
              <p className="text-slate-500 text-sm text-center mb-6">Add your first camera to start monitoring.</p>
              <button
                onClick={() => { setEditCam(null); setShowForm(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Add Camera
              </button>
            </div>
          )
          : cameras.map(cam => (
            <CameraCard
              key={cam.id}
              cam={cam}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onTest={handleTest}
            />
          ))
        }
      </div>
    </div>
  );
};

export default Cameras;
