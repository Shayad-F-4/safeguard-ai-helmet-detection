import React, { useRef, useEffect, useState, useCallback } from 'react';

const CameraFeed = ({
  onFrame,
  isActive,
  isPaused = false,
  cameraId = 'default',
  detections = [],
  frameDimensions = { width: 640, height: 480 },
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const [error, setError] = useState(null);
  const isProcessingRef = useRef(false);
  const isPausedRef = useRef(isPaused);

  // Keep isPausedRef in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Compute rendered video rectangle inside container (accounting for letterboxing)
  const getRenderedRect = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return null;

    const cRect = container.getBoundingClientRect();
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    const cRatio = cRect.width / cRect.height;
    const vRatio = vw / vh;

    let width, height, left, top;
    if (vRatio > cRatio) {
      width = cRect.width;
      height = width / vRatio;
      left = 0;
      top = (cRect.height - height) / 2;
    } else {
      height = cRect.height;
      width = height * vRatio;
      left = (cRect.width - width) / 2;
      top = 0;
    }

    return { width, height, left, top, containerW: cRect.width, containerH: cRect.height };
  }, []);

  // Draw detections onto the overlay canvas
  const drawBoxes = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = getRenderedRect();
    if (!rect) return;

    canvas.width = rect.containerW;
    canvas.height = rect.containerH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections || detections.length === 0 || isPausedRef.current) return;

    const srcW = frameDimensions?.width || 640;
    const srcH = frameDimensions?.height || 480;
    const scaleX = rect.width / srcW;
    const scaleY = rect.height / srcH;

    detections.forEach((det) => {
      const bbox = det.bbox || {};
      const x1 = rect.left + (bbox.x1 ?? 0) * scaleX;
      const y1 = rect.top + (bbox.y1 ?? 0) * scaleY;
      const x2 = rect.left + (bbox.x2 ?? 0) * scaleX;
      const y2 = rect.top + (bbox.y2 ?? 0) * scaleY;
      const w = Math.max(0, x2 - x1);
      const h = Math.max(0, y2 - y1);

      const isHelmet = det.class === 'helmet';
      const color = isHelmet ? '#22c55e' : '#ef4444';
      const conf =
        typeof det.confidence === 'number'
          ? det.confidence <= 1
            ? (det.confidence * 100).toFixed(0)
            : det.confidence.toFixed(0)
          : '';
      const label = `${isHelmet ? '✓ Helmet' : '✗ No Helmet'}${conf ? ` ${conf}%` : ''}`;

      // Bounding box border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, w, h);

      // Semi-transparent box fill
      ctx.fillStyle = isHelmet ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(x1, y1, w, h);

      // Label background & text
      const fontSize = Math.max(11, Math.min(14, Math.round(w / 7)));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(label);
      const labelW = textMetrics.width + 10;
      const labelH = fontSize + 8;
      const labelY = y1 >= labelH ? y1 - labelH : y1;

      ctx.fillStyle = color;
      ctx.fillRect(x1, labelY, labelW, labelH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x1 + 5, labelY + fontSize);

      // Worker ID badge
      if (det.id) {
        const idLabel = `#${det.id}`;
        ctx.font = 'bold 11px sans-serif';
        const idMetrics = ctx.measureText(idLabel);
        const idW = idMetrics.width + 8;
        const idH = 18;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x1 + w - idW, y1 + 2, idW, idH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(idLabel, x1 + w - idW + 4, y1 + 14);
      }
    });
  }, [detections, frameDimensions, getRenderedRect]);

  // Redraw whenever detections or pause state changes
  useEffect(() => {
    drawBoxes();
  }, [drawBoxes]);

  // Window resize handler for overlay
  useEffect(() => {
    const handleResize = () => drawBoxes();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawBoxes]);

  // Camera stream and capture loop
  useEffect(() => {
    let stream = null;
    let captureTimer = null;
    let isLoopActive = true;
    let isMounted = true;

    const startCamera = async () => {
      try {
        setError(null);
        let s = null;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch (err) {
          s = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!isMounted) {
          if (s) s.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video auto-play interrupted:', playErr);
          }
        }

        // Adaptive sequential frame capture loop
        // Avoids flooding Render CPU and drastically minimizes WAN transfer latency

        const captureNextFrame = async () => {
          if (!isMounted || !isLoopActive) return;

          if (!isPausedRef.current) {
            const video = videoRef.current;
            const canvas = captureCanvasRef.current;
            if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
              try {
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                // 352px width max: ~10KB payload (dramatically lowers WAN transfer latency)
                // Minimizes roundtrip lag to ~150-250ms while preserving full YOLO accuracy
                const maxDim = 352;
                const scale = Math.min(1, maxDim / Math.max(vw, vh));
                const targetW = Math.round(vw * scale);
                const targetH = Math.round(vh * scale);

                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, targetW, targetH);

                const base64Frame = canvas.toDataURL('image/jpeg', 0.52);
                if (onFrame && isMounted && isLoopActive) {
                  await onFrame(base64Frame, { width: targetW, height: targetH });
                }
              } catch (captureErr) {
                console.error('Frame capture error:', captureErr);
              }
            }
          }

          // Schedule next frame immediately after current finishes (60ms micro-pause for smooth UI)
          if (isMounted && isLoopActive) {
            captureTimer = setTimeout(captureNextFrame, 60);
          }
        };

        // Start capture loop
        captureTimer = setTimeout(captureNextFrame, 100);
      } catch (err) {
        if (isMounted) {
          setError('Camera access denied or unavailable: ' + (err.message || 'Unknown error'));
          console.error('Camera error:', err);
        }
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      isMounted = false;
      isLoopActive = false;
      if (captureTimer) clearTimeout(captureTimer);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      // Clear overlay canvas
      const oc = overlayCanvasRef.current;
      if (oc) {
        const ctx = oc.getContext('2d');
        ctx.clearRect(0, 0, oc.width, oc.height);
      }
    };
  }, [isActive, cameraId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[360px] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center select-none"
    >
      {error && (
        <div className="text-red-400 text-sm text-center p-6 max-w-md bg-red-950/40 border border-red-800/50 rounded-lg">
          {error}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`max-w-full max-h-full object-contain ${isActive && !error ? 'block' : 'hidden'}`}
      />

      {/* Overlay Canvas for Real-time Bounding Boxes */}
      <canvas
        ref={overlayCanvasRef}
        className={`absolute inset-0 pointer-events-none ${isActive && !error ? 'block' : 'hidden'}`}
      />

      {/* Offscreen Canvas for Frame Capture */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Live Badge */}
      {isActive && !error && !isPaused && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm border border-slate-700/50 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span>LIVE</span>
        </div>
      )}

      {/* Paused Badge */}
      {isActive && !error && isPaused && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm border border-amber-600/50 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-400 shadow-lg">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          <span>PAUSED</span>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
