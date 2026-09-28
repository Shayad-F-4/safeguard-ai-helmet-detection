import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Printer, Loader2, Shield, AlertTriangle, Users,
  CheckCircle, RefreshCw, Clock, Camera, MapPin, Eye, CheckCircle2
} from 'lucide-react';
import { generateReport } from '../services/api';
import { formatDateTime, formatDate, formatTimestamp, timeAgo } from '../utils/helpers';

const Reports = () => {
  const [type, setType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleGenerate = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const res = await generateReport({
        report_type: type,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setReport(res.data.report);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isBackground) setError('Failed to generate report. Please verify connection to backend.');
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [type, startDate, endDate]);

  // Initial load and auto-generate when type changes
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Background auto-refresh polling every 12 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleGenerate(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, handleGenerate]);

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeguard-report-${type}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    const s = report.summary || {};
    const summaryRows = [
      ['SafeGuard AI Safety Report'],
      ['Report Type', type],
      ['Generated At (Local)', formatDateTime(report.generated_at)],
      ['Period Start', formatDateTime(report.period?.start)],
      ['Period End', formatDateTime(report.period?.end)],
      [],
      ['KPI Metrics', 'Value'],
      ['Total Workers Observed', s.total_workers ?? 0],
      ['Helmet Detections', s.helmet_detections ?? 0],
      ['Violations (No Helmet)', s.no_helmet_detections ?? 0],
      ['Compliance Rate %', `${s.compliance_rate ?? 0}%`],
      ['Average Confidence %', `${s.avg_confidence ?? 0}%`],
      ['Total Sessions', s.total_sessions ?? 0],
      ['Total Alerts Logged', s.total_alerts ?? 0],
      ['Active Alerts', s.active_alerts ?? 0],
      [],
      ['Daily Violation Summary'],
      ['Date', 'Workers', 'Violations', 'Compliance %'],
      ...(report.violation_summary || []).map(d => [d.date, d.workers, d.violations, `${d.compliance}%`]),
      [],
      ['Camera Source Breakdown'],
      ['Camera Name', 'Location', 'Status', 'Violations Logged'],
      ...(report.camera_summary || []).map(c => [c.name, c.location, c.status, c.violations])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + summaryRows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safeguard-safety-report-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const s = report?.summary || {};
  const isHealthy = (s.compliance_rate ?? 100) >= 90;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-700">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Safety & Compliance Report Generator
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Real-time aggregation of camera detections, worker compliance rates, and safety alerts.
            </p>
          </div>

          {/* Auto Refresh & Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-green-500/15 text-green-300 border-green-500/30'
                  : 'bg-slate-700 text-slate-400 border-slate-600'
              }`}
              title="Automatically keep report updated with live stream detections"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
              Auto-Sync {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg border border-slate-600 transition-colors"
              title="Refresh report data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Report Scope & Timeframe</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="daily">Daily Safety Summary (Today's Live Sessions & Alerts)</option>
              <option value="weekly">Weekly Compliance Report (Last 7 Days)</option>
              <option value="monthly">Monthly Audit Report (Last 30 Days)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {type === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {lastUpdated && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last generated: <strong className="text-slate-300">{formatDateTime(lastUpdated)}</strong> ({timeAgo(lastUpdated)})
            </span>
          )}

          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Compiling Report…' : 'Generate Full Report'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {report && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden print:bg-white print:text-black">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 border-b border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">SafeGuard AI Compliance Audit</h2>
                    <p className="text-xs text-slate-400">Automated Computer Vision Helmet Safety Report</p>
                  </div>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-300">
                  {report.label}
                </span>
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1 sm:justify-end">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Generated: <span className="text-slate-200">{formatDateTime(report.generated_at)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Users,
                  label: 'Workers Monitored',
                  value: s.total_workers ?? 0,
                  sub: 'Total detected entries',
                  border: 'border-blue-500/30 bg-blue-500/5 text-blue-400'
                },
                {
                  icon: CheckCircle,
                  label: 'Wearing Helmet',
                  value: s.helmet_detections ?? 0,
                  sub: 'Fully compliant',
                  border: 'border-green-500/30 bg-green-500/5 text-green-400'
                },
                {
                  icon: AlertTriangle,
                  label: 'Violations (No Helmet)',
                  value: s.no_helmet_detections ?? 0,
                  sub: s.no_helmet_detections > 0 ? 'Requires attention' : 'Zero violations',
                  border: s.no_helmet_detections > 0 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-slate-700 bg-slate-800 text-slate-400'
                },
                {
                  icon: Shield,
                  label: 'Compliance Score',
                  value: `${s.compliance_rate ?? 0}%`,
                  sub: isHealthy ? 'High standard' : 'Below target',
                  border: isHealthy ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                },
              ].map(({ icon: Icon, label, value, sub, border }) => (
                <div key={label} className={`p-4 rounded-xl border ${border} transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 opacity-80" />
                    <span className="text-[11px] font-mono text-slate-400">{sub}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{value}</div>
                  <div className="text-xs font-medium text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Performance Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Total Sessions', value: s.total_sessions ?? 0 },
                { label: 'Total Violations', value: s.no_helmet_detections ?? 0 },
                { label: 'Logged Alerts', value: s.total_alerts ?? 0 },
                { label: 'Active Alerts', value: s.active_alerts ?? 0 },
                { label: 'Avg Confidence', value: `${s.avg_confidence ?? 0}%` },
                { label: 'Camera FPS', value: `${s.avg_fps ?? 30} fps` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">{label}</div>
                  <div className="text-base font-bold font-mono text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            {/* Camera-wise Violation Breakdown */}
            {report.camera_summary && report.camera_summary.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Camera-Wise Incident Distribution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.camera_summary.map((cam) => (
                    <div key={cam.name} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-200">{cam.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{cam.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                          cam.violations > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {cam.violations} alert{cam.violations !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Violation Table */}
            {report.violation_summary && report.violation_summary.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Daily Timeline Breakdown</h3>
                <div className="border border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-800/90 text-slate-300 text-xs border-b border-slate-700">
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold text-right">Workers Seen</th>
                        <th className="p-3 font-semibold text-right">Violations</th>
                        <th className="p-3 font-semibold text-right">Compliance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {report.violation_summary.map((day) => (
                        <tr key={day.date} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono text-slate-300 text-xs">{day.date}</td>
                          <td className="p-3 text-right font-mono text-slate-200">{day.workers}</td>
                          <td className={`p-3 text-right font-mono font-semibold ${day.violations > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {day.violations}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${day.compliance >= 90 ? 'text-green-400' : day.compliance >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                            {day.compliance}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Violations Log in Report */}
            {report.recent_alerts && report.recent_alerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Incident Event Log</span>
                  <span className="text-xs text-slate-500 font-normal">{report.recent_alerts.length} most recent recorded</span>
                </h3>
                <div className="space-y-2">
                  {report.recent_alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <div>
                          <div className="font-semibold text-slate-200">{alert.message}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Camera: <span className="text-slate-300 font-medium">{alert.camera_name}</span> · {alert.worker_id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono">
                          {formatDateTime(alert.created_at)} ({timeAgo(alert.created_at)})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-semibold">
                          {alert.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700 print:hidden">
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 transition-colors text-xs font-semibold border border-slate-600 shadow-sm"
              >
                <Download className="w-4 h-4 text-green-400" /> Export CSV Spreadsheet
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 transition-colors text-xs font-semibold border border-slate-600 shadow-sm"
              >
                <Download className="w-4 h-4 text-blue-400" /> Export JSON
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors text-xs font-semibold shadow-lg shadow-blue-500/20"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
