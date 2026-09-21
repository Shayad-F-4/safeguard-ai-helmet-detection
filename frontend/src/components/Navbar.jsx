import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// ---------------------------------------------------------------------------
// Page title map
// ---------------------------------------------------------------------------
const PAGE_TITLES = {
  '/':          'Dashboard',
  '/live':      'Live Monitoring',
  '/image':     'Image Detection',
  '/video':     'Video Detection',
  '/results':   'Detection Results',
  '/alerts':    'Safety Alerts',
  '/history':   'History',
  '/analytics': 'Analytics',
  '/reports':   'Reports',
  '/cameras':   'Cameras',
  '/model':     'AI Model Integration',
  '/settings':  'Settings',
};

// ---------------------------------------------------------------------------
// System mode badge
// ---------------------------------------------------------------------------
const ModeBadge = ({ isDemo, systemStatus }) => {
  if (systemStatus === 'offline' || systemStatus === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-error-500/15 text-error-400 border border-error-500/40 rounded-full text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-error-400 animate-pulse" />
        OFFLINE
      </div>
    );
  }
  if (isDemo) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-warning-500/15 text-warning-400 border border-warning-500/40 rounded-full text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-warning-400 animate-pulse" />
        DEMO
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-success-500/15 text-success-400 border border-success-500/40 rounded-full text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
      YOLO LIVE
    </div>
  );
};

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
const Navbar = () => {
  const location = useLocation();
  const { isDemo, activeAlerts, systemStatus } = useAppContext();

  // Live clock — updates every second
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'SafeGuard AI';

  return (
    <header className="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-6 shrink-0">
      {/* Left — page title */}
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-white tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right — mode badge, clock, bell, avatar */}
      <div className="flex items-center space-x-5">
        {/* System mode badge */}
        <ModeBadge isDemo={isDemo} systemStatus={systemStatus} />

        {/* Live clock */}
        <div className="text-right hidden md:block">
          <div className="text-sm font-medium text-slate-200 font-mono tabular-nums">
            {timeString}
          </div>
          <div className="text-xs text-slate-500">{dateString}</div>
        </div>

        {/* Bell with optional pulse when alerts present */}
        <div className={`relative ${activeAlerts > 0 ? 'animate-pulse' : ''}`}>
          <Bell
            className={`w-5 h-5 cursor-pointer transition-colors ${
              activeAlerts > 0 ? 'text-error-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          />
          {activeAlerts > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-error-500 text-white text-[10px] font-bold px-1.5 py-px rounded-full min-w-[1.25rem] text-center leading-none">
              {activeAlerts}
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center pl-4 border-l border-dark-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center font-bold text-sm text-white select-none">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
