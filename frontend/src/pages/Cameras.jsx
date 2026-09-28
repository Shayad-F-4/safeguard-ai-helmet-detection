import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Plus, Edit2, Trash2, Video, Activity, X, Save,
  Power, RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2,
  MapPin, Loader2, Maximize2, Minimize2, ExternalLink,
  ShieldCheck, ShieldAlert, Users, Sliders, Download, Eye,
  Smartphone, Laptop, Play, Pause
} from 'lucide-react';
import {
  getCameras, createCamera, updateCamera, deleteCamera,
  testCamera, getCameraSnapshot, getCameraFeedUrl, createAlert,
  detectFrame
} from '../services/api';
import CameraFeed from '../components/CameraFeed';

/* ─── Form default ──────────────────────────────────────────────────── */
const EMPTY_FORM = { name: '', location: '', source: 'webcam', fps: 30 };

/* ─── Status config ─────────────────────────────────────────────────── */
const statusCfg = {
  active:   { dot: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]', text: 'text-green-400', label: 'Active' },
  inactive: { dot: 'bg-slate-500',  text: 'text-slate-400',  label: 'Inactive' },
};

/* ─── Fullscreen Live Inspection Modal ──────────────────────────────── */
const LiveInspectModal = ({ cam, onClose, onOpenLiveMonitoring }) => {
  const modalRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [threshold, setThreshold] = useState(0.45);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({
    workers: 0,
    helmet: 0,
    noHelmet: 0,
    fps: cam.fps || 30,
    inferenceTime: 0,
  });
  const [detections, setDetections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [feedTimestamp, setFeedTimestamp] = useState(Date.now());
  const [capturing, setCapturing] = useState(false);
  const lastAlertTimeRef = useRef(0);

  const isWebcam = !cam.source || cam.source === 'webcam';

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modalRef.current?.requestFullscreen) {
        modalRef.current.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  // Webcam frame handler
  const handleWebcamFrame = useCallback(async (base64) => {
    if (isPaused) return;
    try {
      const res = await detectFrame({
        frame: base64,
        camera_id: cam.name,
        confidence: threshold,
      });
      if (res.data && res.data.success !== false) {
        const d = res.data;
        setDetections(d.detections || []);
        const s = d.summary || {};
        setStats({
          workers: s.workers ?? 0,
          helmet: s.helmet ?? 0,
          noHelmet: s.no_helmet ?? 0,
          fps: Math.round(d.fps ?? 30),
          inferenceTime: Math.round(d.inference_time_ms ?? 35),
        });

        if (s.no_helmet > 0) {
          const viol = (d.detections || []).filter((x) => x.class === 'no_helmet');
          const now = Date.now();
          viol.forEach((v, idx) => {
            const item = {
              id: now + idx,
              worker_id: `Worker #${v.id ?? (idx + 1)}`,
              confidence: Math.round((v.confidence <= 1 ? v.confidence * 100 : v.confidence) || 85),
              time: new Date().toLocaleTimeString(),
            };
            setAlerts((prev) => [item, ...prev.filter((a) => a.worker_id !== item.worker_id)].slice(0, 8));
          });

          if (now - lastAlertTimeRef.current > 5000) {
            lastAlertTimeRef.current = now;
            createAlert({
              message: `No Helmet Violation — ${cam.name}`,
              worker_id: 'Violation',
              camera_name: cam.name,
              severity: 'HIGH',
              confidence: 88,
              workers: s.workers || 1,
              helmet: s.helmet || 0,
              fps: Math.round(d.fps || 30),
            }).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.warn('Webcam detection error:', err);
    }
  }, [cam.name, isPaused, threshold]);

  // IP Camera snapshot polling loop for stats & violation notifications
  useEffect(() => {
    if (isWebcam) return;
    let isSubscribed = true;

    const pollSnapshot = async () => {
      if (isPaused) return;
      try {
        const res = await getCameraSnapshot(cam.id, { confidence: threshold });
        if (!isSubscribed) return;
        if (res.data && res.data.success !== false) {
          const d = res.data;
          const s = d.summary || {};
          setStats({
            workers: s.workers ?? 0,
            helmet: s.helmet ?? 0,
            noHelmet: s.no_helmet ?? 0,
            fps: Math.round(d.fps ?? cam.fps ?? 30),
            inferenceTime: Math.round(d.inference_time_ms ?? 45),
          });
          setDetections(d.detections || []);

          if (s.no_helmet > 0) {
            const viol = (d.detections || []).filter((x) => x.class === 'no_helmet');
            const now = Date.now();
            viol.forEach((v, idx) => {
              const item = {
                id: now + idx,
                worker_id: `Worker #${v.id ?? (idx + 1)}`,
                confidence: Math.round((v.confidence <= 1 ? v.confidence * 100 : v.confidence) || 85),
                time: new Date().toLocaleTimeString(),
              };
              setAlerts((prev) => [item, ...prev.filter((a) => a.worker_id !== item.worker_id)].slice(0, 8));
            });

            if (now - lastAlertTimeRef.current > 5000) {
              lastAlertTimeRef.current = now;
              createAlert({
                message: `No Helmet Violation — ${cam.name}`,
                worker_id: 'Violation',
                camera_name: cam.name,
                severity: 'HIGH',
                confidence: 88,
                workers: s.workers || 1,
                helmet: s.helmet || 0,
                fps: Math.round(d.fps || cam.fps || 30),
              }).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.warn('IP Camera poll error:', err);
      }
    };

    pollSnapshot();
    const interval = setInterval(pollSnapshot, 1500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [cam.id, cam.name, cam.fps, isPaused, isWebcam, threshold]);

  // Snapshot download
  const handleSnapshotDownload = async () => {
    setCapturing(true);
    try {
      if (isWebcam) {
        const video = modalRef.current?.querySelector('video');
        if (video) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.download = `${cam.name.replace(/\s+/g, '_')}_snapshot_${Date.now()}.jpg`;
          link.click();
        }
      } else {
        const res = await getCameraSnapshot(cam.id, { confidence: threshold });
        if (res.data?.annotated_image) {
          const link = document.createElement('a');
          link.href = res.data.annotated_image;
          link.download = `${cam.name.replace(/\s+/g, '_')}_snapshot_${Date.now()}.jpg`;
          link.click();
        }
      }
    } catch (err) {
      console.error('Snapshot failed:', err);
    } finally {
      setCapturing(false);
    }
  };

  const complianceRate = stats.workers > 0
    ? Math.round((stats.helmet / stats.workers) * 100)
    : 100;

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md transition-all ${
        isFullscreen ? 'w-screen h-screen' : 'p-3 sm:p-6'
      }`}
    >
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {isWebcam ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{cam.name}</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE INSPECTION
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{cam.location || 'Site Camera'}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-slate-400">{cam.source || 'webcam'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Fullscreen Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Confidence Slider */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs text-slate-400">Threshold:</span>
              <input
                type="range"
                min="0.20"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs font-mono font-bold text-blue-400">{Math.round(threshold * 100)}%</span>
            </div>

            {/* Pause / Resume */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded-lg border transition-colors ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isPaused ? 'Resume live feed' : 'Pause feed'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Snapshot */}
            <button
              onClick={handleSnapshotDownload}
              disabled={capturing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title="Download Snapshot with YOLO Bounding Boxes"
            >
              {capturing ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Download className="w-4 h-4" />}
            </button>

            {/* Open in Live Monitoring */}
            <button
              onClick={() => onOpenLiveMonitoring(cam.name)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
              title="Open full monitoring view"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Monitoring</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded-lg border border-slate-700 transition-colors"
              title="Close Inspection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Content Area (Video + Real-time Violation Stats) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Video Viewport */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[340px]">
            {isWebcam ? (
              <div className="w-full h-full p-2 flex items-center justify-center">
                <CameraFeed
                  onFrame={handleWebcamFrame}
                  isActive={!isPaused}
                  isPaused={isPaused}
                  cameraId={cam.name}
                  detections={detections}
                  frameDimensions={{ width: 640, height: 480 }}
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                <img
                  src={`${getCameraFeedUrl(cam.id)}?t=${feedTimestamp}`}
                  alt={cam.name}
                  className="max-w-full max-h-full object-contain"
                  onError={() => {
                    // Refresh timestamp every 3 seconds to attempt reconnect
                    setTimeout(() => setFeedTimestamp(Date.now()), 3000);
                  }}
                />

                {/* Overlaid stats pill on top-left of video */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-semibold text-slate-200">YOLOv8 Real-time Stream</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-blue-400">{stats.fps} FPS</span>
                </div>
              </div>
            )}

            {isPaused && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Pause className="w-12 h-12 text-amber-400" />
                <span className="text-base font-semibold text-white">Stream Paused</span>
                <button
                  onClick={() => setIsPaused(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition-colors"
                >
                  Resume Stream
                </button>
              </div>
            )}
          </div>

          {/* Right Inspection & Violation Panel */}
          <div className="w-full lg:w-80 xl:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col p-4 space-y-4 overflow-y-auto shrink-0">
            {/* Real-time Counters */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-slate-100">{stats.workers}</div>
                  <div className="text-xs text-slate-400">Total Workers</div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-green-400">{stats.helmet}</div>
                  <div className="text-xs text-slate-400">Wearing Helmet</div>
                </div>
              </div>

              <div className={`col-span-2 bg-slate-800/80 border rounded-xl p-3 flex items-center justify-between ${
                stats.noHelmet > 0
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-slate-700/80'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    stats.noHelmet > 0
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                  }`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Violations</div>
                    <div className={`text-xl font-bold font-mono ${stats.noHelmet > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {stats.noHelmet} No Helmet
                    </div>
                  </div>
                </div>
                {stats.noHelmet > 0 && (
                  <span className="px-2.5 py-1 bg-red-500 text-white font-bold text-xs rounded-full uppercase tracking-wider animate-bounce">
                    Action Req.
                  </span>
                )}
              </div>
            </div>

            {/* Compliance Progress Bar */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Site Compliance Rate</span>
                <span className={`font-mono font-bold text-sm ${
                  complianceRate >= 90 ? 'text-green-400' : complianceRate >= 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {complianceRate}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    complianceRate >= 90 ? 'bg-green-500' : complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
            </div>

            {/* Live Violation Feed */}
            <div className="flex-1 flex flex-col bg-slate-800/50 border border-slate-700/80 rounded-xl p-3 min-h-[160px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  Live Violation Alerts
                </span>
                <span className="text-xs text-slate-500">{alerts.length} logged</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center text-slate-500 text-xs">
                    <ShieldCheck className="w-8 h-8 text-green-500/50 mb-1" />
                    <span>No violations detected</span>
                    <span className="text-slate-600">All workers compliant</span>
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-red-300">{a.worker_id}</div>
                        <div className="text-slate-400 text-[11px]">No Hard Hat · {a.time}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 font-mono font-bold rounded">
                        {a.confidence}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mobile / IP Stream Note */}
            {!isWebcam && (
              <div className="space-y-2">
                {(() => {
                  const isPrivateIp = ['10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '127.0.0.1', 'localhost'].some((p) => String(cam.source || '').includes(p));
                  const isCloud = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

                  if (isPrivateIp && isCloud) {
                    return (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 leading-relaxed space-y-2">
                        <div className="font-bold flex items-center gap-1.5 text-amber-400">
                          <span className="text-sm">⚠</span> Local Wi-Fi Camera on Cloud
                        </div>
                        <p className="text-amber-200/90 text-[11px] leading-normal">
                          <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">{cam.source}</span> is inside your private local Wi-Fi. The cloud backend on Render cannot reach inside private Wi-Fi across the public internet.
                        </p>
                        <div className="pt-1 text-[11px] text-slate-300 space-y-1.5 border-t border-amber-500/20">
                          <div className="font-semibold text-amber-300">How to use your phone camera:</div>
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-700 space-y-1">
                            <div><strong className="text-green-400">Option 1 (Instant):</strong> Open <span className="text-blue-400 underline font-mono">vercel.app/live</span> in your phone's browser and tap Start!</div>
                            <div><strong className="text-blue-400">Option 2 (Local PC):</strong> Run <code className="text-slate-200 bg-slate-800 px-1 rounded">python app.py</code> on PC (PC & phone share same Wi-Fi).</div>
                            <div><strong className="text-purple-400">Option 3 (Public Tunnel):</strong> Run <code className="text-slate-200 bg-slate-800 px-1 rounded">ngrok http 8080</code> and use the public https link.</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300/90 leading-relaxed">
                      📱 <strong>IP Camera Stream:</strong> Real-time YOLO detection frames are actively rendered from mobile phone camera.
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── CameraCard ────────────────────────────────────────────────────── */
const CameraCard = ({ cam, onEdit, onDelete, onToggle, onTest, onInspect }) => {
  const [testing, setTesting]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = statusCfg[cam.status] || statusCfg.inactive;
  const isWebcam = !cam.source || cam.source === 'webcam';

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    await onToggle(cam);
    setToggling(false);
  };

  const handleTest = async (e) => {
    e.stopPropagation();
    setTesting(true);
    await onTest(cam.id);
    setTesting(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete camera "${cam.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(cam.id);
    setDeleting(false);
  };

  return (
    <div
      onClick={() => onInspect(cam)}
      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col group hover:border-blue-500/60 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
    >
      {/* Preview Area */}
      <div className="h-44 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative flex items-center justify-center border-b border-slate-700 overflow-hidden">
        {cam.status === 'active' && !isWebcam ? (
          <img
            src={getCameraFeedUrl(cam.id)}
            alt={cam.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
            {isWebcam ? (
              <Laptop className="w-12 h-12 text-slate-700 group-hover:text-blue-500/70 transition-colors" />
            ) : (
              <Smartphone className="w-12 h-12 text-slate-700 group-hover:text-blue-500/70 transition-colors" />
            )}
            <span className="text-xs font-medium text-slate-500">{isWebcam ? 'Local Webcam' : 'IP Camera Source'}</span>
          </div>
        )}

        {/* Live overlay on hover with Fullscreen CTA */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200 backdrop-blur-[2px]">
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs shadow-lg shadow-blue-500/40">
            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Live Inspect
          </span>
        </div>

        {/* Live pulse overlay when active */}
        {cam.status === 'active' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-full backdrop-blur-sm border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-400">LIVE</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-full backdrop-blur-sm border border-slate-700">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
        </div>

        {/* FPS badge */}
        {cam.fps > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-0.5 rounded text-xs font-mono text-slate-300 backdrop-blur-sm border border-slate-800">
            {cam.fps} fps
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1">
        <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-blue-400 transition-colors">
          {cam.name}
        </h3>
        <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{cam.location || 'No location set'}</span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-blue-400" /> Source
            </span>
            <span className="text-slate-300 font-mono truncate max-w-[150px] text-right" title={cam.source}>
              {cam.source || 'webcam'}
            </span>
          </div>
          {cam.last_active && (
            <div className="flex justify-between items-center text-slate-400 px-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Last active
              </span>
              <span className="text-slate-400 text-[11px]">
                {new Date(cam.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-700 flex justify-between items-center gap-2">
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

        <div className="flex items-center gap-1">
          <button
            onClick={handleTest}
            disabled={testing}
            title="Test camera connection"
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Wifi className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onInspect(cam); }}
            title="Inspect Live Video & Fullscreen"
            className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(cam); }}
            title="Edit camera settings"
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete camera"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
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

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Camera name is required.'); return; }
    setErr('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>}

      {/* Preset Source Quick Select */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Source Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('source', 'webcam')}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
              form.source === 'webcam'
                ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Laptop className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-200">Laptop Webcam</div>
              <div className="text-xs text-slate-400">Default computer camera</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (form.source === 'webcam') set('source', '192.168.1.5:8080');
            }}
            className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
              form.source !== 'webcam'
                ? 'bg-blue-600/15 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Smartphone className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-200">Mobile IP Webcam</div>
              <div className="text-xs text-slate-400">Android app IP stream</div>
            </div>
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Camera Name <span className="text-red-400">*</span></label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Mobile Cam 1 / Entrance"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Location</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Zone A, Gate 1, Floor 2"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">Source / Stream URL</label>
          <input
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
            placeholder="webcam OR 192.168.1.15:8080 OR http://..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-400">FPS Limit</label>
          <input
            type="number" min="1" max="120"
            value={form.fps}
            onChange={(e) => set('fps', parseInt(e.target.value) || 30)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Helpful Mobile Instructions Banner */}
      {form.source !== 'webcam' && (
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
          <div className="font-semibold text-blue-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> How to use Android IP Webcam:
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed pl-1">
            <li>Install free <strong>"IP Webcam"</strong> by Pavel Khlebovich on your Android phone.</li>
            <li>Connect phone and PC to the <strong>same Wi-Fi network</strong>.</li>
            <li>Scroll down and tap <strong>"Start server"</strong> inside the app.</li>
            <li>Copy the IPv4 address shown on your phone screen (e.g. <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded font-mono">192.168.1.5:8080</code>) into the Source box above.</li>
          </ol>
        </div>
      )}

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
    <div className="h-44 bg-slate-700" />
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
  const navigate = useNavigate();
  const [cameras, setCameras]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editCam, setEditCam]       = useState(null);
  const [inspectCam, setInspectCam] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

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
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Add / Edit ── */
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editCam) {
        await updateCamera(editCam.id, form);
        showToast(`"${form.name}" updated successfully.`);
      } else {
        await createCamera(form);
        showToast(`"${form.name}" added successfully.`);
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
      if (inspectCam?.id === id) setInspectCam(null);
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
      showToast(`Camera marked as ${newStatus}.`);
    } catch (err) {
      showToast('Failed to update camera status.', 'error');
    }
  };

  /* ── Test ── */
  const handleTest = async (id) => {
    try {
      const res = await testCamera(id);
      showToast(res.data?.message || 'Camera test successful!');
      fetchCameras();
    } catch (err) {
      const msg = err.response?.data?.error || 'Camera test failed. Ensure device is reachable.';
      showToast(msg, 'error');
    }
  };

  /* ── Stats ── */
  const activeCount   = cameras.filter((c) => c.status === 'active').length;
  const inactiveCount = cameras.filter((c) => c.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl border shadow-2xl text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/50 text-red-200'
            : 'bg-green-500/20 border-green-500/50 text-green-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-red-400" /> : <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-7 h-7 text-blue-500" />
            Camera & IP Stream Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect local webcams or mobile phone cameras via IP Webcam. Click any camera for <strong>Fullscreen Live Inspection</strong>.
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
            { label: 'Configured Cameras', value: cameras.length, cls: 'text-blue-400', icon: Video },
            { label: 'Active Streams', value: activeCount, cls: 'text-green-400', icon: Wifi },
            { label: 'Inactive', value: inactiveCount, cls: 'text-slate-400', icon: WifiOff },
          ].map(({ label, value, cls, icon: Icon }) => (
            <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              {Icon && <Icon className={`w-5 h-5 ${cls}`} />}
              <div>
                <div className={`text-2xl font-bold font-mono ${cls}`}>{value}</div>
                <div className="text-slate-400 text-xs">{label}</div>
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
              {editCam ? `Edit — ${editCam.name}` : 'Add New Camera Source'}
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
              <p className="text-slate-500 text-sm text-center mb-6">Add your local webcam or mobile phone IP Webcam to start monitoring.</p>
              <button
                onClick={() => { setEditCam(null); setShowForm(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Add Camera
              </button>
            </div>
          )
          : cameras.map((cam) => (
            <CameraCard
              key={cam.id}
              cam={cam}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onTest={handleTest}
              onInspect={(c) => setInspectCam(c)}
            />
          ))
        }
      </div>

      {/* Live Fullscreen Inspection Modal */}
      {inspectCam && (
        <LiveInspectModal
          cam={inspectCam}
          onClose={() => setInspectCam(null)}
          onOpenLiveMonitoring={(camName) => {
            setInspectCam(null);
            navigate('/live', { state: { selectedCamera: camName } });
          }}
        />
      )}
    </div>
  );
};

export default Cameras;
