import React, { useState, useEffect } from 'react';
import ChartCard from '../components/ChartCard';
import { getAnalytics } from '../services/api';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart2, TrendingUp, Shield, AlertTriangle, Cpu, Clock, RefreshCw } from 'lucide-react';
import { formatDateTime, timeAgo } from '../utils/helpers';

const TOOLTIP_STYLE = { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' };

const Analytics = () => {
  const [period, setPeriod] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await getAnalytics(period);
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  // Background auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, period]);

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            Safety Analytics & Trends
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time compliance trends, violation patterns, and camera statistics
            {lastUpdated && (
              <span className="text-slate-500 ml-2">
                · Updated: {formatDateTime(lastUpdated)} ({timeAgo(lastUpdated)})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-green-500/15 text-green-300 border-green-500/30'
                : 'bg-slate-700 text-slate-400 border-slate-600'
            }`}
            title="Auto-sync analytics with live detections"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            Auto-Sync {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => fetchAnalytics(false)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Detections', value: summary.total_detections ?? '—', icon: BarChart2, color: 'text-blue-400' },
          { label: 'Total Violations', value: summary.total_violations ?? '—', icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Avg Compliance', value: summary.avg_compliance ? `${summary.avg_compliance}%` : '—', icon: Shield, color: 'text-green-400' },
          { label: 'Avg Confidence', value: summary.avg_confidence ? `${summary.avg_confidence}%` : '—', icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Avg FPS', value: summary.avg_fps ?? '—', icon: Cpu, color: 'text-amber-400' },
          { label: 'Avg Inference', value: summary.avg_inference_ms ? `${summary.avg_inference_ms}ms` : '—', icon: Clock, color: 'text-slate-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <div className="text-slate-400 text-xs mb-1">{label}</div>
            <div className="text-xl font-bold font-mono text-white">{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-800 rounded-xl border border-slate-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Trend */}
          <ChartCard title="Helmet Compliance Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.compliance_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Compliance']} />
                <Line type="monotone" dataKey="compliance_rate" name="Compliance %" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Helmet vs No-Helmet */}
          <ChartCard title="Helmet vs No-Helmet Detections">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.helmet_vs_no_helmet || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="helmet" name="Helmet ✓" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="no_helmet" name="No Helmet ✗" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Violations Over Time */}
          <ChartCard title="Safety Violations Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.violations_trend || []}>
                <defs>
                  <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="violations" name="Violations" stroke="#ef4444" fill="url(#violGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Confidence Distribution */}
          <ChartCard title="Detection Confidence Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.confidence_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#334155' }} />
                <Bar dataKey="count" name="Detections" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* FPS Trend */}
          <ChartCard title="Processing FPS Performance">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.fps_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} fps`, 'FPS']} />
                <Line type="monotone" dataKey="fps" name="FPS" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Camera Violations */}
          <ChartCard title="Camera-wise Violations">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.camera_violations || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis dataKey="camera" type="category" stroke="#94a3b8" width={90} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="violations" name="Violations" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default Analytics;
