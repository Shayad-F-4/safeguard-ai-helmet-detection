import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Video, Image, Film, ClipboardList, AlertTriangle,
  History, BarChart2, FileText, Camera, Cpu, Settings, Shield,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { name: 'Dashboard',       path: '/',     icon: LayoutDashboard },
      { name: 'Live Monitoring', path: '/live',  icon: Video,  live: true },
    ],
  },
  {
    label: 'Detection',
    items: [
      { name: 'Image Detection', path: '/image',  icon: Image },
      { name: 'Video Detection', path: '/video',  icon: Film },
    ],
  },
  {
    label: 'Data & Reports',
    items: [
      { name: 'Detection Results', path: '/results',   icon: ClipboardList },
      { name: 'Safety Alerts',     path: '/alerts',    icon: AlertTriangle, badge: true },
      { name: 'History',           path: '/history',   icon: History },
      { name: 'Analytics',         path: '/analytics', icon: BarChart2 },
      { name: 'Reports',           path: '/reports',   icon: FileText },
    ],
  },
  {
    label: 'System',
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
    ? 'bg-success-500'
    : systemStatus === 'offline'
    ? 'bg-error-500'
    : 'bg-warning-500';

  return (
    <div
      className={`relative flex flex-col bg-dark-surface border-r border-dark-border transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-[70px]' : 'w-64'}`}
    >
      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center h-16 px-4 border-b border-dark-border shrink-0 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 shrink-0 shadow-lg shadow-primary-500/30">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block font-bold text-base bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent whitespace-nowrap">
                SafeGuard AI
              </span>
              <span className="block text-[10px] text-slate-500 -mt-0.5">Edge AI Detection</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Collapse toggle ────────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-10 w-6 h-6 bg-dark-elevated border border-dark-border rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors shadow"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          : <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        }
      </button>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Group label */}
            {!collapsed && gi > 0 && (
              <div className="px-3 pt-4 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </span>
              </div>
            )}
            {collapsed && gi > 0 && <div className="mx-3 my-2 border-t border-dark-border/60" />}

            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                title={collapsed ? item.name : ''}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-md shadow-primary-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-dark-elevated'
                  }`
                }
              >
                <item.icon className={`w-5 h-5 shrink-0 ${collapsed ? 'mx-auto' : ''}`} />

                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{item.name}</span>

                    {/* Live pulse dot */}
                    {item.live && (
                      <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
                    )}

                    {/* Alert badge */}
                    {item.badge && activeAlerts > 0 && (
                      <span className="bg-error-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                        {activeAlerts > 99 ? '99+' : activeAlerts}
                      </span>
                    )}
                  </>
                )}

                {/* Collapsed badge dot */}
                {collapsed && item.badge && activeAlerts > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-dark-border">
        <div className={`flex items-center gap-2 px-2 py-2 rounded-lg bg-dark-elevated/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
            {systemStatus === 'online' && (
              <div className={`absolute inset-0 rounded-full ${statusColor} animate-ping opacity-60`} />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-300 capitalize">{systemStatus}</span>
                {isDemo && (
                  <span className="text-[9px] bg-warning-500/20 text-warning-400 border border-warning-500/30 px-1.5 py-px rounded font-bold uppercase tracking-wide">
                    demo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600">v1.0.0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
