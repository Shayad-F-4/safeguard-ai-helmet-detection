import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search, MapPin, Bell, Settings, Shield, ChevronDown,
  Menu, X, Sparkles, Activity
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const PAGE_TITLES = {
  '/':          'Dashboard',
  '/live':      'Live Monitoring',
  '/image':     'Image Detection',
  '/video':     'Video Detection',
  '/results':   'Detection Results',
  '/alerts':    'Safety Alerts',
  '/history':   'Session History',
  '/analytics': 'Safety Analytics',
  '/reports':   'Safety Reports',
  '/cameras':   'Camera Management',
  '/model':     'AI Model Telemetry',
  '/settings':  'System Settings',
};

const LOCATIONS = [
  'Construction Zone A',
  'Main Entrance',
  'Warehouse Floor',
  'Tower 3 - Scaffolding',
  'All Sites (Enterprise)',
];

const Navbar = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDemo, activeAlerts, systemStatus } = useAppContext();

  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Command Center';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/results?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-[#07111F]/90 backdrop-blur-md border-b border-slate-700/60 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 sticky top-0">
      {/* ── Left: Mobile Toggle & Search Input ────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        {/* Mobile menu button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/70"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Form */}
        <form onSubmit={handleSearch} className="relative w-full max-w-sm sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cameras, detections, alerts..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-900/90 text-slate-100 placeholder-slate-400/80 rounded-xl border border-slate-700/70 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
          />
        </form>
      </div>

      {/* ── Right: Site Selector, Status Badges, Bell & Profile ───────────── */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Location Dropdown */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowLocationMenu(!showLocationMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-all shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate max-w-[130px]">{selectedLocation}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLocationMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Select Site Zone
              </div>
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setSelectedLocation(loc);
                    setShowLocationMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                    selectedLocation === loc
                      ? 'bg-blue-600/20 text-blue-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{loc}</span>
                  {selectedLocation === loc && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wide shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isDemo ? 'MOCK / DEMO' : 'YOLO LIVE'}</span>
        </div>

        {/* Safety Alert Notification Bell */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors shadow-sm"
          title="Safety Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlerts > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold font-mono shadow-md shadow-red-500/40 animate-pulse">
              {activeAlerts > 99 ? '99+' : activeAlerts}
            </span>
          )}
        </Link>

        {/* Settings Shortcut */}
        <Link
          to="/settings"
          className="hidden sm:flex p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors shadow-sm"
          title="System Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/20 select-none shrink-0">
            SF
          </div>

          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-100 leading-tight">
              Shayad Fakir
            </div>
            <div className="text-[10px] font-medium text-cyan-400">
              Safety Admin
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
