import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import AlertCard from '../components/AlertCard';
import {
  Users, HardHat, AlertTriangle, Activity, Cpu, Server,
  Video, Upload, BarChart2, Camera as CameraIcon, Database,
  Shield, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
const Skeleton = () => (
  <div className="space-y-6 animate-pulse" role="status" aria-label="Loading dashboard">
    {/* KPI row */}
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-28 bg-dark-surface rounded-xl border border-dark-border" />
      ))}
    </div>
    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-dark-surface rounded-xl border border-dark-border" />
      <div className="h-64 bg-dark-surface rounded-xl border border-dark-border" />
    </div>
    {/* Bottom row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-48 bg-dark-surface rounded-xl border border-dark-border" />
      <div className="h-48 bg-dark-surface rounded-xl border border-dark-border" />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// KPI border-bottom color map
// ---------------------------------------------------------------------------
const KPI_BORDER = {
  blue:   'border-b-primary-500',
  green:  'border-b-success-500',
  red:    'border-b-error-500',
  amber:  'border-b-warning-500',
  purple: 'border-b-secondary-500',
};

// ---------------------------------------------------------------------------
// System status row component
// ---------------------------------------------------------------------------
const StatusRow = ({ icon: Icon, label, sub, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3 min-w-0">
      <div className="p-2 bg-dark-elevated/60 rounded-lg shrink-0">
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-200 truncate">{label}</div>
        <div className="text-xs text-slate-400 truncate">{sub}</div>
      </div>
    </div>
    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ml-2 ${
      color === 'green' ? 'bg-success-500' :
      color === 'amber' ? 'bg-warning-500' :
                          'bg-error-500'
    }`} />
  </div>
);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
      setError(null);
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError('Could not connect to the backend. Is the Flask server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  // ---- Loading skeleton ----
  if (loading) return <Skeleton />;

  // ---- Error state ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Shield className="w-16 h-16 text-slate-600" />
        <p className="text-slate-400 text-center max-w-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ---- Derived data ----
  const kpis           = stats?.kpis          || {};
  const complianceTrend = stats?.compliance_trend || [];
  const helmetTrend     = stats?.helmet_trend     || [];
  const recentAlerts    = stats?.recent_alerts    || [];
  const sysStatus       = stats?.system_status    || {};

  const complianceColor = (kpis.compliance_rate ?? 0) >= 90 ? 'green' : 'amber';

  const kpiCards = [
    {
      title: 'Workers Detected',
      value: kpis.workers_detected ?? 0,
      icon:  Users,
      color: 'blue',
    },
    {
      title: 'Helmet Detected',
      value: kpis.helmet_detected ?? 0,
      icon:  HardHat,
      color: 'green',
    },
    {
      title: 'No Helmet',
      value: kpis.no_helmet ?? 0,
      icon:  AlertTriangle,
      color: 'red',
    },
    {
      title: 'Compliance Rate',
      value: kpis.compliance_rate ?? 0,
      unit:  '%',
      icon:  Activity,
      color: complianceColor,
    },
    {
      title: 'Avg Confidence',
      value: kpis.avg_confidence ?? 0,
      unit:  '%',
      icon:  Cpu,
      color: 'purple',
    },
    {
      title: 'Processing FPS',
      value: kpis.current_fps ?? 0,
      icon:  Server,
      color: 'blue',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Page header                                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Safety Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time helmet compliance monitoring</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-dark-surface hover:bg-dark-elevated border border-dark-border rounded-lg transition-colors"
          title="Refresh now"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* KPI Cards (color-coded border-bottom)                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ title, value, unit, icon, color }) => (
          <div
            key={title}
            className={`border-b-2 ${KPI_BORDER[color] ?? 'border-b-slate-600'} rounded-xl overflow-hidden`}
          >
            <StatCard
              title={title}
              value={value}
              unit={unit}
              icon={icon}
              color={color}
            />
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance trend */}
        <ChartCard title="Compliance Trend — Last 7 Days">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={complianceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8, color: '#f8fafc' }}
                formatter={(val) => [`${val}%`, 'Compliance']}
              />
              <Line
                type="monotone"
                dataKey="compliance"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Helmet vs No-Helmet */}
        <ChartCard title="Helmet vs No-Helmet — Last 7 Days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={helmetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
              <Bar dataKey="helmet"    name="Helmet ✓"    fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="no_helmet" name="No Helmet ✗" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Bottom Row — Recent Alerts + System Status                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">Recent Alerts</h3>
            <Link
              to="/alerts"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              View All →
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="bg-dark-surface rounded-xl border border-dark-border p-8 text-center">
              <Shield className="w-10 h-10 text-success-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No active alerts — all workers compliant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <AlertCard key={alert.worker_id + alert.created_at} alert={alert} compact />
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* System Status */}
          <h3 className="text-lg font-semibold text-slate-200">System Status</h3>
          <div className="bg-dark-surface rounded-xl border border-dark-border p-5 space-y-4">
            <StatusRow
              icon={Server}
              label="Backend"
              sub={sysStatus.backend === 'online' ? 'Running' : 'Unavailable'}
              color={sysStatus.backend === 'online' ? 'green' : 'red'}
            />
            <StatusRow
              icon={Database}
              label="Database"
              sub={sysStatus.database === 'online' ? 'Connected' : 'Disconnected'}
              color={sysStatus.database === 'online' ? 'green' : 'red'}
            />
            <StatusRow
              icon={Cpu}
              label="ML Service"
              sub={
                sysStatus.ml_service === 'online'
                  ? (stats?.is_demo ? 'Mock Mode (Demo)' : 'YOLOv8n Active')
                  : 'Unavailable'
              }
              color={sysStatus.ml_service === 'online' ? (stats?.is_demo ? 'amber' : 'green') : 'red'}
            />
            <StatusRow
              icon={CameraIcon}
              label="Cameras"
              sub={`${sysStatus.cameras_active ?? 0} Active / ${sysStatus.total_cameras ?? 0} Total`}
              color={
                (sysStatus.cameras_active ?? 0) > 0
                  ? 'green'
                  : (sysStatus.total_cameras ?? 0) > 0
                    ? 'amber'
                    : 'red'
              }
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/live"
              className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white rounded-lg transition-all font-medium text-sm shadow-sm"
            >
              <Video className="w-4 h-4" />
              Live Monitor
            </Link>
            <Link
              to="/image"
              className="flex items-center justify-center gap-2 p-3 bg-dark-elevated hover:bg-slate-600 text-white rounded-lg transition-colors font-medium text-sm border border-dark-border"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </Link>
            <Link
              to="/analytics"
              className="flex items-center justify-center gap-2 p-3 bg-dark-elevated hover:bg-slate-600 text-white rounded-lg transition-colors font-medium text-sm border border-dark-border"
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              to="/reports"
              className="flex items-center justify-center gap-2 p-3 bg-dark-elevated hover:bg-slate-600 text-white rounded-lg transition-colors font-medium text-sm border border-dark-border"
            >
              <Shield className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
