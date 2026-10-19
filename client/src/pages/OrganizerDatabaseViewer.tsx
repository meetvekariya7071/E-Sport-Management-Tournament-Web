import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tournamentService, TournamentDatabaseView } from '../api/tournament.service';
import {
  Trophy,
  Users,
  Gamepad2,
  Calendar,
  Swords,
  Shield,
  ArrowLeft,
  CheckCircle,
  Ban,
  Lock,
  Save,
  Plus,
  Coins,
  AlertCircle,
  Zap,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export const OrganizerDatabaseViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dbData, setDbData] = useState<TournamentDatabaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'scores'>('players');

  // Search & Filter State
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [scoreSearch, setScoreSearch] = useState('');

  // Sorting State
  const [playerSort, setPlayerSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'slotNumber', order: 'asc' });
  const [teamSort, setTeamSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'slotNumber', order: 'asc' });
  const [scoreSort, setScoreSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'rank', order: 'asc' });

  // Pagination State
  const [playerPage, setPlayerPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [scorePage, setScorePage] = useState(1);
  const pageSize = 8;

  // Invite Code Copy State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Export State
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Score Entry State
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [editingScores, setEditingScores] = useState<Array<{ participantId: string; score: number; kills: number; isWinner: boolean }>>([]);
  const [isSubmittingScores, setIsSubmittingScores] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState<string | null>(null);

  const loadDatabase = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentService.getTournamentDatabase(id);
      setDbData(data);

      // Auto-switch to players if Solo format and teams tab was active
      if (data.overview.format === 'SOLO' && activeTab === 'teams') {
        setActiveTab('players');
      }

      // Pre-select first match for score entry if available
      const allMatches = data.scoreMatrix.rounds.flatMap((r) => r.matches);
      if (allMatches.length > 0 && !selectedMatchId) {
        selectMatchForScoring(allMatches[0].matchId, data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load tournament database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, [id]);

  const selectMatchForScoring = (matchId: string, currentData = dbData) => {
    if (!currentData) return;
    setSelectedMatchId(matchId);
    const round = currentData.scoreMatrix.rounds.find((r) =>
      r.matches.some((m) => m.matchId === matchId)
    );
    const match = round?.matches.find((m) => m.matchId === matchId);

    if (match) {
      if (match.results.length > 0) {
        setEditingScores(
          match.results.map((res) => ({
            participantId: res.participantId,
            score: res.score,
            kills: res.kills || 0,
            isWinner: res.isWinner
          }))
        );
      } else {
        // Pre-fill with tournament participants
        setEditingScores(
          currentData.playersTable.slice(0, 2).map((p) => ({
            participantId: p.participantId,
            score: 0,
            kills: 0,
            isWinner: false
          }))
        );
      }
    }
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedMatchId) return;

    try {
      setIsSubmittingScores(true);
      setScoreSuccess(null);
      await tournamentService.submitScores(id, selectedMatchId, editingScores);
      setScoreSuccess('Scores committed successfully! Standings recalculated.');
      await loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to submit scores');
    } finally {
      setIsSubmittingScores(false);
    }
  };

  const handleDisqualify = async (participantId: string, ign: string) => {
    const reason = window.prompt(`Provide disqualification reason for player "${ign}":`);
    if (reason === null) return;

    if (!id) return;
    try {
      await tournamentService.disqualifyParticipant(id, participantId, reason || 'Disqualified by Organizer');
      await loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to disqualify player');
    }
  };

  const handleCompleteTournament = async () => {
    if (!id) return;
    if (
      !window.confirm(
        'Are you sure you want to officially conclude this tournament? Its scoring database and match results will be permanently archived and locked.'
      )
    ) {
      return;
    }

    try {
      await tournamentService.completeTournament(id);
      await loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to conclude tournament');
    }
  };

  const handleExport = async (type: 'participants' | 'teams' | 'scores') => {
    if (!id) return;
    try {
      setExportLoading(type);
      if (type === 'participants') {
        await tournamentService.exportParticipants(id);
      } else if (type === 'teams') {
        await tournamentService.exportTeams(id);
      } else if (type === 'scores') {
        await tournamentService.exportScores(id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Export failed.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Processed (Filtered & Sorted) Players
  const processedPlayers = useMemo(() => {
    if (!dbData) return [];
    let list = dbData.playersTable.filter((p) => {
      const q = playerSearch.toLowerCase();
      return (
        p.ign.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.teamName && p.teamName.toLowerCase().includes(q)) ||
        p.status.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let valA: any = a[playerSort.field as keyof typeof a];
      let valB: any = b[playerSort.field as keyof typeof b];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return playerSort.order === 'asc' ? -1 : 1;
      if (valA > valB) return playerSort.order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [dbData, playerSearch, playerSort]);

  const totalPlayerPages = Math.max(1, Math.ceil(processedPlayers.length / pageSize));
  const paginatedPlayers = processedPlayers.slice((playerPage - 1) * pageSize, playerPage * pageSize);

  // Processed (Filtered & Sorted) Teams
  const processedTeams = useMemo(() => {
    if (!dbData) return [];
    let list = dbData.teamsTable.filter((t) => {
      const q = teamSearch.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        (t.inviteCode && t.inviteCode.toLowerCase().includes(q)) ||
        t.captain.username.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let valA: any = a[teamSort.field as keyof typeof a];
      let valB: any = b[teamSort.field as keyof typeof b];
      if (teamSort.field === 'captain') {
        valA = a.captain.username.toLowerCase();
        valB = b.captain.username.toLowerCase();
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return teamSort.order === 'asc' ? -1 : 1;
      if (valA > valB) return teamSort.order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [dbData, teamSearch, teamSort]);

  const totalTeamPages = Math.max(1, Math.ceil(processedTeams.length / pageSize));
  const paginatedTeams = processedTeams.slice((teamPage - 1) * pageSize, teamPage * pageSize);

  // Processed (Filtered & Sorted) Scoreboard
  const processedScores = useMemo(() => {
    if (!dbData) return [];
    let list = dbData.scoreMatrix.leaderboard.map((item, idx) => ({ ...item, rank: idx + 1 })).filter((s) => {
      const q = scoreSearch.toLowerCase();
      return s.competitorName.toLowerCase().includes(q);
    });

    list.sort((a, b) => {
      let valA: any = a[scoreSort.field as keyof typeof a];
      let valB: any = b[scoreSort.field as keyof typeof b];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return scoreSort.order === 'asc' ? -1 : 1;
      if (valA > valB) return scoreSort.order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [dbData, scoreSearch, scoreSort]);

  const totalScorePages = Math.max(1, Math.ceil(processedScores.length / pageSize));
  const paginatedScores = processedScores.slice((scorePage - 1) * pageSize, scorePage * pageSize);

  const toggleSort = (
    current: { field: string; order: 'asc' | 'desc' },
    setSort: (val: { field: string; order: 'asc' | 'desc' }) => void,
    field: string
  ) => {
    if (current.field === field) {
      setSort({ field, order: current.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, order: 'asc' });
    }
  };

  const renderSortIndicator = (current: { field: string; order: 'asc' | 'desc' }, field: string) => {
    if (current.field !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 inline ml-1 opacity-70 group-hover:opacity-100" />;
    }
    return current.order === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Querying Isolated Tournament Sub-Database...
        </p>
      </div>
    );
  }

  if (error || !dbData) {
    return (
      <div className="p-8 gaming-card border border-red-500/30 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-heading font-bold text-white">Database Access Failed</h2>
        <p className="text-xs text-slate-400">{error || 'Tournament sub-database could not be loaded.'}</p>
        <Link
          to="/organizer"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-heading hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Workspace</span>
        </Link>
      </div>
    );
  }

  const { overview } = dbData;
  const isSolo = overview.format === 'SOLO';
  const isCompleted = overview.status === 'COMPLETED';

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-4">
          <Link
            to="/organizer"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-semibold">
                Database Inspector
              </span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-xs text-slate-400 font-mono font-medium">{overview.title}</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold text-white mt-1">
              Tournament Sub-Database Viewer
            </h1>
          </div>
        </div>

        {/* Global Action Bar with Sub-Database Exports */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => handleExport('participants')}
              disabled={exportLoading !== null}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5"
              title="Download Participants CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Players CSV</span>
            </button>

            {!isSolo && (
              <button
                onClick={() => handleExport('teams')}
                disabled={exportLoading !== null}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5"
                title="Download Teams CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Teams CSV</span>
              </button>
            )}

            <button
              onClick={() => handleExport('scores')}
              disabled={exportLoading !== null}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5"
              title="Download Scores CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scoreboard CSV</span>
            </button>
          </div>

          {!isCompleted ? (
            <button
              onClick={handleCompleteTournament}
              className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-xs font-heading font-bold uppercase transition-all flex items-center space-x-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Conclude & Archive</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Database Archived</span>
            </div>
          )}
        </div>
      </div>

      {/* Database Viewer Tab Navigation */}
      <div className="gaming-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('players')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                activeTab === 'players'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Database 1: Players Table ({dbData.playersTable.length})</span>
            </button>

            {!isSolo ? (
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                  activeTab === 'teams'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Database 2: Teams Table ({dbData.teamsTable.length})</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 text-xs font-mono text-slate-600 flex items-center space-x-1.5 cursor-not-allowed">
                <Trophy className="w-3.5 h-3.5" />
                <span>Database 2: Teams (Bypassed for SOLO)</span>
              </div>
            )}

            <button
              onClick={() => setActiveTab('scores')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                activeTab === 'scores'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Database 3: Score Matrix & Standings</span>
            </button>
          </div>

          {/* Quick tab-specific export button */}
          <button
            onClick={() => handleExport(activeTab === 'players' ? 'participants' : activeTab === 'teams' ? 'teams' : 'scores')}
            disabled={exportLoading !== null}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-semibold text-cyan-400 hover:bg-slate-800 transition-all flex items-center space-x-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {exportLoading === (activeTab === 'players' ? 'participants' : activeTab === 'teams' ? 'teams' : 'scores')
                ? 'Generating...'
                : `Export ${activeTab === 'players' ? 'Players' : activeTab === 'teams' ? 'Teams' : 'Scoreboard'} (CSV)`}
            </span>
          </button>
        </div>

        {/* TAB 1: PLAYERS TABLE */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {/* Search Filter & Status Summary */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter players by IGN, email, team..."
                  value={playerSearch}
                  onChange={(e) => {
                    setPlayerSearch(e.target.value);
                    setPlayerPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span>Showing {processedPlayers.length} of {dbData.playersTable.length} participants</span>
                {isSolo && (
                  <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ✓ SOLO: team_id is null
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                  <tr>
                    <th
                      onClick={() => toggleSort(playerSort, setPlayerSort, 'slotNumber')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Slot # {renderSortIndicator(playerSort, 'slotNumber')}
                    </th>
                    <th
                      onClick={() => toggleSort(playerSort, setPlayerSort, 'ign')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Player (IGN) {renderSortIndicator(playerSort, 'ign')}
                    </th>
                    <th
                      onClick={() => toggleSort(playerSort, setPlayerSort, 'email')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Email {renderSortIndicator(playerSort, 'email')}
                    </th>
                    {!isSolo && <th className="py-3 px-4">Team</th>}
                    <th
                      onClick={() => toggleSort(playerSort, setPlayerSort, 'status')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Check-In Status {renderSortIndicator(playerSort, 'status')}
                    </th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        {playerSearch ? 'No players matching your search criteria.' : 'No players registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedPlayers.map((p) => (
                      <tr key={p.participantId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                          #{p.slotNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {p.ign}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {p.email}
                        </td>
                        {!isSolo && (
                          <td className="py-3.5 px-4 text-cyan-400 font-mono font-medium">
                            {p.teamName || 'Unassigned'}
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          {p.disqualified ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              DISQUALIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              {p.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 text-right">
                          {!p.disqualified && !isCompleted && (
                            <button
                              onClick={() => handleDisqualify(p.participantId, p.ign)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors"
                            >
                              Disqualify Player
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPlayerPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                <span>Page {playerPage} of {totalPlayerPages}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPlayerPage((p) => Math.max(1, p - 1))}
                    disabled={playerPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPlayerPage((p) => Math.min(totalPlayerPages, p + 1))}
                    disabled={playerPage === totalPlayerPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAMS TABLE (DUO/SQUAD ONLY) */}
        {activeTab === 'teams' && !isSolo && (
          <div className="space-y-4">
            {/* Search Filter & Status Summary */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter teams by name, tag, invite code..."
                  value={teamSearch}
                  onChange={(e) => {
                    setTeamSearch(e.target.value);
                    setTeamPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>

              <span>Showing {processedTeams.length} of {dbData.teamsTable.length} Teams</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                  <tr>
                    <th
                      onClick={() => toggleSort(teamSort, setTeamSort, 'slotNumber')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Slot # {renderSortIndicator(teamSort, 'slotNumber')}
                    </th>
                    <th
                      onClick={() => toggleSort(teamSort, setTeamSort, 'name')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Team Name & Tag {renderSortIndicator(teamSort, 'name')}
                    </th>
                    <th className="py-3 px-4">Invite Code</th>
                    <th
                      onClick={() => toggleSort(teamSort, setTeamSort, 'captain')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Team Captain {renderSortIndicator(teamSort, 'captain')}
                    </th>
                    <th
                      onClick={() => toggleSort(teamSort, setTeamSort, 'rosterCount')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Roster Size {renderSortIndicator(teamSort, 'rosterCount')}
                    </th>
                    <th className="py-3 px-4">Members Roster</th>
                    <th
                      onClick={() => toggleSort(teamSort, setTeamSort, 'createdAt')}
                      className="py-3 px-4 cursor-pointer hover:text-white group"
                    >
                      Created Date {renderSortIndicator(teamSort, 'createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedTeams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        {teamSearch ? 'No teams matching your search query.' : 'No teams registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTeams.map((t) => (
                      <tr key={t.teamId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                          #{t.slotNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {t.name} {t.tag && <span className="text-cyan-400 font-mono">[{t.tag}]</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {t.inviteCode ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                {t.inviteCode}
                              </span>
                              <button
                                onClick={() => handleCopyCode(t.inviteCode!)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                title="Copy Invite Code"
                              >
                                {copiedCode === t.inviteCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {t.captain.username}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {t.rosterCount} Players
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {t.members.map((m) => (
                              <span
                                key={m.userId}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]"
                              >
                                {m.username} {m.role === 'CAPTAIN' && '(C)'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalTeamPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                <span>Page {teamPage} of {totalTeamPages}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                    disabled={teamPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTeamPage((p) => Math.min(totalTeamPages, p + 1))}
                    disabled={teamPage === totalTeamPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCORE / LEADERBOARD DATABASE */}
        {activeTab === 'scores' && (
          <div className="space-y-8">
            {/* Real-Time Live Standings / Leaderboard */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Live Standings Leaderboard (Recalculated)
                </h3>

                <div className="relative max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search competitor..."
                    value={scoreSearch}
                    onChange={(e) => {
                      setScoreSearch(e.target.value);
                      setScorePage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                    <tr>
                      <th
                        onClick={() => toggleSort(scoreSort, setScoreSort, 'rank')}
                        className="py-3 px-4 cursor-pointer hover:text-white group"
                      >
                        Rank {renderSortIndicator(scoreSort, 'rank')}
                      </th>
                      <th
                        onClick={() => toggleSort(scoreSort, setScoreSort, 'competitorName')}
                        className="py-3 px-4 cursor-pointer hover:text-white group"
                      >
                        Competitor (Player / Team) {renderSortIndicator(scoreSort, 'competitorName')}
                      </th>
                      <th
                        onClick={() => toggleSort(scoreSort, setScoreSort, 'wins')}
                        className="py-3 px-4 cursor-pointer hover:text-white group"
                      >
                        Match Wins {renderSortIndicator(scoreSort, 'wins')}
                      </th>
                      <th
                        onClick={() => toggleSort(scoreSort, setScoreSort, 'totalScore')}
                        className="py-3 px-4 cursor-pointer hover:text-white group"
                      >
                        Total Score {renderSortIndicator(scoreSort, 'totalScore')}
                      </th>
                      <th
                        onClick={() => toggleSort(scoreSort, setScoreSort, 'totalKills')}
                        className="py-3 px-4 cursor-pointer hover:text-white group"
                      >
                        Total Kills {renderSortIndicator(scoreSort, 'totalKills')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedScores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          {scoreSearch ? 'No competitor matching search.' : 'Awaiting score submissions to generate leaderboard.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedScores.map((entry) => (
                        <tr key={entry.participantId} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                            #{entry.rank}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {entry.competitorName}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {entry.wins}
                          </td>
                          <td className="py-3 px-4 font-mono text-white font-bold">
                            {entry.totalScore}
                          </td>
                          <td className="py-3 px-4 font-mono text-purple-400">
                            {entry.totalKills}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalScorePages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                  <span>Page {scorePage} of {totalScorePages}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setScorePage((p) => Math.max(1, p - 1))}
                      disabled={scorePage === 1}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setScorePage((p) => Math.min(totalScorePages, p + 1))}
                      disabled={scorePage === totalScorePages}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Score Matrix Form */}
            {!isCompleted ? (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                      <Save className="w-5 h-5 text-cyan-400" />
                      Score Entry Matrix
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter points, kills, and outcomes to update match sheets and tournament rankings.
                    </p>
                  </div>
                </div>

                {scoreSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{scoreSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleScoreSubmit} className="space-y-4">
                  {/* Select Match */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Match:
                    </label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => selectMatchForScoring(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    >
                      {dbData.scoreMatrix.rounds.flatMap((r) =>
                        r.matches.map((m) => (
                          <option key={m.matchId} value={m.matchId}>
                            Round {r.roundNumber} ({r.name}) — Match #{m.matchNumber} [{m.status}]
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Competitor Scores Input Rows */}
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-300">
                      Competitor Score Entries:
                    </label>

                    {editingScores.map((scoreItem, idx) => {
                      const participant = dbData.playersTable.find(
                        (p) => p.participantId === scoreItem.participantId
                      );
                      const name = participant?.teamName || participant?.ign || `Competitor ${idx + 1}`;

                      return (
                        <div
                          key={scoreItem.participantId || idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="w-48 font-semibold text-white text-xs">
                            {name}
                          </div>

                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-mono">Score</span>
                              <input
                                type="number"
                                min={0}
                                value={scoreItem.score}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setEditingScores((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, score: val } : item))
                                  );
                                }}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-mono">Kills</span>
                              <input
                                type="number"
                                min={0}
                                value={scoreItem.kills}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setEditingScores((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, kills: val } : item))
                                  );
                                }}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>

                            <div className="pt-3 flex items-center space-x-1.5">
                              <input
                                type="checkbox"
                                id={`winner-${idx}`}
                                checked={scoreItem.isWinner}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingScores((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, isWinner: checked } : item))
                                  );
                                }}
                                className="rounded bg-slate-800 border-slate-700 text-cyan-400 focus:ring-0"
                              />
                              <label htmlFor={`winner-${idx}`} className="text-xs text-emerald-400 font-bold cursor-pointer">
                                Winner
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingScores || editingScores.length === 0}
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs shadow-glow-cyan flex items-center space-x-2 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSubmittingScores ? 'Submitting Scores...' : 'Commit Scores'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-300 text-center font-mono">
                Tournament has ended. Score matrix and match results are permanently archived and locked against modification.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
