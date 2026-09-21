import React from 'react';

const StatusBadge = ({ status }) => {
  const normalized = status?.toLowerCase() || '';
  
  let styles = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  let label = status || 'UNKNOWN';

  if (normalized.includes('safe') || normalized === 'helmet') {
    styles = 'bg-green-500/10 text-green-500 border-green-500/30';
    label = 'SAFE';
  } else if (normalized.includes('violation') || normalized === 'no_helmet') {
    styles = 'bg-red-500/10 text-red-500 border-red-500/30';
    label = 'VIOLATION';
  } else if (normalized.includes('warning')) {
    styles = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    label = 'WARNING';
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border tracking-wider ${styles}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
