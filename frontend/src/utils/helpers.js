// Format confidence: handles both 0-1 float (live detection) and 0-100 (DB records)
export const formatConfidence = (value) => {
  if (value === null || value === undefined) return '0%';
  const pct = value <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
};

export const parseDateUtc = (iso) => {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  if (typeof iso === 'number') return new Date(iso);
  let str = String(iso).trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(iso) : d;
};

export const formatTimestamp = (iso) => {
  const d = parseDateUtc(iso);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatDate = (iso) => {
  const d = parseDateUtc(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export const formatDateTime = (iso) => {
  const d = parseDateUtc(iso);
  if (!d) return '—';
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
};

export const timeAgo = (iso) => {
  const d = parseDateUtc(iso);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const secs = Math.floor(Math.max(0, diffMs) / 1000);
  if (secs < 15) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'safe':      return 'text-green-500 border-green-500 bg-green-500/10';
    case 'violation': return 'text-red-500 border-red-500 bg-red-500/10';
    case 'warning':   return 'text-amber-500 border-amber-500 bg-amber-500/10';
    default:          return 'text-blue-500 border-blue-500 bg-blue-500/10';
  }
};

export const getSeverityColor = (severity) => {
  switch (severity?.toUpperCase()) {
    case 'HIGH':   return 'text-red-400 border-red-500/40 bg-red-500/10';
    case 'MEDIUM': return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    case 'LOW':    return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
    default:       return 'text-slate-400 border-slate-500/40 bg-slate-500/10';
  }
};

export const getComplianceColor = (rate) => {
  if (rate >= 90) return 'text-green-400';
  if (rate >= 75) return 'text-amber-400';
  return 'text-red-400';
};

export const calcComplianceColor = (rate) => {
  if (rate >= 90) return '#22c55e';
  if (rate >= 75) return '#f59e0b';
  return '#ef4444';
};

// Format bounding box — handles both array [x1,y1,x2,y2] and object {x1,y1,x2,y2}
export const formatBBox = (bbox) => {
  if (!bbox) return '[-]';
  if (Array.isArray(bbox) && bbox.length >= 4) {
    return `[${bbox.map(v => Math.round(v)).join(', ')}]`;
  }
  if (typeof bbox === 'object') {
    const { x1, y1, x2, y2 } = bbox;
    return `[${[x1, y1, x2, y2].map(v => Math.round(v)).join(', ')}]`;
  }
  return '[-]';
};

export const normalizeConfidence = (val) => {
  if (val === null || val === undefined) return 0;
  return val <= 1 ? val * 100 : val;
};
