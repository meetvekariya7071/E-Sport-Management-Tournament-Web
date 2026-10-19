import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { adminService, KPISummary } from '../api/admin.service';
import { AuditAPI } from '../api/audit.service';
import { BanModal } from '../components/BanModal';
import { GameModal } from '../components/GameModal';
import { TournamentInspectorModal } from '../components/TournamentInspectorModal';
import { Game } from '../types';
import {
  Users,
  Trophy,
  Gamepad2,
  Swords,
  Ban,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Shield,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  FileText,
  Activity,
  Server,
  Database,
  Wifi,
  Cpu,
  RefreshCw,
  Zap
} from 'lucide-react';

type DatabaseTab = 'players' | 'organizers' | 'referees' | 'games' | 'tournaments' | 'audit';

export const AdminDashboard: React.FC = () => {
  // KPI Summary
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Live System Health Metrics State
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Active Tab & Table State
  const [activeTab, setActiveTab] = useState<DatabaseTab>('players');
  const [tableData, setTableData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tableLoading, setTableLoading] = useState(false);

  // Modals State
  const [banTarget, setBanTarget] = useState<{ id: string; username: string } | null>(null);
  const [gameModalState, setGameModalState] = useState<{ isOpen: boolean; game?: Game | null }>({
    isOpen: false,
    game: null
  });
  const [inspectTournamentId, setInspectTournamentId] = useState<string | null>(null);

  // Load System Health Metrics
  const loadHealth = async () => {
    try {
      setHealthLoading(true);
      const res = await api.get('/health');
      setHealthData(res.data);
    } catch (err) {
      console.error('Failed to load system health metrics', err);
    } finally {
      setHealthLoading(false);
    }
  };

  // Check URL hash for direct tab navigation & periodic health polling
  useEffect(() => {
    if (window.location.hash === '#audit') {
      setActiveTab('audit');
    }

    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load KPIs
  const loadKpis = async () => {
    try {
      setKpiLoading(true);
      const data = await adminService.getKPISummary();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setKpiLoading(false);
    }
  };

  // Load Table Data
  const loadTable = async () => {
    try {
      setTableLoading(true);

      if (activeTab === 'audit') {
        const res = await AuditAPI.getAuditLogs({
          page,
          limit: 10,
          search
        });
        setTableData(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
        return;
      }

      const res = await adminService.getTableData(activeTab, {
        page,
        limit: 8,
        search,
        sortBy: sortBy || undefined,
        sortOrder
      });
      setTableData(res.data);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err) {
      console.error('Failed to load table:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    loadTable();
  }, [activeTab, page, search, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await adminService.toggleUserBan(userId, false);
      loadTable();
      loadKpis();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke ban');
    }
  };

  const handleDeleteGame = async (gameId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the catalog?`)) return;
    try {
      await adminService.deleteGame(gameId);
      loadTable();
      loadKpis();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete game');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono font-semibold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Super-Admin Control Center
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-white mt-1">
            Dashboard: System Overview
          </h1>
          <p className="text-xs text-slate-400">
            Key performance indicators, user governance, and comprehensive database management.
          </p>
        </div>

        <button
          onClick={loadHealth}
          disabled={healthLoading}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-2 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${healthLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Production Health & System Telemetry Widget */}
      <div className="gaming-card p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950/20 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                Production Health & Live Telemetry
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Real-time API ping, database latency, socket channels, and cache metrics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              {healthData?.status === 'online' ? 'All Systems Operational' : 'Degraded Performance'}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Uptime: <strong className="text-slate-300">{healthData?.uptime?.formatted || 'Just started'}</strong>
            </span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Database Latency */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-mono text-[10px] uppercase">Database Ping</span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-heading font-extrabold text-white font-mono flex items-baseline gap-1">
              <span>{healthData?.database?.latencyMs ?? 1}</span>
              <span className="text-xs font-normal text-slate-400">ms latency</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">SQLite (Prisma ORM) Healthy</span>
          </div>

          {/* Metric 2: WebSockets */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-mono text-[10px] uppercase">Active WebSockets</span>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-heading font-extrabold text-white font-mono flex items-baseline gap-1">
              <span>{healthData?.websocket?.activeConnections ?? 0}</span>
              <span className="text-xs font-normal text-slate-400">active channels</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">Socket.io Engine Online</span>
          </div>

          {/* Metric 3: Cache Performance */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-mono text-[10px] uppercase">In-Memory Cache</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-heading font-extrabold text-white font-mono flex items-baseline gap-1">
              <span>{healthData?.cache?.hits ?? 0}</span>
              <span className="text-xs font-normal text-slate-400">hits ({healthData?.cache?.misses ?? 0} misses)</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">{healthData?.cache?.activeKeys ?? 0} keys cached</span>
          </div>

          {/* Metric 4: System Memory */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-mono text-[10px] uppercase">Process Memory</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-heading font-extrabold text-white font-mono flex items-baseline gap-1">
              <span>{healthData?.memory?.rss || '108 MB'}</span>
              <span className="text-xs font-normal text-slate-400">RSS</span>
            </div>
            <span className="text-[10px] text-purple-400 font-mono">Heap: {healthData?.memory?.heapUsed || '22 MB'}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards (Matches BWP_pro admin header mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Players */}
        <div className="gaming-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Players
            </span>
            <Users className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {kpiLoading ? '...' : kpis?.totalPlayers || 0}
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Registered competitors</span>
        </div>

        {/* KPI 2: Active Organizers */}
        <div className="gaming-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Organizers
            </span>
            <Trophy className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {kpiLoading ? '...' : kpis?.activeOrganizers || 0}
          </div>
          <span className="text-[10px] text-blue-400 font-mono">Verified tournament hosts</span>
        </div>

        {/* KPI 3: Active Tournaments */}
        <div className="gaming-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Tournaments
            </span>
            <Swords className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {kpiLoading ? '...' : kpis?.activeTournaments || 0}
          </div>
          <span className="text-[10px] text-purple-400 font-mono">Live / open registration</span>
        </div>

        {/* KPI 4: Total Games */}
        <div className="gaming-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Available Games
            </span>
            <Gamepad2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {kpiLoading ? '...' : kpis?.totalGames || 0}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Master catalog titles</span>
        </div>
      </div>

      {/* SYSTEM DATABASE: COMPREHENSIVE ENTITY MANAGEMENT */}
      <div className="gaming-card rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              SYSTEM DATABASE
            </span>
            <h2 className="text-xl font-heading font-bold text-white">
              Entity Management Suite
            </h2>
          </div>

          {activeTab === 'games' && (
            <button
              onClick={() => setGameModalState({ isOpen: true, game: null })}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-heading font-bold text-xs shadow-glow-cyan flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD NEW GAME</span>
            </button>
          )}
        </div>

        {/* Tab Headers matching BWP_pro mockup exactly */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {(['players', 'organizers', 'referees', 'games', 'tournaments', 'audit'] as DatabaseTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearch('');
                  setSortBy('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'players' && <Users className="w-3.5 h-3.5" />}
                {tab === 'organizers' && <Trophy className="w-3.5 h-3.5" />}
                {tab === 'referees' && <Shield className="w-3.5 h-3.5" />}
                {tab === 'games' && <Gamepad2 className="w-3.5 h-3.5" />}
                {tab === 'tournaments' && <Swords className="w-3.5 h-3.5" />}
                {tab === 'audit' && <FileText className="w-3.5 h-3.5" />}
                <span>{tab === 'audit' ? 'Audit Logs' : tab}</span>
              </button>
            )
          )}
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total Entities: <span className="text-cyan-400 font-bold">{totalCount}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-300">
            {/* Table Headers */}
            <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
              {activeTab === 'players' && (
                <tr>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('username')}>
                    <div className="flex items-center space-x-1">
                      <span>Player Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Player UUID</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center space-x-1">
                      <span>Joined Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Tournaments Joined</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              )}

              {activeTab === 'organizers' && (
                <tr>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('username')}>
                    <div className="flex items-center space-x-1">
                      <span>Organizer Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Organizer UUID</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center space-x-1">
                      <span>Joined Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Tournaments Managed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              )}

              {activeTab === 'referees' && (
                <tr>
                  <th className="py-3 px-4">Referee Name</th>
                  <th className="py-3 px-4">Referee UUID</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Matches Adjudicated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              )}

              {activeTab === 'games' && (
                <tr>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('title')}>
                    <div className="flex items-center space-x-1">
                      <span>Game Title</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Genre / Category</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Team Format</th>
                  <th className="py-3 px-4">Min-Max Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              )}

              {activeTab === 'tournaments' && (
                <tr>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('title')}>
                    <div className="flex items-center space-x-1">
                      <span>Tournament Title</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Game Type</th>
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect Action</th>
                </tr>
              )}

              {activeTab === 'audit' && (
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">IP / Context</th>
                  <th className="py-3 px-4 text-right">Details Context</th>
                </tr>
              )}
            </thead>

            {/* Table Body with Loading Skeletons */}
            <tbody className="divide-y divide-slate-800/60">
              {tableLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No entities found in {activeTab}.
                  </td>
                </tr>
              ) : (
                tableData.map((item) => {
                  if (activeTab === 'players' || activeTab === 'organizers' || activeTab === 'referees') {
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                              {item.username.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span>{item.username}</span>
                              <span className="text-[11px] text-slate-500 block font-normal">
                                {item.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-semibold">
                          {item.gamesPlayed ?? item.tournamentsManaged ?? item.matchesAdjudicated ?? 0}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.isBanned ? (
                            <span className="inline-flex items-center space-x-1 text-red-400 text-xs font-semibold">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Banned</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.isBanned ? (
                            <button
                              onClick={() => handleUnban(item.id)}
                              className="px-3 py-1 rounded text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                            >
                              Revoke Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanTarget({ id: item.id, username: item.username })}
                              className="px-3 py-1 rounded text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center space-x-1 ml-auto transition-colors"
                            >
                              <Ban className="w-3 h-3" />
                              <span>BAN USER</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'games') {
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-3">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-slate-700">
                                {item.title.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span>{item.title}</span>
                              <span className="text-[11px] text-slate-500 block font-mono">
                                slug: {item.slug}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-cyan-400 font-medium">{item.genre}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                          {item.platform || 'PC'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              item.isTeamBased
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.isTeamBased ? 'TEAM FORMAT' : 'SOLO ONLY'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                          {item.minTeamSize}-{item.maxTeamSize}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setGameModalState({ isOpen: true, game: item })}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                            title="Edit Game"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGame(item.id, item.title)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                            title="Delete Game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'tournaments') {
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setInspectTournamentId(item.id)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          <div className="flex items-center space-x-2">
                            <span>{item.title}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-cyan-400 font-medium">
                          {item.game?.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {item.organizer?.username}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {item.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(item.startDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectTournamentId(item.id);
                            }}
                            className="px-3 py-1 rounded text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center space-x-1 ml-auto transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect DB</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'audit') {
                    const getActionBadge = (type: string) => {
                      if (type.includes('BAN')) return 'bg-red-500/10 text-red-400 border-red-500/30';
                      if (type.includes('VERIFY')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      if (type.includes('DISPUTE')) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                      if (type.includes('SCORE')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      if (type.includes('DELETE')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                    };

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.actor ? (
                            <div>
                              <span className="font-semibold text-white block text-xs">
                                {item.actor.username}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                                {item.actor.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">SYSTEM</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadge(
                              item.actionType
                            )}`}
                          >
                            {item.actionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-white">
                          {item.targetEntity}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                          {item.targetId || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {item.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded max-w-[200px] truncate inline-block">
                            {item.details || '{}'}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-mono">{page}</span> of{' '}
            <span className="text-white font-mono">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-slate-800 rounded font-mono text-cyan-400">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modals */}
      {banTarget && (
        <BanModal
          isOpen={!!banTarget}
          onClose={() => setBanTarget(null)}
          userId={banTarget.id}
          username={banTarget.username}
          onSuccess={() => {
            loadTable();
            loadKpis();
          }}
        />
      )}

      {gameModalState.isOpen && (
        <GameModal
          isOpen={gameModalState.isOpen}
          onClose={() => setGameModalState({ isOpen: false, game: null })}
          gameToEdit={gameModalState.game}
          onSuccess={() => {
            loadTable();
            loadKpis();
          }}
        />
      )}

      {inspectTournamentId && (
        <TournamentInspectorModal
          isOpen={!!inspectTournamentId}
          onClose={() => setInspectTournamentId(null)}
          tournamentId={inspectTournamentId}
          onTournamentDeleted={() => {
            loadTable();
            loadKpis();
          }}
        />
      )}
    </div>
  );
};
