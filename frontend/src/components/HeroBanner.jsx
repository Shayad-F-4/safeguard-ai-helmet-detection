import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Activity, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const HeroBanner = () => {
  const { systemStatus, isDemo } = useAppContext();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-blue-500/20 shadow-xl shadow-black/40 min-h-[160px] md:h-[175px] flex items-center mb-6">
      {/* Background Image */}
      <img
        src="/assets/header_banner.png"
        alt="Construction Site AI Safety Monitoring"
        className="absolute inset-0 w-full h-full object-cover object-right md:object-center select-none pointer-events-none"
        onError={(e) => {
          // Fallback if asset not loaded
          e.target.style.display = 'none';
        }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07111F] via-[#07111F]/90 to-[#07111F]/20 md:via-[#07111F]/80 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/80 via-transparent to-transparent md:hidden" />

      {/* Content Container */}
      <div className="relative z-10 w-full px-5 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Headline & Mission */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edge AI Telemetry</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Building Safer{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Workplaces with AI
            </span>
          </h1>

          <p className="text-xs md:text-sm text-slate-300/90 mt-1.5 leading-relaxed line-clamp-2">
            Real-time helmet detection, safety monitoring and intelligent construction site analytics.
          </p>
        </div>

        {/* Right Side: Dynamic Clock, Calendar & System Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center md:flex-col md:items-end gap-3 shrink-0">
          {/* Live Date & Time Glass Card */}
          <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-lg">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium border-r border-slate-700/80 pr-3">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{dateStr}</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-white tracking-wide">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{timeStr}</span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/80">
              <span className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {systemStatus === 'online' ? (isDemo ? 'DEMO' : 'LIVE') : 'CONNECTING'}
              </span>
            </div>
          </div>

          {/* Inspirational Tagline */}
          <div className="hidden lg:block text-right">
            <p className="text-xs italic text-slate-300/80 font-medium">
              "Safety Today Builds a Better Tomorrow."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
