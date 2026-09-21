import React, { useState } from 'react';
import { FileText, Download, Printer, Loader2, Shield, AlertTriangle, Users, CheckCircle } from 'lucide-react';
import { generateReport } from '../services/api';

const Reports = () => {
  const [type, setType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateReport({
        report_type: type,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setReport(res.data.report);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const s = report?.summary || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" /> Report Generator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Report Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="daily">Daily Safety Summary</option>
              <option value="weekly">Weekly Compliance Report</option>
              <option value="monthly">Monthly Audit Report</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {type === 'custom' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><FileText className="w-5 h-5" /> Generate Report</>}
        </button>
      </div>

      {/* Report Preview */}
      {report && (
        <div className="bg-white text-slate-900 rounded-xl shadow-xl overflow-hidden print:shadow-none">
          {/* Report Header */}
          <div className="bg-slate-800 text-white p-6 print:bg-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <h1 className="text-xl font-bold">SafeGuard AI</h1>
                </div>
                <p className="text-slate-400 text-sm">Edge AI Helmet Detection System</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-blue-400">{report.label}</div>
                <p className="text-slate-400 text-xs mt-1">
                  Generated: {new Date(report.generated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: 'Total Workers', value: s.total_workers ?? 0, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { icon: CheckCircle, label: 'Helmet Detections', value: s.helmet_detections ?? 0, color: 'text-green-600 bg-green-50 border-green-100' },
                { icon: AlertTriangle, label: 'Violations', value: s.no_helmet_detections ?? 0, color: 'text-red-600 bg-red-50 border-red-100' },
                { icon: Shield, label: 'Compliance Rate', value: `${s.compliance_rate ?? 0}%`, color: (s.compliance_rate ?? 0) >= 90 ? 'text-green-600 bg-green-50 border-green-100' : 'text-amber-600 bg-amber-50 border-amber-100' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`p-4 rounded-xl border ${color}`}>
                  <Icon className="w-5 h-5 mb-2" />
                  <div className="text-2xl font-bold font-mono">{value}</div>
                  <div className="text-xs font-medium mt-1 opacity-80">{label}</div>
                </div>
              ))}
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
              {[
                { label: 'Total Sessions', value: s.total_sessions ?? 0 },
                { label: 'Total Alerts', value: s.total_alerts ?? 0 },
                { label: 'Active Alerts', value: s.active_alerts ?? 0 },
                { label: 'Avg Confidence', value: `${s.avg_confidence ?? 0}%` },
                { label: 'Avg FPS', value: s.avg_fps ?? 0 },
                { label: 'Report Period', value: type.charAt(0).toUpperCase() + type.slice(1) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold font-mono">{value}</span>
                </div>
              ))}
            </div>

            {/* Violation Summary Table */}
            {report.violation_summary?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-bold border-b-2 border-slate-200 pb-2 mb-3">Daily Violation Summary</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-3 font-semibold text-slate-700">Date</th>
                      <th className="p-3 font-semibold text-slate-700 text-right">Workers</th>
                      <th className="p-3 font-semibold text-slate-700 text-right">Violations</th>
                      <th className="p-3 font-semibold text-slate-700 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.violation_summary.filter(d => d.workers > 0).map(day => (
                      <tr key={day.date}>
                        <td className="p-3 font-mono text-slate-600">{day.date}</td>
                        <td className="p-3 text-right">{day.workers}</td>
                        <td className={`p-3 text-right font-medium ${day.violations > 0 ? 'text-red-600' : 'text-green-600'}`}>{day.violations}</td>
                        <td className={`p-3 text-right font-medium ${day.compliance >= 90 ? 'text-green-600' : 'text-amber-600'}`}>{day.compliance}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button onClick={handleDownload} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors text-sm">
                <Download className="w-4 h-4" /> Download JSON
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm">
                <Printer className="w-4 h-4" /> Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
