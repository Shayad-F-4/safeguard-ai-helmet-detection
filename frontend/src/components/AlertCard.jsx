import React from 'react';
import { AlertTriangle, Clock, CheckCircle, Video } from 'lucide-react';
import { formatDateTime, timeAgo, formatTimestamp } from '../utils/helpers';

const severityConfig = {
  HIGH:   { cls: 'text-red-400 border-red-500/50 bg-red-500/10',      dot: 'bg-red-500' },
  MEDIUM: { cls: 'text-amber-400 border-amber-500/50 bg-amber-500/10', dot: 'bg-amber-500' },
  LOW:    { cls: 'text-blue-400 border-blue-500/50 bg-blue-500/10',    dot: 'bg-blue-500' },
};

const statusConfig = {
  active:       'border-l-red-500',
  acknowledged: 'border-l-amber-500',
  resolved:     'border-l-green-500',
};

/**
 * AlertCard — displays a single safety alert.
 *
 * Handles both API field formats:
 *   - alert.worker_id  (DB snake_case)  OR  alert.workerId
 *   - alert.camera_name (DB snake_case) OR  alert.camera
 *   - alert.created_at  (DB snake_case) OR  alert.timestamp
 *   - alert.confidence: handles both 0–1 float AND 0–100 number ranges
 *   - alert.severity: accepts both uppercase and lowercase
 *   - alert.status: 'active' | 'acknowledged' | 'resolved'
 *   - alert.message: main alert text
 */
const AlertCard = ({ alert, onAcknowledge, onResolve, onViewDetails, compact = false }) => {
  if (!alert) return null;

  // ─── Severity ────────────────────────────────────────────────────────────────
  const severity = (alert.severity || 'HIGH').toUpperCase();
  const cfg = severityConfig[severity] || severityConfig.HIGH;

  // ─── Left border colour driven by status ─────────────────────────────────────
  const borderLeft = statusConfig[alert.status] || 'border-l-slate-600';

  // ─── Field normalisation (handle both snake_case & camelCase) ────────────────
  const workerId   = alert.worker_id   ?? alert.workerId   ?? 'N/A';
  const cameraName = alert.camera_name ?? alert.camera     ?? 'N/A';
  const timestamp  = alert.created_at  ?? alert.timestamp  ?? '';

  // ─── Confidence: handle 0–1 float OR 0–100 number ────────────────────────────
  const rawConf = typeof alert.confidence === 'number' ? alert.confidence : 0;
  const confidencePct = rawConf <= 1 ? rawConf * 100 : rawConf;

  // ─── Resolve button visibility: active OR acknowledged ────────────────────────
  const showAck     = alert.status === 'active'                              && !!onAcknowledge;
  const showResolve = (alert.status === 'active' || alert.status === 'acknowledged') && !!onResolve;

  return (
    <div
      className={`
        bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${borderLeft}
        ${alert.status !== 'active' ? 'opacity-75' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* ── Header row ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-2">
        {/* Left: severity badge + timestamp */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {severity}
          </span>
          {!compact && timestamp && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{formatDateTime(timestamp)}</span>
              <span className="text-slate-500 font-medium">({timeAgo(timestamp)})</span>
            </span>
          )}
          {compact && timestamp && (
            <span className="text-xs text-slate-400 font-medium">{timeAgo(timestamp)}</span>
          )}
        </div>

        {/* Right: action buttons OR status badge */}
        {(showAck || showResolve) ? (
          <div className="flex gap-1.5 shrink-0">
            {showAck && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors border border-slate-600"
              >
                Ack
              </button>
            )}
            {showResolve && (
              <button
                onClick={() => onResolve(alert.id)}
                className="text-xs px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition-colors border border-green-500/30 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" /> Resolve
              </button>
            )}
          </div>
        ) : (
          alert.status !== 'active' && (
            <span
              className={`text-xs px-2 py-0.5 rounded border ${
                alert.status === 'resolved'
                  ? 'text-green-400 border-green-500/30 bg-green-500/10'
                  : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
              }`}
            >
              {alert.status}
            </span>
          )
        )}
      </div>

      {/* ── Message ───────────────────────────────────────────────────────────── */}
      <p className={`font-semibold text-slate-100 mt-2 ${compact ? 'text-sm' : 'text-base'}`}>
        {alert.message || '—'}
      </p>

      {/* ── Details grid ─────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1 mt-2 ${compact ? 'text-xs' : 'text-sm'} text-slate-400`}>
        <div>
          <span className="text-slate-500">Worker: </span>
          <span className="text-slate-300 font-mono">{workerId}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Camera: </span>
          <Video className="w-3 h-3 text-slate-500" />
          <span className="text-slate-300">{cameraName}</span>
        </div>
        <div>
          <span className="text-slate-500">Confidence: </span>
          <span className="text-slate-300 font-mono">{confidencePct.toFixed(1)}%</span>
        </div>
        {compact && dateStr && (
          <div>
            <span className="text-slate-500">{dateStr}</span>
          </div>
        )}
      </div>

      {/* ── View Details CTA ─────────────────────────────────────────────────── */}
      {onViewDetails && (
        <button
          onClick={() => onViewDetails(alert.id)}
          className="mt-3 w-full py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-colors border border-transparent hover:border-blue-500/20"
        >
          View Details →
        </button>
      )}
    </div>
  );
};

export default AlertCard;
