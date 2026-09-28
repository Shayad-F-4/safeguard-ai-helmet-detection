import React, { useState, useEffect, useCallback } from 'react';
import { getAlerts, updateAlert } from '../services/api';
import { useAppContext } from '../context/AppContext';
import AlertCard from '../components/AlertCard';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';

const FILTERS = ['all', 'active', 'acknowledged', 'resolved'];

/**
 * Alerts page — lists safety alerts with filter tabs, acknowledge/resolve actions,
 * search, loading skeleton, and empty state.
 */
const Alerts = () => {
  const { refreshAlerts } = useAppContext();

  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [alerts, setAlerts]       = useState([]);
  const [counts, setCounts]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError]         = useState(null);
  const [actionId, setActionId]   = useState(null); // id of alert being updated

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const res = await getAlerts(params);
      // API can return { items, counts, total } or { alerts, counts } or a plain array
      const data = res.data;
      const list  = data?.items ?? data?.alerts ?? (Array.isArray(data) ? data : []);
      const cnts  = data?.counts ?? {};
      setAlerts(list);
      setCounts(cnts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      if (!isBackground) setError('Failed to load alerts. Please try again.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time polling every 4 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAlerts(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAlerts]);

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    setActionId(id);
    try {
      await updateAlert(id, { status });
      await fetchAlerts();
      refreshAlerts(); // update sidebar badge count
    } catch (err) {
      console.error(`Failed to set alert ${id} → ${status}:`, err);
    } finally {
      setActionId(null);
    }
  };

  const handleAcknowledge = (id) => handleStatusUpdate(id, 'acknowledged');
  const handleResolve     = (id) => handleStatusUpdate(id, 'resolved');

  // ─── Client-side search filter ────────────────────────────────────────────────
  const filtered = alerts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.message       || '').toLowerCase().includes(q) ||
      (a.worker_id     || a.workerId   || '').toString().toLowerCase().includes(q) ||
      (a.camera_name   || a.camera     || '').toLowerCase().includes(q) ||
      (a.severity      || '').toLowerCase().includes(q)
    );
  });

  // ─── Tab count helper ─────────────────────────────────────────────────────────
  const tabCount = (tab) => {
    if (tab === 'all') return Object.values(counts).reduce((a, b) => a + b, 0) || alerts.length;
    return counts[tab] ?? alerts.filter((a) => a.status === tab).length;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
        {/* Filter tabs */}
        <div className="flex space-x-1 p-1 bg-slate-900 rounded-lg">
          {FILTERS.map((f) => {
            const cnt = tabCount(f);
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
                  ${filter === f
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {f}
                {cnt > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold
                      ${f === 'active'
                        ? 'bg-red-500/30 text-red-300'
                        : f === 'acknowledged'
                        ? 'bg-amber-500/20 text-amber-300'
                        : f === 'resolved'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-slate-600 text-slate-300'
                      }`}
                  >
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + auto-sync + refresh */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts…"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              autoRefresh
                ? 'bg-green-500/15 text-green-300 border-green-500/30'
                : 'bg-slate-700 text-slate-400 border-slate-600'
            }`}
            title="Real-time live alert stream"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            Auto-Sync {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => fetchAlerts(false)}
            disabled={loading}
            title="Refresh"
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Alert list ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {loading ? (
          /* Loading skeleton */
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl border border-slate-700" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={alert.status === 'active' ? handleAcknowledge : undefined}
              onResolve={
                alert.status === 'active' || alert.status === 'acknowledged'
                  ? handleResolve
                  : undefined
              }
            />
          ))
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 border border-dashed border-slate-700 rounded-xl">
            <ShieldCheck className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-300 mb-2">No alerts found.</h3>
            <p className="text-slate-500 text-center max-w-sm">
              {search
                ? `No ${filter !== 'all' ? filter : ''} alerts match "${search}".`
                : `No ${filter !== 'all' ? filter : ''} alerts at this time.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
