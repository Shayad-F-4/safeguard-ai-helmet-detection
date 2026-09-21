import React, { useState, useRef } from 'react';
import { UploadCloud, Film, Download, Loader2, PlayCircle } from 'lucide-react';
import { useDetection } from '../hooks/useDetection';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VideoDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { loading, result, error, detect, reset } = useDetection();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      reset();
      setProgress(0);
    }
  };

  const handleDetect = async () => {
    if (selectedFile) {
      // Simulate progress since actual Axios onUploadProgress is for upload, not processing
      setProgress(10);
      const interval = setInterval(() => {
        setProgress(p => (p < 90 ? p + Math.random() * 10 : p));
      }, 500);
      
      await detect(selectedFile, 'video');
      clearInterval(interval);
      setProgress(100);
    }
  };

  // Mock chart data if result exists
  const chartData = [
    { frame: '0s', violations: 0 }, { frame: '5s', violations: 2 }, { frame: '10s', violations: 1 },
    { frame: '15s', violations: 4 }, { frame: '20s', violations: 0 }, { frame: '25s', violations: 0 }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-medium text-slate-200 mb-4">Batch Video Processing</h2>
        
        {!previewUrl ? (
          <div 
            className="border-2 border-dashed border-slate-600 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Film className="w-12 h-12 text-slate-400 mb-4" />
            <p className="text-slate-300 font-medium mb-1">Click to select video</p>
            <p className="text-slate-500 text-sm mb-4">MP4, AVI, MOV up to 100MB</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 flex items-center justify-center relative">
                {result && result.processed_video_url ? (
                  <video src={result.processed_video_url} controls className="max-w-full max-h-96 rounded" />
                ) : (
                  <video src={previewUrl} controls className="max-w-full max-h-96 rounded opacity-80" />
                )}
                {loading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded z-10">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <div className="w-64 bg-slate-700 rounded-full h-2.5 mb-2">
                      <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-blue-400 font-medium">{Math.round(progress)}% Processing</span>
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-80 space-y-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                    <Film className="w-4 h-4 mr-2 text-slate-400" /> Video Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-slate-300 truncate max-w-[150px]">{selectedFile?.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="text-slate-300">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</span></div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-700 space-y-3">
                    <button onClick={handleDetect} disabled={loading || result} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded text-sm font-medium transition-colors flex items-center justify-center">
                      <PlayCircle className="w-4 h-4 mr-2" /> Start Processing
                    </button>
                    <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); reset(); }} disabled={loading} className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors border border-slate-600">
                      Cancel / Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}
          </div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Violation Timeline</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="frame" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                  <Area type="monotone" dataKey="violations" stroke="#ef4444" fillOpacity={1} fill="url(#colorViolations)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Processing Summary</h3>
            <div className="space-y-4 flex-1">
              {[
                {
                  label: 'Total Workers',
                  value: result.summary?.workers ?? result.video_stats?.total_detections ?? 0,
                  cls: 'bg-slate-900 border-slate-700 text-white',
                },
                {
                  label: 'Helmet ✓',
                  value: result.summary?.helmet ?? result.video_stats?.helmet_detections ?? 0,
                  cls: 'bg-green-500/10 border-green-500/20 text-green-400',
                },
                {
                  label: 'No Helmet ✗',
                  value: result.summary?.no_helmet ?? result.video_stats?.no_helmet_detections ?? 0,
                  cls: 'bg-red-500/10 border-red-500/20 text-red-400',
                },
                {
                  label: 'Compliance',
                  value: `${result.summary?.compliance_rate ?? result.video_stats?.compliance_rate ?? 0}%`,
                  cls: (result.summary?.compliance_rate ?? 0) >= 80
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400',
                },
                {
                  label: 'Avg Confidence',
                  value: result.detections?.length > 0
                    ? `${(result.detections.reduce((s, d) => s + (d.confidence <= 1 ? d.confidence * 100 : d.confidence), 0) / result.detections.length).toFixed(1)}%`
                    : (result.video_stats?.average_confidence ? `${result.video_stats.average_confidence}%` : '—'),
                  cls: 'bg-slate-900 border-slate-700 text-white',
                },
                {
                  label: 'Processing Speed',
                  value: result.fps ? `${Math.round(result.fps)} fps` : (result.video_stats?.video_fps ? `${result.video_stats.video_fps} fps` : '—'),
                  cls: 'bg-slate-900 border-slate-700 text-white',
                },
                {
                  label: 'Inference Time',
                  value: result.inference_time_ms ? `${Math.round(result.inference_time_ms)}ms` : '—',
                  cls: 'bg-slate-900 border-slate-700 text-white',
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`flex justify-between p-3 rounded-lg border ${cls}`}>
                  <span className="text-slate-400">{label}</span>
                  <span className="font-mono font-bold">{value}</span>
                </div>
              ))}
            </div>

            <button className="mt-4 w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded flex items-center justify-center transition-colors">
              <Download className="w-4 h-4 mr-2" /> Download Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDetection;
