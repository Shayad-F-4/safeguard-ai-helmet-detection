import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CameraFeed from '../components/CameraFeed';
import AlertCard from '../components/AlertCard';
import {
  Play, Square, Pause, Camera as CameraIcon, Settings, VideoOff,
  Sliders, Maximize2, Minimize2, Smartphone, Laptop, Loader2
} from 'lucide-react';
import { detectFrame, getCameras, createAlert, getCameraFeedUrl, getCameraSnapshot } from '../services/api';
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
  const location = useLocation();
  const { isDemo, refreshAlerts } = useAppContext();

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActive,  setIsActive]  = useState(false);
  const [isPaused,  setIsPaused]  = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [currentDetections, setCurrentDetections] = useState([]);
  const [frameDimensions, setFrameDimensions] = useState({ width: 640, height: 480 });
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.45);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('Camera 01');
  const [ipFeedTimestamp, setIpFeedTimestamp] = useState(Date.now());
  const [isCapturing, setIsCapturing] = useState(false);
  const [stats, setStats] = useState({
    workers: 0, helmet: 0, noHelmet: 0, fps: 0, inferenceTime: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);

  // Ref so closures always see latest values without stale references
  const isPausedRef = useRef(false);
  const confidenceThresholdRef = useRef(0.45);
  const selectedCameraRef = useRef('Camera 01');
  const lastAlertTimeRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  // Sync refs
  useEffect(() => {
    confidenceThresholdRef.current = confidenceThreshold;
  }, [confidenceThreshold]);

  useEffect(() => {
    selectedCameraRef.current = selectedCamera;
  }, [selectedCamera]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(console.warn);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.warn);
      }
    }
  };

  const syncPause = (val) => {
    isPausedRef.current = val;
    setIsPaused(val);
  };

  // Fetch cameras on mount
  useEffect(() => {
    const fetchCamList = async () => {
      try {
        const res = await getCameras();
        if (res.data?.cameras && res.data.cameras.length > 0) {
          setCameras(res.data.cameras);
          // If navigated with state, prioritize that camera
          if (location.state?.selectedCamera) {
            setSelectedCamera(location.state.selectedCamera);
          } else {
            setSelectedCamera(res.data.cameras[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load camera list:', err);
      }
    };
    fetchCamList();
  }, [location.state]);

  // Identify current camera object
  const currentCamObj = cameras.find(
    (c) => c.name === selectedCamera || String(c.id) === String(selectedCamera)
  );
  const isIpCam = currentCamObj && currentCamObj.source && currentCamObj.source !== 'webcam';

  // IP Camera snapshot polling loop when active
  useEffect(() => {
    if (!isActive || !isIpCam || !currentCamObj) return;

    let isSubscribed = true;
    const pollIpStream = async () => {
      if (isPausedRef.current) return;
      try {
        const res = await getCameraSnapshot(currentCamObj.id, {
          confidence: confidenceThresholdRef.current,
        });

        if (!isSubscribed) return;
        if (res.data && res.data.success !== false) {
          setApiError(null);
          const d = res.data;
          setFrameCount((n) => n + 1);
          setCurrentDetections(d.detections || []);
          setStats({
            workers:       d.summary?.workers          ?? 0,
            helmet:        d.summary?.helmet           ?? 0,
            noHelmet:      d.summary?.no_helmet        ?? 0,
            fps:           Math.round(d.fps            ?? currentCamObj.fps ?? 30),
            inferenceTime: Math.round(d.inference_time_ms ?? 45),
          });

          if (d.summary?.no_helmet > 0) {
            const violators = d.detections?.filter((v) => v.class === 'no_helmet') || [];
            const nowMs = Date.now();

            violators.forEach((v, i) => {
              const conf = typeof v.confidence === 'number'
                ? (v.confidence <= 1 ? Math.round(v.confidence * 100) : Math.round(v.confidence))
                : 88;

              const newAlert = {
                id:          nowMs + i,
                severity:    'HIGH',
                message:     `No Helmet Detected — Worker #${v.id ?? '??'}`,
                worker_id:   `Worker #${v.id ?? '??'}`,
                camera_name: currentCamObj.name,
                confidence:  conf,
                created_at:  new Date().toISOString(),
                status:      'active',
              };

              setRecentAlerts((prev) => [newAlert, ...prev.filter((a) => a.worker_id !== newAlert.worker_id)].slice(0, 6));

              // Throttle backend alert creation
              if (nowMs - lastAlertTimeRef.current > 5000) {
                lastAlertTimeRef.current = nowMs;
                createAlert({
                  message: `No Helmet Detected — Worker #${v.id ?? '??'}`,
                  worker_id: `Worker #${v.id ?? '??'}`,
                  camera_name: currentCamObj.name,
                  severity: 'HIGH',
                  confidence: conf,
                  workers: d.summary?.workers || 1,
                  helmet: d.summary?.helmet || 0,
                  fps: currentCamObj.fps || 30,
                }).then(() => {
                  if (refreshAlerts) refreshAlerts();
                }).catch(console.error);
              }
            });
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.warn('IP Camera poll error:', err);
          setApiError('Unable to reach IP camera stream. Check Wi-Fi & phone connection.');
        }
      }
    };

    pollIpStream();
    const interval = setInterval(pollIpStream, 1500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isActive, isIpCam, currentCamObj, refreshAlerts]);

  // ---- Frame handler (called by local CameraFeed) ----
  const handleFrame = useCallback(async (base64, dimensions) => {
    if (isPausedRef.current) return;

    if (dimensions?.width && dimensions?.height) {
      setFrameDimensions(dimensions);
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Inference request timed out')), 15000)
      );

      const res = await Promise.race([
        detectFrame({
          frame: base64,
          camera_id: selectedCameraRef.current,
          confidence: confidenceThresholdRef.current,
        }),
        timeoutPromise,
      ]);

      if (res.data && res.data.success !== false) {
        consecutiveErrorsRef.current = 0;
        setApiError(null);
        const data = res.data;
        setFrameCount((n) => n + 1);
        setCurrentDetections(data.detections || []);
        if (data.image_width && data.image_height) {
          setFrameDimensions({ width: data.image_width, height: data.image_height });
        }
        setStats({
          workers:       data.summary?.workers          ?? 0,
          helmet:        data.summary?.helmet           ?? 0,
          noHelmet:      data.summary?.no_helmet        ?? 0,
          fps:           Math.round(data.fps            ?? 0),
          inferenceTime: Math.round(data.inference_time_ms ?? 0),
        });

        if (data.summary?.no_helmet > 0) {
          const violators = data.detections?.filter((d) => d.class === 'no_helmet') || [];
          const nowMs = Date.now();

          violators.forEach((v, i) => {
            const conf = typeof v.confidence === 'number'
              ? (v.confidence <= 1 ? Math.round(v.confidence * 100) : Math.round(v.confidence))
              : 88;

            const newAlert = {
              id:          nowMs + i,
              severity:    'HIGH',
              message:     `No Helmet Detected — Worker #${v.id ?? '??'}`,
              worker_id:   `Worker #${v.id ?? '??'}`,
              camera_name: selectedCameraRef.current,
              confidence:  conf,
              created_at:  new Date().toISOString(),
              status:      'active',
            };

            setRecentAlerts((prev) => [newAlert, ...prev.filter((a) => a.worker_id !== newAlert.worker_id)].slice(0, 6));

            if (nowMs - lastAlertTimeRef.current > 5000) {
              lastAlertTimeRef.current = nowMs;
              createAlert({
                message: `No Helmet Detected — Worker #${v.id ?? '??'}`,
                worker_id: `Worker #${v.id ?? '??'}`,
                camera_name: selectedCameraRef.current,
                severity: 'HIGH',
                confidence: conf,
                workers: data.summary?.workers || 1,
                helmet: data.summary?.helmet || 0,
                fps: Math.round(data.fps || 30),
              }).then(() => {
                if (refreshAlerts) refreshAlerts();
              }).catch(console.error);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Frame detection skipped/lagging:', err.message);
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 3) {
        const msg = err.response?.data?.error || err.message || 'Cannot reach backend API';
        setApiError(`Inference lag: ${msg}`);
      }
    }
  }, [refreshAlerts]);

  // ---- Snapshot ----
  const handleSnapshot = async () => {
    setIsCapturing(true);
    try {
      if (isIpCam && currentCamObj) {
        const res = await getCameraSnapshot(currentCamObj.id, {
          confidence: confidenceThresholdRef.current,
        });
        if (res.data?.annotated_image) {
          const a = document.createElement('a');
          a.href = res.data.annotated_image;
          a.download = `${currentCamObj.name.replace(/\s+/g, '_')}_snapshot_${Date.now()}.jpg`;
          a.click();
        }
      } else {
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
          a.download = `webcam_snapshot_${Date.now()}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
      }
    } catch (err) {
      console.error('Snapshot error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // ---- Stop monitoring ----
  const handleStop = () => {
    setIsActive(false);
    syncPause(false);
    setCurrentDetections([]);
    setStats({
      workers: 0, helmet: 0, noHelmet: 0, fps: 0, inferenceTime: 0,
    });
  };

  // ---- Derived ----
  const complianceRate = stats.workers > 0
    ? Math.round((stats.helmet / stats.workers) * 100)
    : 100;

  const modelLabel = isDemo ? 'MockDetector (Demo)' : 'YOLOv8n (YOLO Mode)';

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row gap-6 h-full bg-slate-950/20">
      {/* ================================================================ */}
      {/* Left Column — Camera feed                                          */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
              {isIpCam ? <Smartphone className="w-4 h-4 text-green-400" /> : <Laptop className="w-4 h-4 text-blue-400" />}
              <span className="hidden sm:inline">Camera:</span>
            </div>
            <select
              value={selectedCamera}
              onChange={(e) => {
                setSelectedCamera(e.target.value);
                setIpFeedTimestamp(Date.now());
                setCurrentDetections([]);
              }}
              className="bg-slate-800 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
            >
              {cameras.length > 0 ? (
                cameras.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.location ? `(${c.location})` : ''} {c.source !== 'webcam' ? '📱 [IP]' : '💻'}
                  </option>
                ))
              ) : (
                <>
                  <option value="Camera 01">Camera 01 (Main Entrance)</option>
                  <option value="Camera 02">Camera 02 (Mobile Cam Zone A)</option>
                </>
              )}
            </select>
          </div>

          {/* Real-time Confidence Slider */}
          <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium hidden md:inline">Threshold:</span>
            <input
              type="range"
              min="0.20"
              max="0.90"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Confidence threshold: ${Math.round(confidenceThreshold * 100)}%`}
            />
            <span className="text-xs font-mono font-bold text-blue-400 w-8">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isActive && (
              <span className="text-xs text-slate-400 font-mono tabular-nums bg-slate-800 px-2 py-1 rounded border border-slate-700">
                {frameCount.toLocaleString()} frames
              </span>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                const s = prompt('Set confidence threshold (0.20 - 0.90):', confidenceThreshold);
                if (s && !isNaN(parseFloat(s))) setConfidenceThreshold(Math.max(0.2, Math.min(0.9, parseFloat(s))));
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition"
              title="Configure threshold"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Backend API Connection Warning */}
        {apiError && (
          <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 text-xs text-red-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span><strong>Connection Note:</strong> {apiError}</span>
            </div>
            <button onClick={() => setApiError(null)} className="text-red-400 hover:text-white text-xs underline ml-2">Dismiss</button>
          </div>
        )}

        {/* Video Area */}
        <div className="flex-1 relative p-3 sm:p-4 min-h-[300px] flex items-center justify-center bg-slate-950/70">
          {!isActive ? (
            <CameraOfflinePlaceholder />
          ) : isIpCam && currentCamObj ? (
            <div className="relative w-full h-full min-h-[360px] flex items-center justify-center bg-black rounded-lg overflow-hidden border border-slate-800">
              <img
                src={`${getCameraFeedUrl(currentCamObj.id)}?t=${ipFeedTimestamp}`}
                alt={currentCamObj.name}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  setTimeout(() => setIpFeedTimestamp(Date.now()), 3000);
                }}
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>MOBILE IP STREAM</span>
              </div>
            </div>
          ) : (
            <CameraFeed
              onFrame={handleFrame}
              isActive={isActive}
              isPaused={isPaused}
              cameraId={selectedCamera}
              detections={currentDetections}
              frameDimensions={frameDimensions}
            />
          )}

          {/* Paused Overlay */}
          {isActive && isPaused && (
            <div className="absolute inset-4 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-xs pointer-events-none">
              <div className="flex flex-col items-center space-y-2">
                <Pause className="w-10 h-10 text-amber-400" />
                <span className="text-white text-sm font-semibold">Monitoring Paused</span>
              </div>
            </div>
          )}
        </div>

        {/* Control Bar */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/60 flex justify-center items-center space-x-3 shrink-0">
          {!isActive ? (
            <button
              onClick={() => {
                setIsActive(true);
                syncPause(false);
                setFrameCount(0);
                setCurrentDetections([]);
                setIpFeedTimestamp(Date.now());
              }}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Monitoring</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md shadow-red-500/10"
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
                disabled={isCapturing}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium border border-slate-600 transition-colors"
              >
                {isCapturing ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <CameraIcon className="w-4 h-4" />}
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
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Live Safety Status
            </h3>
            {isActive && !isPaused && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            )}
            {isActive && isPaused && (
              <span className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                Paused
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Total Workers</div>
              <div className="text-2xl font-bold font-mono text-white">{stats.workers}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Frames Analyzed</div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {frameCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30">
              <div className="text-green-400 text-xs mb-1">With Helmet</div>
              <div className="text-2xl font-bold font-mono text-green-400">{stats.helmet}</div>
            </div>
            <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30">
              <div className="text-red-400 text-xs mb-1">No Helmet</div>
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
              <span className="text-slate-400">Model Engine</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isDemo
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-green-500/15 text-green-400 border border-green-500/30'
              }`}>
                {modelLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex-1 overflow-hidden flex flex-col shadow-lg">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-slate-200 font-semibold">Live Violations</h3>
            <span className="text-xs text-slate-500">{recentAlerts.length} recent</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                  <span className="text-green-500 text-xl font-bold">✓</span>
                </div>
                <p className="text-slate-400 text-sm font-medium">No violations detected</p>
                {!isActive ? (
                  <p className="text-slate-500 text-xs mt-1">Start monitoring to detect</p>
                ) : (
                  <p className="text-green-400 text-xs mt-1">Site 100% compliant</p>
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
