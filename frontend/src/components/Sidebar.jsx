import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Video, Image, Film, ClipboardList, AlertTriangle,
  History, BarChart2, FileText, Camera, Cpu, Settings, Shield,
  ChevronLeft, ChevronRight, ArrowRight, HardHat, Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { name: 'Dashboard',       path: '/',     icon: LayoutDashboard },
      { name: 'Live Monitoring', path: '/live',  icon: Video,  live: true },
      { name: 'Image Detection', path: '/image',  icon: Image },
      { name: 'Video Detection', path: '/video',  icon: Film },
    ],
  },
  {
    label: 'DATA & REPORTS',
    items: [
      { name: 'Detection Results', path: '/results',   icon: ClipboardList },
      { name: 'Safety Alerts',     path: '/alerts',    icon: AlertTriangle, badge: true },
      { name: 'History',           path: '/history',   icon: History },
      { name: 'Analytics',         path: '/analytics', icon: BarChart2 },
      { name: 'Reports',           path: '/reports',   icon: FileText },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Cameras',   path: '/cameras',  icon: Camera },
      { name: 'AI Model',  path: '/model',    icon: Cpu },
      { name: 'Settings',  path: '/settings', icon: Settings },
    ],
  },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { systemStatus, activeAlerts, isDemo } = useAppContext();

  const statusColor = systemStatus === 'online'
    ? 'bg-green-400'
    : systemStatus === 'offline'
    ? 'bg-red-500'
    : 'bg-amber-400';

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-slate-700/60 transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
        collapsed ? 'w-[72px]' : 'w-[264px]'
      }`}
    >
      {/* ── Background Image with Dark Navy Cyber Overlay ─────────────────── */}
      <img
        src="/assets/sidebar_bg.png"
        alt="SafeGuard AI Navigation"
        className="absolute inset-0 w-full h-full object-cover object-left opacity-35 pointer-events-none select-none"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07111F]/95 via-[#091526]/90 to-[#07111F]/98 backdrop-blur-[6px]" />

      {/* ── Brand Header ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between h-16 px-4 border-b border-slate-700/60 shrink-0">
        <NavLink to="/" className="flex items-center gap-3 min-w-0 group">
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-md shadow-blue-500/30 shrink-0 transition-transform group-hover:scale-105">
            <Shield className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <span className="block font-extrabold text-base bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                SafeGuard AI
              </span>
              <span className="block text-[11px] font-medium text-cyan-400/90 tracking-wider uppercase -mt-0.5">
                Edge AI Detection
              </span>
            </div>
          )}
        </NavLink>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 text-slate-400 hover:text-slate-100 border border-slate-700/80 transition-colors shadow-sm"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Navigation Links ──────────────────────────────────────────────── */}
      <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {/* Group Label */}
            {group.label && !collapsed && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {group.label}
                </span>
              </div>
            )}
            {group.label && collapsed && (
              <div className="mx-2 my-2 border-t border-slate-800/80" />
            )}

            {/* Menu Items */}
            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : ''}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm ${
                    isActive
                      ? 'glow-active-pill text-white font-semibold shadow-lg shadow-blue-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-blue-400'
                      } ${collapsed ? 'mx-auto' : ''}`}
                    />

                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate tracking-tight">{item.name}</span>

                        {/* Live indicator dot */}
                        {item.live && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
                          </span>
                        )}

                        {/* Alert badge */}
                        {item.badge && activeAlerts > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold shadow-md shadow-red-500/30 animate-pulse">
                            {activeAlerts > 99 ? '99+' : activeAlerts}
                          </span>
                        )}
                      </>
                    )}

                    {/* Collapsed dot for alerts */}
                    {collapsed && item.badge && activeAlerts > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>


    </aside>
  );
};

export default Sidebar;
