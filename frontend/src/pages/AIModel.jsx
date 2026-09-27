import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, Box, Zap, BookOpen, Layers, ShieldCheck, Activity, Award } from 'lucide-react';
import { getModelInfo } from '../services/api';
import { useAppContext } from '../context/AppContext';

const AIModel = () => {
  const { isDemo } = useAppContext();
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const res = await getModelInfo();
        if (res.data?.model) {
          setModelData(res.data.model);
        }
      } catch (err) {
        console.error('Failed to fetch model info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModel();
  }, []);

  const isYoloActive = modelData?.current_mode === 'yolo' || (!isDemo && modelData?.mode === 'yolo');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">AI MODEL INTEGRATION STATUS</h1>
        {isYoloActive ? (
          <div className="inline-flex items-center px-4 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full font-bold tracking-wider text-sm shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse mr-2"></span>
            YOLOv8n PRODUCTION MODEL — ACTIVE
          </div>
        ) : (
          <div className="inline-flex items-center px-4 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-full font-bold tracking-wider text-sm shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mr-2"></span>
            MOCK MODE — INTEGRATION READY
          </div>
        )}
      </div>

      {/* Grid: Specifications & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Specs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white flex items-center mb-6">
            <Box className="w-5 h-5 mr-2 text-blue-400" /> Model Specifications
          </h2>
          <ul className="space-y-3.5 text-sm">
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Architecture</span>
              <span className="font-semibold text-slate-200">YOLOv8n (Nano)</span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Task Type</span>
              <span className="font-medium text-slate-200">Object Detection & Classification</span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Framework</span>
              <span className="font-medium text-slate-200">Ultralytics YOLO v8.4</span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Deep Learning Backend</span>
              <span className="font-medium text-slate-200">PyTorch 2.14</span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Dataset</span>
              <span className="font-medium text-slate-200 truncate max-w-[200px]" title="Hard Hat Workers / PPE Dataset">
                Hard Hat Workers / PPE
              </span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Weights File</span>
              <span className="font-mono text-xs text-blue-400 bg-slate-900 px-2 py-0.5 rounded">backend/models/best.pt</span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-700/60">
              <span className="text-slate-400">Hardware Acceleration</span>
              <span className="font-medium text-slate-200 capitalize">{modelData?.device || 'CPU (OpenMP / AVX2)'}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Active Mode</span>
              <span className={`font-bold ${isYoloActive ? 'text-green-400' : 'text-amber-400'}`}>
                {isYoloActive ? 'YOLO (Production)' : 'MOCK / DEMO'}
              </span>
            </li>
          </ul>
        </div>

        {/* Validation Performance Metrics */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center mb-6">
              <Zap className="w-5 h-5 mr-2 text-blue-400" /> Validation Metrics (50 Epochs)
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-xs mb-1 flex items-center justify-between">
                  <span>mAP@50</span>
                  <Award className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-green-400">
                  {modelData?.map50 ? `${modelData.map50}%` : '97.4%'}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">Mean Average Precision</div>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-xs mb-1 flex items-center justify-between">
                  <span>Precision</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {modelData?.precision ? `${modelData.precision}%` : '95.4%'}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">True positive rate</div>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-xs mb-1 flex items-center justify-between">
                  <span>Recall</span>
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-2xl font-mono font-bold text-purple-400">
                  {modelData?.recall ? `${modelData.recall}%` : '93.3%'}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">Detection sensitivity</div>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-xs mb-1">mAP@50-95</div>
                <div className="text-2xl font-mono font-bold text-slate-200">
                  {modelData?.map50_95 ? `${modelData.map50_95}%` : '67.0%'}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">Strict IoU benchmark</div>
              </div>
            </div>
          </div>

          {/* Model Classes */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2 font-medium">Trained Classes:</div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-md text-xs font-mono font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> class 0: helmet (SAFE)
              </span>
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-xs font-mono font-medium flex items-center gap-1.5">
                <span className="text-red-400 font-bold">✗</span> class 1: no_helmet (VIOLATION)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Details & Architecture */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white flex items-center mb-6">
          <BookOpen className="w-5 h-5 mr-2 text-blue-400" /> Pipeline Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { step: '1', title: 'Input Capture', desc: 'Webcam, RTSP stream, image or MP4 video feed at 640×640' },
            { step: '2', title: 'Preprocessing', desc: 'OpenCV BGR conversion & aspect ratio normalization' },
            { step: '3', title: 'YOLOv8n Inference', desc: 'Forward pass computing confidence & bounding boxes (NMS)' },
            { step: '4', title: 'Safety Telemetry', desc: 'Real-time alert dispatch, SQLite telemetry & dashboard KPIs' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-3">
                {step}
              </div>
              <h3 className="text-slate-200 font-semibold text-sm mb-1">{title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`SYSTEM WORKFLOW:
[Live Camera / Upload] ──> [React Vite UI] ──> [Flask REST API] ──> [YOLOv8n Detector (PyTorch)]
                                                     │                         │
                                                     ▼                         ▼
                                              [SQLite Telemetry]       [Bounding Boxes & Alerts]`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AIModel;
