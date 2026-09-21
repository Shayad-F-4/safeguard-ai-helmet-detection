import React, { useRef, useEffect, useState } from 'react';

const CameraFeed = ({ onFrame, isActive, cameraId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let intervalId = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        intervalId = setInterval(() => {
          if (videoRef.current && canvasRef.current && isActive) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const base64Frame = canvasRef.current.toDataURL('image/jpeg', 0.8);
            if (onFrame) onFrame(base64Frame);
          }
        }, 500); // 2 FPS
        
      } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error(err);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, cameraId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {error && <div className="text-red-500 text-center p-4">{error}</div>}
      <video ref={videoRef} autoPlay playsInline muted className={`max-w-full max-h-full ${isActive ? 'block' : 'hidden'}`} />
      <canvas ref={canvasRef} className="hidden" />
      
      {!isActive && !error && (
        <div className="text-slate-500 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <p>Camera is offline. Click Start to connect.</p>
        </div>
      )}
      
      {isActive && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 px-3 py-1.5 rounded-full text-xs font-bold text-white">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span>LIVE</span>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
