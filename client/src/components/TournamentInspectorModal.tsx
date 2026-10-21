import React, { useEffect, useState, useMemo } from 'react';
import { adminService, TournamentInspection } from '../services/admin.service';
import { tournamentService } from '../services/tournament.service';
import {
  X,
  Trophy,
  Users,
  Swords,
  Trash2,
  Calendar,
  Gamepad2,
  Shield,
  CheckCircle,
  Ban,
  Clock,
  AlertCircle,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onTournamentDeleted: () => void;
}

export const TournamentInspectorModal: React.FC<InspectorModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  onTournamentDeleted
}) => {
  const [data, setData] = useState<TournamentInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'brackets'>('players');
  const [isDeleting, setIsDeleting] = useState(false);

  // Export & Copy State
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Table Filtering, Sorting & Pagination - PLAYERS
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSortField, setPlayerSortField] = useState<string>('registeredAt');
  const [playerSortOrder, setPlayerSortOrder] = useState<'asc' | 'desc'>('asc');
  const [playerPage, setPlayerPage] = useState(1);
  const [playerPageSize, setPlayerPageSize] = useState(8);

  // Table Filtering, Sorting & Pagination - TEAMS
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSortField, setTeamSortField] = useState<string>('name');
  const [teamSortOrder, setTeamSortOrder] = useState<'asc' | 'desc'>('asc');
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(6);

  // Search filter - BRACKETS
  const [bracketSearch, setBracketSearch] = useState('');

  useEffect(() => {
    if (isOpen && tournamentId) {
      loadInspection();
    }
  }, [isOpen, tournamentId]);

  const loadInspection = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.inspectTournament(tournamentId);
      setData(res);
      // Auto-set tab to players if format is SOLO
      if (res.overview.format === 'SOLO' && activeTab === 'teams') {
        setActiveTab('players');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to inspect tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`ADMIN WARNING: Are you sure you want to PERMANENTLY delete "${data?.overview.title}"? All associated rosters, brackets, and scores will be purged.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await adminService.deleteTournament(tournamentId);
      onTournamentDeleted();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete tournament');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (type: 'participants' | 'teams' | 'scores') => {
    if (!tournamentId || !data) return;
    try {
      setExportingType(type);
      if (type === 'participants') {
        await tournamentService.exportParticipants(tournamentId, data.overview.title);
      } else if (type === 'teams') {
        await tournamentService.exportTeams(tournamentId, data.overview.title);
      } else if (type === 'scores') {
        await tournamentService.exportScores(tournamentId, data.overview.title);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to export ${type} data`);
    } finally {
      setExportingType(null);
    }
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  // Filtered & sorted players
  const processedPlayers = useMemo(() => {
    if (!data?.players) return { rows: [], total: 0 };
    let list = [...data.players];

    if (playerSearch.trim()) {
      const q = playerSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.username.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.team && p.team.name.toLowerCase().includes(q)) ||
          p.status.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = (a as any)[playerSortField];
      let valB: any = (b as any)[playerSortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return playerSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return playerSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const startIdx = (playerPage - 1) * playerPageSize;
    const rows = list.slice(startIdx, startIdx + playerPageSize);
    return { rows, total };
  }, [data?.players, playerSearch, playerSortField, playerSortOrder, playerPage, playerPageSize]);

  // Filtered & sorted teams
  const processedTeams = useMemo(() => {
    if (!data?.teams) return { rows: [], total: 0 };
    let list = [...data.teams];

    if (teamSearch.trim()) {
      const q = teamSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.tag && t.tag.toLowerCase().includes(q)) ||
          (t.inviteCode && t.inviteCode.toLowerCase().includes(q)) ||
          t.captain.username.toLowerCase().includes(q) ||
          t.members.some((m) => m.username.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA: any = (a as any)[teamSortField];
      let valB: any = (b as any)[teamSortField];
      if (teamSortField === 'captain') {
        valA = a.captain.username.toLowerCase();
        valB = b.captain.username.toLowerCase();
      } else {
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      }
      if (valA < valB) return teamSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return teamSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const startIdx = (teamPage - 1) * teamPageSize;
    const rows = list.slice(startIdx, startIdx + teamPageSize);
    return { rows, total };
  }, [data?.teams, teamSearch, teamSortField, teamSortOrder, teamPage, teamPageSize]);

  // Filtered brackets
  const filteredBrackets = useMemo(() => {
    if (!data?.bracket) return [];
    if (!bracketSearch.trim()) return data.bracket;

    const q = bracketSearch.toLowerCase();
    return data.bracket
      .map((round) => {
        const matches = round.matches.filter(
          (m) =>
            m.matchNumber.toString().includes(q) ||
            m.status.toLowerCase().includes(q) ||
            m.results.some((r) => r.competitorName.toLowerCase().includes(q))
        );
        return { ...round, matches };
      })
      .filter((round) => round.matches.length > 0);
  }, [data?.bracket, bracketSearch]);

  const togglePlayerSort = (field: string) => {
    if (playerSortField === field) {
      setPlayerSortOrder(playerSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPlayerSortField(field);
      setPlayerSortOrder('asc');
    }
  };

  const toggleTeamSort = (field: string) => {
    if (teamSortField === field) {
      setTeamSortOrder(teamSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamSortField(field);
      setTeamSortOrder('asc');
    }
  };

  if (!isOpen) return null;

  const isSolo = data?.overview.format === 'SOLO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden gaming-card">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {data?.overview.format || 'FORMAT'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {data?.overview.status || 'STATUS'}
                </span>
                <span className="text-xs text-slate-400">
                  ID: <span className="font-mono text-slate-300">{tournamentId.slice(0, 8)}...</span>
                </span>
              </div>
              <h2 className="text-xl font-heading font-extrabold text-white mt-1">
                {data?.overview.title || 'Tournament Inspector'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Quick Export Dropdown/Buttons */}
            <button
              onClick={() => handleExport('participants')}
              disabled={exportingType !== null || !data}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
              title="Export Players CSV"
            >
              {exportingType === 'participants' ? (
                <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Players CSV</span>
            </button>

            {!isSolo && (
              <button
                onClick={() => handleExport('teams')}
                disabled={exportingType !== null || !data}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
                title="Export Teams CSV"
              >
                {exportingType === 'teams' ? (
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>Teams CSV</span>
              </button>
            )}

            <button
              onClick={() => handleExport('scores')}
              disabled={exportingType !== null || !data}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
              title="Export Scoreboard CSV"
            >
              {exportingType === 'scores' ? (
                <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Scores CSV</span>
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Force Delete Tournament"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tournament Meta Bar */}
        {data && (
          <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                {data.overview.game?.title}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Organizer: {data.overview.organizer?.username}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(data.overview.startDate).toLocaleDateString()}
              </span>
            </div>

            <div className="font-mono text-cyan-400">
              Capacity: {data.overview.currentCount} / {data.overview.maxParticipants} slots
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/30 flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`py-3 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'players'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tab 1: Registered Players ({data?.players.length || 0})</span>
          </button>

          {!isSolo ? (
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-3 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'teams'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tab 2: Registered Teams ({data?.teams.length || 0})</span>
            </button>
          ) : (
            <div className="py-3 text-xs font-mono text-slate-600 flex items-center space-x-1.5 cursor-not-allowed">
              <Trophy className="w-3.5 h-3.5" />
              <span>Tab 2: Teams (Bypassed for SOLO)</span>
            </div>
          )}

          <button
            onClick={() => setActiveTab('brackets')}
            className={`py-3 text-xs font-heading font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'brackets'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Tab 3: Scores & Match Brackets ({data?.bracket.length || 0} Rounds)</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-mono">Retrieving tournament relational scope...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: REGISTERED PLAYERS */}
              {activeTab === 'players' && (
                <div className="space-y-4">
                  {/* Search Bar & Stats */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search players by IGN, email, team..."
                        value={playerSearch}
                        onChange={(e) => {
                          setPlayerSearch(e.target.value);
                          setPlayerPage(1);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Showing {processedPlayers.rows.length} of {processedPlayers.total} Players
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-800 select-none">
                        <tr>
                          <th
                            className="py-2.5 px-4 cursor-pointer hover:text-white"
                            onClick={() => togglePlayerSort('username')}
                          >
                            <div className="flex items-center gap-1">
                              <span>Player</span>
                              {playerSortField === 'username' ? (
                                playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th className="py-2.5 px-4">User ID</th>
                          {!isSolo && <th className="py-2.5 px-4">Assigned Team</th>}
                          <th className="py-2.5 px-4">Account Status</th>
                          <th
                            className="py-2.5 px-4 cursor-pointer hover:text-white"
                            onClick={() => togglePlayerSort('status')}
                          >
                            <div className="flex items-center gap-1">
                              <span>Tournament Status</span>
                              {playerSortField === 'status' ? (
                                playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-4 cursor-pointer hover:text-white"
                            onClick={() => togglePlayerSort('registeredAt')}
                          >
                            <div className="flex items-center gap-1">
                              <span>Registered At</span>
                              {playerSortField === 'registeredAt' ? (
                                playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-600" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {processedPlayers.rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                              {playerSearch ? 'No players matching your search criteria.' : 'No players registered in this tournament.'}
                            </td>
                          </tr>
                        ) : (
                          processedPlayers.rows.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-4 font-semibold text-white">
                                {p.username}
                                <span className="text-[11px] text-slate-500 block font-normal">
                                  {p.email}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                {p.userId.slice(0, 8)}...
                              </td>
                              {!isSolo && (
                                <td className="py-3 px-4 text-cyan-400 font-mono">
                                  {p.team ? `${p.team.name} ${p.team.tag ? `[${p.team.tag}]` : ''}` : 'No Team'}
                                </td>
                              )}
                              <td className="py-3 px-4">
                                {p.isBanned ? (
                                  <span className="text-red-400 font-semibold flex items-center gap-1">
                                    <Ban className="w-3 h-3" /> Banned
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Active
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {p.disqualified ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                                    DISQUALIFIED
                                  </span>
                                ) : p.status === 'CHECKED_IN' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                                    <CheckCircle className="w-3 h-3" /> CHECKED_IN
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                    {p.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {new Date(p.registeredAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Players Pagination */}
                  {processedPlayers.total > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>
                        Page {playerPage} of {Math.ceil(processedPlayers.total / playerPageSize) || 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPlayerPage((p) => Math.max(1, p - 1))}
                          disabled={playerPage === 1}
                          className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPlayerPage((p) => Math.min(Math.ceil(processedPlayers.total / playerPageSize), p + 1))}
                          disabled={playerPage >= Math.ceil(processedPlayers.total / playerPageSize)}
                          className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REGISTERED TEAMS (Omitted if SOLO) */}
              {activeTab === 'teams' && !isSolo && (
                <div className="space-y-4">
                  {/* Search Bar & Stats */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search teams by name, tag, code, captain..."
                        value={teamSearch}
                        onChange={(e) => {
                          setTeamSearch(e.target.value);
                          setTeamPage(1);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Showing {processedTeams.rows.length} of {processedTeams.total} Teams
                    </div>
                  </div>

                  {processedTeams.rows.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-mono">
                      {teamSearch ? 'No teams matching your search.' : `No teams registered in this ${data?.overview.format} tournament.`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {processedTeams.rows.map((team) => (
                        <div
                          key={team.id}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-bold text-white text-base">
                              {team.name} {team.tag && <span className="text-cyan-400 font-mono">[{team.tag}]</span>}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Captain: {team.captain.username}
                            </span>
                          </div>

                          {/* Invite Code Quick Copy */}
                          {team.inviteCode && (
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg w-max">
                              <span className="text-[10px] text-slate-400 font-mono">Invite Code:</span>
                              <span className="font-mono text-cyan-400 font-bold text-xs tracking-wider">
                                {team.inviteCode}
                              </span>
                              <button
                                onClick={() => handleCopyInviteCode(team.inviteCode!)}
                                className="text-slate-400 hover:text-white p-0.5"
                                title="Copy team invite code"
                              >
                                {copiedCode === team.inviteCode ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              {copiedCode === team.inviteCode && (
                                <span className="text-[9px] text-emerald-400 font-mono">Copied!</span>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-slate-400">
                            Roster Members ({team.members.length}):
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {team.members.map((m) => (
                                <span
                                  key={m.id}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono text-[11px] flex items-center space-x-1"
                                >
                                  <span>{m.username}</span>
                                  {m.role === 'CAPTAIN' && (
                                    <span className="text-[9px] text-cyan-400 font-bold">(C)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Teams Pagination */}
                  {processedTeams.total > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>
                        Page {teamPage} of {Math.ceil(processedTeams.total / teamPageSize) || 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                          disabled={teamPage === 1}
                          className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTeamPage((p) => Math.min(Math.ceil(processedTeams.total / teamPageSize), p + 1))}
                          disabled={teamPage >= Math.ceil(processedTeams.total / teamPageSize)}
                          className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SCORES & MATCH BRACKETS */}
              {activeTab === 'brackets' && (
                <div className="space-y-6">
                  {/* Search bar for brackets */}
                  <div className="relative max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search match #, status, competitor..."
                      value={bracketSearch}
                      onChange={(e) => setBracketSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {filteredBrackets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-mono">
                      {bracketSearch ? 'No matches match your filter.' : 'No match bracket generated yet for this tournament.'}
                    </div>
                  ) : (
                    filteredBrackets.map((round) => (
                      <div key={round.id} className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-heading font-bold text-cyan-400 uppercase tracking-wider">
                            Round {round.roundNumber}: {round.name}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400">{round.matches.length} Matches</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {round.matches.map((m) => (
                            <div
                              key={m.id}
                              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Match #{m.matchNumber}</span>
                                <span className="font-mono text-cyan-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800">
                                  {m.status}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {m.results.length === 0 ? (
                                  <div className="text-[11px] text-slate-500 italic">
                                    Awaiting competitors assignment
                                  </div>
                                ) : (
                                  m.results.map((res) => (
                                    <div
                                      key={res.id}
                                      className={`p-2 rounded-lg flex items-center justify-between text-xs font-medium ${
                                        res.isWinner
                                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-slate-900 text-slate-300'
                                      }`}
                                    >
                                      <span>{res.competitorName}</span>
                                      <span className="font-mono font-bold">
                                        Score: {res.score}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
