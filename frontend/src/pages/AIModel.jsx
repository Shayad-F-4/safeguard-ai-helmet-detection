import React from 'react';
import { Cpu, CheckCircle2, Box, Database, Zap, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AIModel = () => {
  const { isDemo } = useAppContext();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">AI MODEL INTEGRATION STATUS</h1>
        <div className="inline-flex items-center px-4 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-full font-bold tracking-widest text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-2"></span>
          MOCK MODE — INTEGRATION READY
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center mb-6">
            <Box className="w-5 h-5 mr-2 text-blue-500" /> Model Specifications
          </h2>
          <ul className="space-y-4">
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Model Name</span>
              <span className="font-medium text-slate-200">YOLOv8n</span>
            </li>
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Model Type</span>
              <span className="font-medium text-slate-200">Object Detection</span>
            </li>
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Framework</span>
              <span className="font-medium text-slate-200">Ultralytics YOLO</span>
            </li>
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Deep Learning</span>
              <span className="font-medium text-slate-200">PyTorch</span>
            </li>
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Dataset</span>
              <span className="font-medium text-slate-200">Hard Hat Workers / PPE</span>
            </li>
            <li className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400">Integration</span>
              <span className="font-medium text-slate-200">Flask ML Service</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Current Mode</span>
              <span className="font-bold text-amber-500">MOCK / DEMO</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center mb-6">
            <Zap className="w-5 h-5 mr-2 text-blue-500" /> Performance Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 opacity-60">
              <div className="text-slate-500 text-sm mb-1">mAP50-95</div>
              <div className="text-2xl font-mono text-slate-300">—</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 opacity-60">
              <div className="text-slate-500 text-sm mb-1">Precision</div>
              <div className="text-2xl font-mono text-slate-300">—</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 opacity-60">
              <div className="text-slate-500 text-sm mb-1">Recall</div>
              <div className="text-2xl font-mono text-slate-300">—</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-sm mb-1">Input Resolution</div>
              <div className="text-xl font-mono text-white mt-1">640×640</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-sm mb-1">Inference Target</div>
              <div className="text-xl font-mono text-white mt-1">&lt; 50ms</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-slate-500 text-sm mb-1">Target FPS</div>
              <div className="text-xl font-mono text-white mt-1">30+</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center mb-6">
          <BookOpen className="w-5 h-5 mr-2 text-blue-500" /> Integration Guide
        </h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-4">1</div>
            <div>
              <h3 className="text-slate-200 font-medium">Train Model in Google Colab</h3>
              <p className="text-slate-400 text-sm mt-1">Run the provided YOLOv8 training notebook with your dataset. Train for at least 50 epochs.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-4">2</div>
            <div>
              <h3 className="text-slate-200 font-medium">Download Weights</h3>
              <p className="text-slate-400 text-sm mt-1">Download the generated <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">best.pt</code> file from the runs/detect/train/weights directory.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-4">3</div>
            <div>
              <h3 className="text-slate-200 font-medium">Copy to Backend</h3>
              <p className="text-slate-400 text-sm mt-1">Place the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">best.pt</code> file in the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">backend/models/</code> folder of this project.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-4">4</div>
            <div>
              <h3 className="text-slate-200 font-medium">Update Environment Variable</h3>
              <p className="text-slate-400 text-sm mt-1">Open <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">backend/.env</code> and change <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">ML_MODE=mock</code> to <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400">ML_MODE=yolo</code>.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mr-4">5</div>
            <div>
              <h3 className="text-slate-200 font-medium">Restart Backend</h3>
              <p className="text-slate-400 text-sm mt-1">Restart the Flask service to load the real PyTorch model.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
{`ARCHITECTURE:
[Web/Mobile Cam] ---> [Frontend (React/Vite)] ---> [Backend API (Flask)] ---> [YOLOv8 Model (PyTorch)]
                                                         |
                                                         v
                                                   [SQLite DB]`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AIModel;
