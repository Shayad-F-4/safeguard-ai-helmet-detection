import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { useDetection } from '../hooks/useDetection';
import DetectionViewer from '../components/DetectionViewer';

const ImageDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { loading, result, error, detect, reset } = useDetection();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      reset();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      reset();
    }
  };

  const handleDetect = () => {
    if (selectedFile) {
      detect(selectedFile, 'image');
    }
  };

  const handleSaveResult = () => {
    if (!result) return;
    if (result.processed_image_url) {
      const a = document.createElement('a');
      a.href = result.processed_image_url;
      a.download = `safeguard-detected-${selectedFile?.name || 'result.jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safeguard-detection-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-medium text-slate-200 mb-4">Upload Image for Detection</h2>
        
        {!previewUrl ? (
          <div 
            className="border-2 border-dashed border-slate-600 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
            <p className="text-slate-300 font-medium mb-1">Drag and drop an image here</p>
            <p className="text-slate-500 text-sm mb-4">PNG, JPG, JPEG up to 10MB</p>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Browse Files
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-3">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300 text-sm truncate max-w-xs">{selectedFile?.name}</span>
                <span className="text-slate-500 text-xs">({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); reset(); }} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                  Clear
                </button>
                <button onClick={handleDetect} disabled={loading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded text-sm font-medium transition-colors flex items-center">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Run Detection'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">Original Image</h3>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 h-80 flex items-center justify-center">
                  <img src={previewUrl} alt="Original" className="max-w-full max-h-full object-contain rounded" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">Detection Result</h3>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 h-80 flex items-center justify-center relative">
                  {loading ? (
                    <div className="flex flex-col items-center text-blue-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm">AI Model Processing...</span>
                    </div>
                  ) : result ? (
                    <DetectionViewer imageUrl={result.processed_image_url || previewUrl} detections={result.detections} className="w-full h-full border-none" />
                  ) : (
                    <div className="text-slate-600 text-sm">Run detection to see results</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-slate-200">Detection Analysis</h3>
            <button
              onClick={handleSaveResult}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors border border-slate-600 shadow-sm"
            >
              <Download className="w-4 h-4" /> <span>Save Result</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Bug fix: API returns summary.workers, not summary.total_workers */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
              <div className="text-slate-400 text-xs uppercase mb-1">Total Workers</div>
              <div className="text-2xl font-mono text-white">
                {result.summary?.workers ?? 0}
              </div>
            </div>
            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
              <div className="text-green-500 text-xs uppercase mb-1">Helmet</div>
              <div className="text-2xl font-mono text-green-400">
                {result.summary?.helmet ?? 0}
              </div>
            </div>
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
              <div className="text-red-500 text-xs uppercase mb-1">No Helmet</div>
              <div className="text-2xl font-mono text-red-400">
                {result.summary?.no_helmet ?? 0}
              </div>
            </div>
            <div className={`p-4 rounded-lg border text-center ${
              (result.summary?.compliance_rate ?? 0) >= 80
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="text-slate-400 text-xs uppercase mb-1">Compliance</div>
              <div className={`text-2xl font-mono font-bold ${
                (result.summary?.compliance_rate ?? 0) >= 80 ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.summary?.compliance_rate ?? 0}%
              </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
              <div className="text-slate-400 text-xs uppercase mb-1">Avg Confidence</div>
              <div className="text-2xl font-mono text-white">
                {result.detections?.length > 0
                  ? (result.detections.reduce((sum, d) => sum + (d.confidence <= 1 ? d.confidence * 100 : d.confidence), 0) / result.detections.length).toFixed(1)
                  : '—'}%
              </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
              <div className="text-slate-400 text-xs uppercase mb-1">Inference Time</div>
              <div className="text-2xl font-mono text-white">
                {result.inference_time_ms ? `${Math.round(result.inference_time_ms)}ms` : '—'}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ImageDetection;
