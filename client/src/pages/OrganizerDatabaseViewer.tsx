import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tournamentService, TournamentDatabaseView } from '../services/tournament.service';
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
  Radio,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet
} from 'lucide-react';

export const OrganizerDatabaseViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dbData, setDbData] = useState<TournamentDatabaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'scores'>('players');

  // Export & Copy State
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [copiedInviteCode, setCopiedInviteCode] = useState<string | null>(null);

  // Table Filtering, Sorting & Pagination - PLAYERS
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSortField, setPlayerSortField] = useState<string>('slotNumber');
  const [playerSortOrder, setPlayerSortOrder] = useState<'asc' | 'desc'>('asc');
  const [playerPage, setPlayerPage] = useState(1);
  const [playerPageSize, setPlayerPageSize] = useState(10);

  // Table Filtering, Sorting & Pagination - TEAMS
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSortField, setTeamSortField] = useState<string>('slotNumber');
  const [teamSortOrder, setTeamSortOrder] = useState<'asc' | 'desc'>('asc');
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(10);

  // Table Filtering, Sorting & Pagination - SCORES / LEADERBOARD
  const [scoreSearch, setScoreSearch] = useState('');
  const [scoreSortField, setScoreSortField] = useState<string>('rank');
  const [scoreSortOrder, setScoreSortOrder] = useState<'asc' | 'desc'>('asc');
  const [scorePage, setScorePage] = useState(1);
  const [scorePageSize, setScorePageSize] = useState(10);

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
      setScoreSuccess('Scores committed successfully! Leaderboard standings updated.');
      loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Score submission failed');
    } finally {
      setIsSubmittingScores(false);
    }
  };

  const handleDisqualify = async (participantId: string, ign: string) => {
    const reason = prompt(`Enter reason to disqualify player "${ign}" from this tournament:`);
    if (!reason || !id) return;

    try {
      await tournamentService.disqualifyParticipant(id, participantId, reason);
      alert(`Player "${ign}" has been disqualified.`);
      loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Disqualification failed');
    }
  };

  const handleCompleteTournament = async () => {
    if (!id) return;
    if (
      !window.confirm(
        'Are you sure you want to officially complete this tournament? This will freeze and archive the score database and standings.'
      )
    ) {
      return;
    }

    try {
      await tournamentService.completeTournament(id);
      alert('Tournament marked as COMPLETED. Database is now archived.');
      loadDatabase();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete tournament');
    }
  };

  // CSV Export Handler
  const handleExport = async (type: 'participants' | 'teams' | 'scores') => {
    if (!id || !dbData) return;
    try {
      setExportingType(type);
      if (type === 'participants') {
        await tournamentService.exportParticipants(id, dbData.overview.title);
      } else if (type === 'teams') {
        await tournamentService.exportTeams(id, dbData.overview.title);
      } else if (type === 'scores') {
        await tournamentService.exportScores(id, dbData.overview.title);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to export ${type} data`);
    } finally {
      setExportingType(null);
    }
  };

  // Quick Copy Helper
  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInviteCode(code);
    setTimeout(() => {
      setCopiedInviteCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  // =========================================================================
  // DATA FILTERING & SORTING COMPUTATIONS
  // =========================================================================

  // Players filtered, sorted & paginated
  const processedPlayers = useMemo(() => {
    if (!dbData) return { rows: [], total: 0 };
    let list = [...dbData.playersTable];

    if (playerSearch.trim()) {
      const q = playerSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.ign.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.teamName && p.teamName.toLowerCase().includes(q)) ||
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
  }, [dbData?.playersTable, playerSearch, playerSortField, playerSortOrder, playerPage, playerPageSize]);

  // Teams filtered, sorted & paginated
  const processedTeams = useMemo(() => {
    if (!dbData) return { rows: [], total: 0 };
    let list = [...dbData.teamsTable];

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
      let valA: any;
      let valB: any;
      if (teamSortField === 'captain') {
        valA = a.captain.username.toLowerCase();
        valB = b.captain.username.toLowerCase();
      } else {
        valA = (a as any)[teamSortField];
        valB = (b as any)[teamSortField];
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
  }, [dbData?.teamsTable, teamSearch, teamSortField, teamSortOrder, teamPage, teamPageSize]);

  // Scores / Leaderboard filtered, sorted & paginated
  const processedScores = useMemo(() => {
    if (!dbData) return { rows: [], total: 0 };
    let list = dbData.scoreMatrix.leaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    if (scoreSearch.trim()) {
      const q = scoreSearch.toLowerCase();
      list = list.filter((s) => s.competitorName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA: any = (a as any)[scoreSortField];
      let valB: any = (b as any)[scoreSortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return scoreSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return scoreSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const startIdx = (scorePage - 1) * scorePageSize;
    const rows = list.slice(startIdx, startIdx + scorePageSize);
    return { rows, total };
  }, [dbData?.scoreMatrix.leaderboard, scoreSearch, scoreSortField, scoreSortOrder, scorePage, scorePageSize]);

  // Header Sort Toggle
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

  const toggleScoreSort = (field: string) => {
    if (scoreSortField === field) {
      setScoreSortOrder(scoreSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setScoreSortField(field);
      setScoreSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto shadow-glow-cyan"></div>
        <p className="text-xs text-slate-400 font-mono">Connecting to isolated tournament database & cache...</p>
      </div>
    );
  }

  if (error || !dbData) {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="text-red-400 text-base font-bold">{error || 'Tournament Database Not Found'}</div>
        <Link to="/organizer" className="text-cyan-400 hover:underline text-xs font-mono">
          ← Return to Organizer Workspace
        </Link>
      </div>
    );
  }

  const isSolo = dbData.overview.format === 'SOLO';
  const isCompleted = dbData.overview.status === 'COMPLETED';

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Breadcrumb & Quick Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/organizer"
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Hosted Tournaments
        </Link>

        {/* Global Quick Export Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Export CSV:
          </span>
          <button
            onClick={() => handleExport('participants')}
            disabled={exportingType !== null}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Players CSV"
          >
            {exportingType === 'participants' ? (
              <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Players</span>
          </button>

          {!isSolo && (
            <button
              onClick={() => handleExport('teams')}
              disabled={exportingType !== null}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Download Teams CSV"
            >
              {exportingType === 'teams' ? (
                <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Teams</span>
            </button>
          )}

          <button
            onClick={() => handleExport('scores')}
            disabled={exportingType !== null}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Scores & Leaderboard CSV"
          >
            {exportingType === 'scores' ? (
              <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Scoreboard</span>
          </button>
        </div>
      </div>

      {/* Database Scope Header */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-br from-slate-900 to-gaming-card shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              {dbData.overview.format} SCOPE
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border uppercase ${
                isCompleted
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {dbData.overview.status}
            </span>
          </div>

          <h1 className="text-3xl font-heading font-extrabold text-white">
            {dbData.overview.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              {dbData.overview.game?.title}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {new Date(dbData.overview.startDate).toLocaleDateString()}
            </span>
            {dbData.overview.prizePool && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-amber-400 font-mono">
                  <Coins className="w-4 h-4" />
                  {dbData.overview.prizePool}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            to={`/organizer/tournaments/${dbData.overview.id}/scoring`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-heading font-black text-xs flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span>Open Scoring Console &rarr;</span>
          </Link>

          <Link
            to={`/tournaments/${dbData.overview.id}/live`}
            target="_blank"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-heading font-bold flex items-center justify-center space-x-1.5 transition-all"
          >
            <span>Live View</span>
          </Link>

          {!isCompleted ? (
            <button
              onClick={handleCompleteTournament}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-heading font-bold text-xs shadow-glow-purple flex items-center justify-center space-x-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete & Archive</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Database Archived & Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Database Viewer Tab Navigation */}
      <div className="gaming-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
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
            <span>Database 3: Score & Leaderboard Matrix</span>
          </button>
        </div>

        {/* TAB 1: PLAYERS TABLE */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {/* Table Controls Bar: Search & Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter players by IGN, email, team, status..."
                  value={playerSearch}
                  onChange={(e) => {
                    setPlayerSearch(e.target.value);
                    setPlayerPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {playerSearch && (
                  <button
                    onClick={() => {
                      setPlayerSearch('');
                      setPlayerPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <div className="text-xs text-slate-400 font-mono">
                  Showing {processedPlayers.rows.length} of {processedPlayers.total} Competitors
                </div>
                <button
                  onClick={() => handleExport('participants')}
                  disabled={exportingType !== null}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {exportingType === 'participants' ? (
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export Players CSV</span>
                </button>
              </div>
            </div>

            {isSolo && (
              <div className="text-emerald-400 font-mono text-[11px] bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                ✓ SOLO Format: Team creation bypassed (team_id is null)
              </div>
            )}

            {/* Players Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                  <tr>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => togglePlayerSort('slotNumber')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Slot #</span>
                        {playerSortField === 'slotNumber' ? (
                          playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => togglePlayerSort('ign')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Player (IGN)</span>
                        {playerSortField === 'ign' ? (
                          playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => togglePlayerSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Email</span>
                        {playerSortField === 'email' ? (
                          playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    {!isSolo && (
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => togglePlayerSort('teamName')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Team</span>
                          {playerSortField === 'teamName' ? (
                            playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                    )}
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => togglePlayerSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Check-In Status</span>
                        {playerSortField === 'status' ? (
                          playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => togglePlayerSort('isBanned')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Account Status</span>
                        {playerSortField === 'isBanned' ? (
                          playerSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedPlayers.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                        {playerSearch ? 'No players matching your search criteria.' : 'No players registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    processedPlayers.rows.map((p) => (
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

            {/* Players Pagination */}
            {processedPlayers.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={playerPageSize}
                    onChange={(e) => {
                      setPlayerPageSize(Number(e.target.value));
                      setPlayerPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Showing {Math.min((playerPage - 1) * playerPageSize + 1, processedPlayers.total)} -{' '}
                    {Math.min(playerPage * playerPageSize, processedPlayers.total)} of {processedPlayers.total}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPlayerPage((p) => Math.max(1, p - 1))}
                    disabled={playerPage === 1}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-mono">
                    Page {playerPage} of {Math.ceil(processedPlayers.total / playerPageSize) || 1}
                  </span>
                  <button
                    onClick={() => setPlayerPage((p) => Math.min(Math.ceil(processedPlayers.total / playerPageSize), p + 1))}
                    disabled={playerPage >= Math.ceil(processedPlayers.total / playerPageSize)}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAMS TABLE (Omitted if SOLO) */}
        {activeTab === 'teams' && !isSolo && (
          <div className="space-y-4">
            {/* Table Controls Bar: Search & Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter teams by name, tag, code, captain, members..."
                  value={teamSearch}
                  onChange={(e) => {
                    setTeamSearch(e.target.value);
                    setTeamPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {teamSearch && (
                  <button
                    onClick={() => {
                      setTeamSearch('');
                      setTeamPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <div className="text-xs text-slate-400 font-mono">
                  Showing {processedTeams.rows.length} of {processedTeams.total} Teams
                </div>
                <button
                  onClick={() => handleExport('teams')}
                  disabled={exportingType !== null}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {exportingType === 'teams' ? (
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export Teams CSV</span>
                </button>
              </div>
            </div>

            {/* Teams Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                  <tr>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleTeamSort('slotNumber')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Slot #</span>
                        {teamSortField === 'slotNumber' ? (
                          teamSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleTeamSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Team Name & Tag</span>
                        {teamSortField === 'name' ? (
                          teamSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">
                      <span>Invite Code</span>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleTeamSort('captain')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Team Captain</span>
                        {teamSortField === 'captain' ? (
                          teamSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleTeamSort('rosterCount')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Roster Size</span>
                        {teamSortField === 'rosterCount' ? (
                          teamSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Members Roster</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleTeamSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Created Date</span>
                        {teamSortField === 'createdAt' ? (
                          teamSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedTeams.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                        {teamSearch ? 'No teams matching your search criteria.' : 'No teams registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    processedTeams.rows.map((t) => (
                      <tr key={t.teamId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                          #{t.slotNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {t.name} {t.tag && <span className="text-cyan-400 font-mono">[{t.tag}]</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {t.inviteCode ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1">
                              <span className="font-mono text-cyan-400 font-bold tracking-wider text-[11px]">
                                {t.inviteCode}
                              </span>
                              <button
                                onClick={() => handleCopyInviteCode(t.inviteCode!)}
                                className="p-0.5 text-slate-400 hover:text-cyan-300 transition-colors"
                                title="Copy team invite code"
                              >
                                {copiedInviteCode === t.inviteCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {copiedInviteCode === t.inviteCode && (
                                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                                  Copied!
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {t.captain.username}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                            {t.rosterCount} Players
                          </span>
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

            {/* Teams Pagination */}
            {processedTeams.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={teamPageSize}
                    onChange={(e) => {
                      setTeamPageSize(Number(e.target.value));
                      setTeamPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                  <span>
                    Showing {Math.min((teamPage - 1) * teamPageSize + 1, processedTeams.total)} -{' '}
                    {Math.min(teamPage * teamPageSize, processedTeams.total)} of {processedTeams.total}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                    disabled={teamPage === 1}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-mono">
                    Page {teamPage} of {Math.ceil(processedTeams.total / teamPageSize) || 1}
                  </span>
                  <button
                    onClick={() => setTeamPage((p) => Math.min(Math.ceil(processedTeams.total / teamPageSize), p + 1))}
                    disabled={teamPage >= Math.ceil(processedTeams.total / teamPageSize)}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-heading font-bold text-base text-white">
                    Live Standings Leaderboard (Recalculated)
                  </h3>
                </div>

                <button
                  onClick={() => handleExport('scores')}
                  disabled={exportingType !== null}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  {exportingType === 'scores' ? (
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export Scoreboard CSV</span>
                </button>
              </div>

              {/* Search Filter for Leaderboard */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter leaderboard by player or team name..."
                  value={scoreSearch}
                  onChange={(e) => {
                    setScoreSearch(e.target.value);
                    setScorePage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 select-none">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => toggleScoreSort('rank')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Rank</span>
                          {scoreSortField === 'rank' ? (
                            scoreSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => toggleScoreSort('competitorName')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Competitor (Player / Team)</span>
                          {scoreSortField === 'competitorName' ? (
                            scoreSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => toggleScoreSort('wins')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Match Wins</span>
                          {scoreSortField === 'wins' ? (
                            scoreSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => toggleScoreSort('totalScore')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Total Score</span>
                          {scoreSortField === 'totalScore' ? (
                            scoreSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => toggleScoreSort('totalKills')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Total Kills</span>
                          {scoreSortField === 'totalKills' ? (
                            scoreSortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {processedScores.rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                          {scoreSearch ? 'No leaderboard records match your search.' : 'Awaiting score submissions to generate leaderboard.'}
                        </td>
                      </tr>
                    ) : (
                      processedScores.rows.map((entry) => (
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

              {/* Leaderboard Pagination */}
              {processedScores.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={scorePageSize}
                      onChange={(e) => {
                        setScorePageSize(Number(e.target.value));
                        setScorePage(1);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                    </select>
                    <span>
                      Showing {Math.min((scorePage - 1) * scorePageSize + 1, processedScores.total)} -{' '}
                      {Math.min(scorePage * scorePageSize, processedScores.total)} of {processedScores.total}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setScorePage((p) => Math.max(1, p - 1))}
                      disabled={scorePage === 1}
                      className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 font-mono">
                      Page {scorePage} of {Math.ceil(processedScores.total / scorePageSize) || 1}
                    </span>
                    <button
                      onClick={() => setScorePage((p) => Math.min(Math.ceil(processedScores.total / scorePageSize), p + 1))}
                      disabled={scorePage >= Math.ceil(processedScores.total / scorePageSize)}
                      className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
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
