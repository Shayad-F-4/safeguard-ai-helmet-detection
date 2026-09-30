import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLOR_STYLES = {
  blue: {
    iconBg: 'bg-blue-600/15 border-blue-500/30 text-blue-400',
    border: 'hover:border-blue-500/40',
    sparkline: '#3B82F6',
    pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  green: {
    iconBg: 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400',
    border: 'hover:border-emerald-500/40',
    sparkline: '#10B981',
    pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  red: {
    iconBg: 'bg-rose-600/15 border-rose-500/30 text-rose-400',
    border: 'hover:border-rose-500/40',
    sparkline: '#F43F5E',
    pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  amber: {
    iconBg: 'bg-amber-600/15 border-amber-500/30 text-amber-400',
    border: 'hover:border-amber-500/40',
    sparkline: '#F59E0B',
    pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  purple: {
    iconBg: 'bg-purple-600/15 border-purple-500/30 text-purple-400',
    border: 'hover:border-purple-500/40',
    sparkline: '#A855F7',
    pill: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  cyan: {
    iconBg: 'bg-cyan-600/15 border-cyan-500/30 text-cyan-400',
    border: 'hover:border-cyan-500/40',
    sparkline: '#06B6D4',
    pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
};

const StatCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  color = 'blue',
  trend = null,
  trendLabel = '',
  subtitle = '',
}) => {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;

  // Safe trend string extraction (never outputs [object Object])
  let trendText = null;
  let isPositive = true;

  if (typeof trend === 'number') {
    isPositive = trend >= 0;
    trendText = trend >= 0 ? `+${trend}%` : `${trend}%`;
  } else if (typeof trend === 'string') {
    trendText = trend;
    isPositive = !trend.startsWith('-');
  } else if (typeof trend === 'object' && trend !== null) {
    trendText = trend.value || null;
    isPositive = trendText ? !trendText.startsWith('-') : true;
  }

  return (
    <div
      className={`relative overflow-hidden safeguard-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${styles.border} group`}
    >
      {/* Top Header: Title + Icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs sm:text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${styles.iconBg} shrink-0 transition-transform group-hover:scale-110 shadow-sm`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      {/* Main Metric Value + Trend Tag */}
      <div className="flex items-baseline justify-between gap-2 mt-auto">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {typeof value === 'number' ? (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)) : (value ?? 0)}
          </span>
          {unit && <span className="text-xs sm:text-sm font-bold text-slate-400">{unit}</span>}
        </div>

        {/* Trend Indicator */}
        {trendText && (
          <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-sm">
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            )}
            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {trendText}
            </span>
          </div>
        )}
      </div>

      {/* Subtitle / Note */}
      {subtitle && (
        <div className="text-[11px] text-slate-400/80 mt-1 truncate">
          {subtitle}
        </div>
      )}

      {/* Mini Sparkline Curve */}
      <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
          {trendLabel || 'Live Telemetry'}
        </div>
        <svg className="w-20 h-5 overflow-visible" viewBox="0 0 80 20" fill="none">
          <path
            d="M 0 14 Q 20 4, 40 12 T 80 6"
            stroke={styles.sparkline}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="80" cy="6" r="3" fill={styles.sparkline} />
        </svg>
      </div>
    </div>
  );
};

export default StatCard;
