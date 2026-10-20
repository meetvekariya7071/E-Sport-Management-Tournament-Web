import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Gamepad2,
  Shield,
  PlusCircle,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin', label: 'System Overview', icon: LayoutDashboard },
          { to: '/games', label: 'Game Master Catalog', icon: Gamepad2 },
          { to: '/tournaments', label: 'All Platform Tournaments', icon: Trophy },
          { to: '/organizer/disputes', label: 'Disputes Review Board', icon: AlertTriangle }
        ];
      case 'ORGANIZER':
        return [
          { to: '/organizer', label: 'Hosted Tournaments', icon: Trophy },
          { to: '/organizer#create', label: 'Create Tournament', icon: PlusCircle },
          { to: '/organizer/disputes', label: 'Dispute Review Board', icon: AlertTriangle }
        ];
      case 'REFEREE':
        return [
          { to: '/referee/dashboard', label: 'Referee Portal', icon: ClipboardList },
          { to: '/referee/disputes', label: 'Dispute Review Board', icon: AlertTriangle }
        ];
      case 'PLAYER':
      default:
        return [
          { to: '/player', label: 'Match Hub & Rosters', icon: LayoutDashboard },
          { to: '/tournaments', label: 'Tournament Catalog', icon: Trophy },
          { to: '/#games', label: 'Game Catalog', icon: Gamepad2 }
        ];
    }
  };

  const links = getLinks();

  const isLinkActive = (to: string, isDefaultActive: boolean) => {
    if (isDefaultActive) return true;
    const current = location.pathname;
    if (to === '/referee/dashboard') {
      return (
        current === '/referee' ||
        current === '/referee/' ||
        current === '/referee/dashboard' ||
        current === '/referee/portal' ||
        current === '/dashboard' ||
        current === '/dashboard/referee' ||
        current.startsWith('/referee/matches')
      );
    }
    return false;
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-gaming-surface/50 p-4 hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase px-3 font-semibold">
            {role} PORTAL
          </span>
          <div className="mt-2 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => {
                    const active = isLinkActive(link.to, isActive);
                    return `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`;
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="font-mono text-[11px]">RBAC Scope: Active</span>
      </div>
    </aside>
  );
};
