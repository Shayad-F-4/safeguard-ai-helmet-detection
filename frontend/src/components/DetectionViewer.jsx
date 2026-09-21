import React, { useRef, useEffect, useState } from 'react';

/**
 * DetectionViewer — renders an image with bounding box overlays.
 * 
 * Supports our API's bbox format: { x1, y1, x2, y2 } in absolute pixels.
 * Uses a canvas overlay that scales boxes to match the displayed image size.
 */
const DetectionViewer = ({ imageUrl, detections = [], className = '' }) => {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });

  const drawBoxes = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !detections.length) return;

    const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = img;
    if (!naturalWidth || !naturalHeight) return;

    canvas.width = offsetWidth;
    canvas.height = offsetHeight;

    const scaleX = offsetWidth / naturalWidth;
    const scaleY = offsetHeight / naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const bbox = det.bbox || {};
      const x1 = (bbox.x1 ?? 0) * scaleX;
      const y1 = (bbox.y1 ?? 0) * scaleY;
      const x2 = (bbox.x2 ?? 100) * scaleX;
      const y2 = (bbox.y2 ?? 100) * scaleY;
      const w = x2 - x1;
      const h = y2 - y1;

      const isHelmet = det.class === 'helmet';
      const color = isHelmet ? '#22c55e' : '#ef4444';
      const conf = typeof det.confidence === 'number'
        ? (det.confidence <= 1 ? (det.confidence * 100).toFixed(0) : det.confidence.toFixed(0))
        : '?';
      const label = `${isHelmet ? '✓ Helmet' : '✗ No Helmet'} ${conf}%`;

      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, w, h);

      // Box fill (very transparent)
      ctx.fillStyle = isHelmet ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
      ctx.fillRect(x1, y1, w, h);

      // Label background
      const fontSize = Math.max(11, Math.min(14, w / 8));
      ctx.font = `bold ${fontSize}px monospace`;
      const textW = ctx.measureText(label).width + 8;
      const labelH = fontSize + 6;
      const labelY = y1 > labelH ? y1 - labelH : y1 + 2;

      ctx.fillStyle = color;
      ctx.fillRect(x1 - 1, labelY, textW, labelH);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x1 + 3, labelY + labelH - 4);

      // Worker number
      const wNum = det.id ?? '';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x1 + w - 22, y1 + 2, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 11px monospace`;
      ctx.fillText(`#${wNum}`, x1 + w - 20, y1 + 14);
    });
  };

  useEffect(() => {
    // Re-draw when detections or image changes
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      drawBoxes();
    } else {
      img.onload = drawBoxes;
    }
  }, [detections, imageUrl]);

  useEffect(() => {
    // Handle window resize
    const handleResize = () => drawBoxes();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detections]);

  return (
    <div className={`relative overflow-hidden bg-slate-900 rounded-lg flex items-center justify-center ${className}`}
      style={{ minHeight: 280 }}>
      {imageUrl ? (
        <>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Detection"
            className="max-w-full max-h-full object-contain"
            onLoad={drawBoxes}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          />
        </>
      ) : (
        <div className="text-slate-500 text-sm">No image loaded</div>
      )}
    </div>
  );
};

export default DetectionViewer;
