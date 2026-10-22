import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminService, KPISummary } from '../services/admin.service';
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
  Archive,
  ArchiveRestore
} from 'lucide-react';


export type DatabaseTab = 'players' | 'organizers' | 'games' | 'tournaments';

interface AdminDashboardProps {
  defaultTab?: DatabaseTab;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ defaultTab = 'players' }) => {
  const location = useLocation();

  const getInitialTab = (): DatabaseTab => {
    const hash = location.hash.replace('#', '');
    if (hash === 'games') return 'games';
    if (hash === 'tournaments') return 'tournaments';
    if (hash === 'users' || hash === 'players') return 'players';
    if (hash === 'organizers') return 'organizers';
    return defaultTab;
  };

  // KPI Summary
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Active Tab & Table State
  const [activeTab, setActiveTab] = useState<DatabaseTab>(getInitialTab);
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

      const res = await adminService.getTableData(activeTab as any, {
        page,
        limit: 8,
        search,
        sortBy: sortBy || undefined,
        sortOrder
      });
      const rawData = Array.isArray(res?.data)
        ? res.data
        : (res as any)?.games || (res as any)?.tournaments || (res as any)?.data || [];
      setTableData(rawData || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalCount(res?.pagination?.total || (rawData || []).length || 0);
    } catch (err) {
      console.error('Failed to load table:', err);
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };


  useEffect(() => {
    loadKpis();
  }, []);


  // Sync activeTab if location.hash changes (e.g. from Sidebar links)
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash === 'games' && activeTab !== 'games') {
      setTableData([]);
      setActiveTab('games');
    } else if (hash === 'tournaments' && activeTab !== 'tournaments') {
      setTableData([]);
      setActiveTab('tournaments');
    } else if ((hash === 'users' || hash === 'players') && activeTab !== 'players') {
      setTableData([]);
      setActiveTab('players');
    } else if (hash === 'organizers' && activeTab !== 'organizers') {
      setTableData([]);
      setActiveTab('organizers');
    }
  }, [location.hash]);

  useEffect(() => {
    setTableData([]);
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
    if (!window.confirm(`Are you sure you want to delete or retire "${title}" from the catalog?`)) return;
    try {
      const res = await adminService.deleteGame(gameId);
      if (res?.message) {
        alert(res.message);
      }
      loadTable();
      loadKpis();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete game');
    }
  };

  const handleToggleGameArchive = async (gameId: string, currentActive: boolean, title: string) => {
    const action = currentActive ? 'archive' : 'unarchive';
    if (!window.confirm(`Are you sure you want to ${action} "${title}"?`)) return;
    try {
      const res = await adminService.toggleGameStatus(gameId, !currentActive);
      if (res?.message) {
        alert(res.message);
      }
      loadTable();
      loadKpis();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} game`);
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
          {(['players', 'organizers', 'games', 'tournaments'] as DatabaseTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setTableData([]);
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
                {tab === 'games' && <Gamepad2 className="w-3.5 h-3.5" />}
                {tab === 'tournaments' && <Swords className="w-3.5 h-3.5" />}
                <span>{tab}</span>
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
                  <th className="py-3 px-4">Status</th>
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
              ) : (() => {
                const safeTableData = Array.isArray(tableData) ? tableData : [];
                const currentItems = (safeTableData || []).slice(0, safeTableData.length);

                if (currentItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No entities found in {activeTab}.
                      </td>
                    </tr>
                  );
                }

                return (currentItems || []).map((item) => {
                  if (!item) return null;

                  if (activeTab === 'players' || activeTab === 'organizers') {
                    if (!item.username && !item.email) return null;
                    const username = item.username ? String(item.username) : 'User';
                    const uuid = item.id ? `${String(item.id).slice(0, 8)}...` : '—';

                    return (
                      <tr key={item.id || Math.random()} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                              {(username ? String(username) : 'U').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span>{username}</span>
                              <span className="text-[11px] text-slate-500 block font-normal">
                                {item.email || ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {uuid}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-semibold">
                          {item.gamesPlayed ?? item.tournamentsManaged ?? 0}
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
                              onClick={() => setBanTarget({ id: item.id, username })}
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
                    if (!item.title && !item.slug && !item.name) return null;
                    const gameTitle = item.title ? String(item.title) : item.name ? String(item.name) : 'Untitled';

                    return (
                      <tr key={item.id || Math.random()} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-3">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={gameTitle}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-9 h-9 rounded-lg bg-slate-800 items-center justify-center text-cyan-400 font-bold border border-slate-700 ${item.coverImage ? 'hidden' : 'flex'}`}>
                              {(gameTitle ? String(gameTitle) : 'UN').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span>{gameTitle}</span>
                              <span className="text-[11px] text-slate-500 block font-mono">
                                slug: {item.slug || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-cyan-400 font-medium">{item.genre || 'Esports'}</td>
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
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border inline-flex items-center gap-1.5 ${
                              item.isActive !== false
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isActive !== false ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                              }`}
                            />
                            {item.isActive !== false ? 'ACTIVE' : 'ARCHIVED'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                          {item.minTeamSize ?? 1}-{item.maxTeamSize ?? 1}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleGameArchive(item.id, item.isActive !== false, gameTitle)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              item.isActive !== false
                                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                            }`}
                            title={item.isActive !== false ? 'Archive Game (Hide from new tournaments)' : 'Unarchive Game (Make active)'}
                          >
                            {item.isActive !== false ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setGameModalState({ isOpen: true, game: item })}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                            title="Edit Game"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGame(item.id, gameTitle)}
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
                    if (!item.title) return null;
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
                          {item.game?.title || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {item.organizer?.username || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {item.format || 'SOLO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {item.startDate ? new Date(item.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {item.status || 'DRAFT'}
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


                  return null;

                });
              })()}
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
