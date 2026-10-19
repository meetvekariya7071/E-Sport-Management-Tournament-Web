import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Gamepad2, Shield, Heart } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gaming-bg text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 bg-gaming-surface/60 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="font-heading font-bold text-slate-300">GLOBALTROTTER ESPORTS</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Powered by Node.js & Prisma ORM</span>
            <span>•</span>
            <span>PostgreSQL Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
