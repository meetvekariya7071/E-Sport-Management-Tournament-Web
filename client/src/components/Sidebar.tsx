import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Gamepad2,
  Shield,
  PlusCircle,
  FileText,
  AlertTriangle,
  Settings,
  Swords,
  X
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActiveRule?: (pathname: string) => boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, setMobileOpen }) => {
  const { role } = useAuth();
  const location = useLocation();

  const getLinks = (): NavItem[] => {
    switch (role) {
      case 'ADMIN':
        return [
          {
            to: '/admin/overview',
            label: 'System Overview',
            icon: LayoutDashboard,
            isActiveRule: (p) => p === '/admin' || p === '/admin/' || p === '/admin/overview'
          },
          {
            to: '/games',
            label: 'Game Master Catalog',
            icon: Gamepad2,
            isActiveRule: (p) => p.startsWith('/games') || p === '/admin/games'
          },
          {
            to: '/tournaments',
            label: 'All Platform Tournaments',
            icon: Trophy,
            isActiveRule: (p) => p.startsWith('/tournaments') || p === '/admin/tournaments'
          },
          {
            to: '/admin/disputes',
            label: 'Disputes Review Board',
            icon: AlertTriangle,
            isActiveRule: (p) => p.startsWith('/admin/disputes')
          }
        ];
      case 'ORGANIZER':
        return [
          {
            to: '/organizer/tournaments',
            label: 'Hosted Tournaments',
            icon: Trophy,
            isActiveRule: (p) =>
              p === '/organizer' ||
              p === '/organizer/' ||
              p === '/organizer/tournaments' ||
              p.includes('/database') ||
              p.includes('/scoring')
          },
          {
            to: '/organizer/create',
            label: 'Create Tournament',
            icon: PlusCircle,
            isActiveRule: (p) => p === '/organizer/create'
          },
          {
            to: '/organizer/teams',
            label: 'Enrolled Rosters & Teams',
            icon: Users,
            isActiveRule: (p) => p === '/organizer/teams'
          },
          {
            to: '/organizer/rules',
            label: 'Rule Books & Formats',
            icon: FileText,
            isActiveRule: (p) => p === '/organizer/rules'
          },
          {
            to: '/organizer/disputes',
            label: 'Disputes Review Board',
            icon: AlertTriangle,
            isActiveRule: (p) => p.includes('/disputes')
          }
        ];
      case 'PLAYER':
      default:
        return [
          {
            to: '/player/my-tournaments',
            label: 'My Tournaments',
            icon: Trophy,
            isActiveRule: (p) =>
              p === '/player' ||
              p === '/player/' ||
              p === '/player/my-tournaments' ||
              p === '/dashboard/my-tournaments'
          },
          {
            to: '/player/matches',
            label: 'Match Hub & Rosters',
            icon: Swords,
            isActiveRule: (p) => p === '/player/matches' || p === '/dashboard/matches'
          },
          {
            to: '/player/teams',
            label: 'Registered Teams',
            icon: Users,
            isActiveRule: (p) => p === '/player/teams' || p === '/dashboard/teams'
          },
          {
            to: '/tournaments',
            label: 'Tournament Catalog',
            icon: LayoutDashboard,
            isActiveRule: (p) => p.startsWith('/tournaments')
          },
          {
            to: '/games',
            label: 'Game Catalog',
            icon: Gamepad2,
            isActiveRule: (p) => p.startsWith('/games')
          }
        ];
    }
  };

  const links = getLinks();

  const renderNavContent = (isMobileDrawer = false) => (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Mobile Header with Close Button */}
        {isMobileDrawer && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-heading font-bold text-white tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              {role} NAVIGATION
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen?.(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}

        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase px-3 font-semibold">
            {role} PORTAL
          </span>
          <div className="mt-2 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = link.isActiveRule
                ? link.isActiveRule(location.pathname)
                : location.pathname === link.to;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen?.(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer relative z-10 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions: Settings & RBAC Status */}
      <div className="space-y-2 pt-4 border-t border-slate-800/80">
        <NavLink
          to="/settings"
          onClick={() => setMobileOpen?.(false)}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer relative z-10 ${
            location.pathname === '/settings' || location.pathname === '/profile'
              ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Account Settings</span>
        </NavLink>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2 select-none">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-mono text-[11px]">RBAC Scope: Active</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: md: and above */}
      <aside className="w-64 shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800 bg-slate-950/50 backdrop-blur-md p-4 hidden md:flex flex-col justify-between">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-fade-in"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 shadow-2xl p-5 flex flex-col justify-between md:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {renderNavContent(true)}
      </aside>
    </>
  );
};

export default Sidebar;
