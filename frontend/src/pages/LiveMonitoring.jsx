import React, { useState, useRef, useCallback } from 'react';
import CameraFeed from '../components/CameraFeed';
import AlertCard from '../components/AlertCard';
import { Play, Square, Pause, Camera as CameraIcon, Settings, VideoOff } from 'lucide-react';
import { detectFrame } from '../services/api';
import { useAppContext } from '../context/AppContext';

// ---------------------------------------------------------------------------
// Compliance progress bar
// ---------------------------------------------------------------------------
const ComplianceBar = ({ rate }) => {
  const color =
    rate >= 90 ? 'bg-green-500' :
    rate >= 70 ? 'bg-amber-500' :
                 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Compliance Rate</span>
        <span className={`font-mono font-semibold ${
          rate >= 90 ? 'text-green-400' : rate >= 70 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {rate}%
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Camera offline placeholder
// ---------------------------------------------------------------------------
const CameraOfflinePlaceholder = () => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 rounded-lg space-y-4 select-none">
    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
      <VideoOff className="w-9 h-9 text-slate-600" />
    </div>
    <div className="text-center">
      <p className="text-slate-400 font-medium">Camera Offline</p>
      <p className="text-slate-600 text-sm mt-1">Press Start Monitoring to connect</p>
    </div>
    <div className="flex space-x-1.5 mt-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-700 animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// LiveMonitoring page
// ---------------------------------------------------------------------------
const LiveMonitoring = () => {
  const { isDemo } = useAppContext();

  const [isActive,  setIsActive]  = useState(false);
  const [isPaused,  setIsPaused]  = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [stats, setStats] = useState({
    workers: 0, helmet: 0, noHelmet: 0, fps: 0, inferenceTime: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Ref so handleFrame closure always sees latest isPaused without stale-closure
  const isPausedRef = useRef(false);

  // Keep ref in sync with state
  const syncPause = (val) => {
    isPausedRef.current = val;
    setIsPaused(val);
  };

  // ---- Frame handler (called by CameraFeed) ----
  const handleFrame = useCallback(async (base64) => {
    if (isPausedRef.current) return;                // honour pause

    try {
      const res = await detectFrame({ frame: base64, camera_id: 'Camera 01' });
      if (res.data && res.data.success !== false) {
        const data = res.data;
        setFrameCount((n) => n + 1);
        setStats({
          workers:       data.summary?.workers          ?? 0,
          helmet:        data.summary?.helmet            ?? 0,
          noHelmet:      data.summary?.no_helmet         ?? 0,
          fps:           Math.round(data.fps             ?? 0),
          inferenceTime: Math.round(data.inference_time_ms ?? 0),
        });

        if (data.summary?.no_helmet > 0) {
          const violators = data.detections?.filter((d) => d.class === 'no_helmet') || [];
          violators.forEach((v, i) => {
            const newAlert = {
              id:          Date.now() + i,
              severity:    'HIGH',
              message:     `No Helmet Detected — Worker #${v.id ?? '??'}`,
              worker_id:   `Worker #${v.id ?? '??'}`,
              camera_name: 'Camera 01',
              confidence:  typeof v.confidence === 'number'
                             ? (v.confidence <= 1 ? v.confidence * 100 : v.confidence)
                             : 88,
              created_at:  new Date().toISOString(),
              status:      'active',
            };
            setRecentAlerts((prev) => [newAlert, ...prev].slice(0, 5));
          });
        }
      }
    } catch (err) {
      console.error('Frame detection error:', err);
    }
  }, []); // stable — reads isPausedRef via ref

  // ---- Snapshot ----
  const handleSnapshot = () => {
    try {
      const video = document.querySelector('video');
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `snapshot_${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Snapshot error:', err);
    }
  };

  // ---- Stop monitoring ----
  const handleStop = () => {
    setIsActive(false);
    syncPause(false);
  };

  // ---- Derived ----
  const complianceRate = stats.workers > 0
    ? Math.round((stats.helmet / stats.workers) * 100)
    : 100;

  const modelLabel = isDemo ? 'MockDetector (Demo)' : 'YOLOv8n (YOLO Mode)';

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* ================================================================ */}
      {/* Left Column — Camera feed                                          */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="font-medium text-slate-200 text-sm">Main Entrance Camera</h2>
            <select className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option>Cam-01 (Main Entrance)</option>
              <option>Cam-02 (Zone A)</option>
              <option>Webcam (Local)</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            {/* Frame counter */}
            {isActive && (
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {frameCount.toLocaleString()} frames
              </span>
            )}
            <button
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="flex-1 relative p-4 min-h-[280px]">
          {isActive ? (
            <CameraFeed onFrame={handleFrame} isActive={isActive} cameraId="default" />
          ) : (
            <CameraOfflinePlaceholder />
          )}

          {/* Paused overlay */}
          {isActive && isPaused && (
            <div className="absolute inset-4 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
              <div className="flex flex-col items-center space-y-2">
                <Pause className="w-10 h-10 text-white/70" />
                <span className="text-white/70 text-sm font-medium">Paused</span>
              </div>
            </div>
          )}
        </div>

        {/* Control bar */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-center items-center space-x-3 shrink-0">
          {!isActive ? (
            <button
              onClick={() => { setIsActive(true); syncPause(false); setFrameCount(0); }}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-sm"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Monitoring</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </button>

              <button
                onClick={() => syncPause(!isPaused)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium border transition-colors ${
                  isPaused
                    ? 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white'
                }`}
              >
                {isPaused
                  ? <><Play  className="w-4 h-4 fill-current" /><span>Resume</span></>
                  : <><Pause className="w-4 h-4 fill-current" /><span>Pause</span></>
                }
              </button>

              <button
                onClick={handleSnapshot}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium border border-slate-600 transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Snapshot</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Right Column — Stats & Alerts                                      */}
      {/* ================================================================ */}
      <div className="w-full lg:w-96 flex flex-col gap-5">
        {/* Live Safety Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-medium">Live Safety Status</h3>
            {isActive && !isPaused && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            )}
            {isActive && isPaused && (
              <span className="text-xs text-amber-400 font-medium">Paused</span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Total Workers</div>
              <div className="text-2xl font-bold font-mono text-white">{stats.workers}</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Frame Count</div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {frameCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              <div className="text-green-500/80 text-xs mb-1">With Helmet</div>
              <div className="text-2xl font-bold font-mono text-green-400">{stats.helmet}</div>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <div className="text-red-500/80 text-xs mb-1">No Helmet</div>
              <div className="text-2xl font-bold font-mono text-red-400">{stats.noHelmet}</div>
            </div>
          </div>

          {/* Compliance bar */}
          <div className="mb-5">
            <ComplianceBar rate={complianceRate} />
          </div>

          {/* Performance metrics */}
          <div className="space-y-2.5 pt-4 border-t border-slate-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Processing FPS</span>
              <span className="text-slate-200 font-mono tabular-nums">{stats.fps} fps</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Inference Time</span>
              <span className="text-slate-200 font-mono tabular-nums">{stats.inferenceTime} ms</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Model</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isDemo
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-green-500/15 text-green-400'
              }`}>
                {modelLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-slate-200 font-medium mb-4 shrink-0">Live Violations</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                  <span className="text-green-500 text-xl">✓</span>
                </div>
                <p className="text-slate-500 text-sm">No violations detected</p>
                {!isActive && (
                  <p className="text-slate-600 text-xs mt-1">Start monitoring to detect</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
