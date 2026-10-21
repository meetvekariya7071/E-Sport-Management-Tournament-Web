import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

export const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Automatically dismiss mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gaming-bg text-slate-100 relative">
      <Navbar
        onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
        isMobileSidebarOpen={mobileOpen}
      />
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
