import React, { useEffect, useState } from 'react';
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
  Zap
} from 'lucide-react';

export const OrganizerDatabaseViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dbData, setDbData] = useState<TournamentDatabaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'scores'>('players');

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

  if (loading) {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto shadow-glow-cyan"></div>
        <p className="text-xs text-slate-400 font-mono">Connecting to isolated tournament database...</p>
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
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/organizer"
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Hosted Tournaments
        </Link>
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
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Link
            to={`/organizer/tournaments/${id}/scoring`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-heading font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-glow-cyan"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Real-Time Scoring Console</span>
          </Link>

          {!isCompleted ? (
            <button
              onClick={handleCompleteTournament}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-heading font-bold text-xs shadow-glow-purple flex items-center justify-center space-x-2 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete & Archive Tournament</span>
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
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Scoped Tournament Registrations: {dbData.playersTable.length} Competitors</span>
              {isSolo && (
                <span className="text-emerald-400 font-mono text-[11px]">
                  ✓ SOLO Format: Team creation bypassed (team_id is null)
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Slot #</th>
                    <th className="py-3 px-4">Player (IGN)</th>
                    <th className="py-3 px-4">Email</th>
                    {!isSolo && <th className="py-3 px-4">Team</th>}
                    <th className="py-3 px-4">Check-In Status</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dbData.playersTable.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No players registered yet.
                      </td>
                    </tr>
                  ) : (
                    dbData.playersTable.map((p) => (
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
          </div>
        )}

        {/* TAB 2: TEAMS TABLE (Omitted if SOLO) */}
        {activeTab === 'teams' && !isSolo && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Registered Teams for {dbData.overview.format} format: {dbData.teamsTable.length} Teams
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Slot #</th>
                    <th className="py-3 px-4">Team Name & Tag</th>
                    <th className="py-3 px-4">Team Captain</th>
                    <th className="py-3 px-4">Roster Size</th>
                    <th className="py-3 px-4">Members Roster</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dbData.teamsTable.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No teams registered yet.
                      </td>
                    </tr>
                  ) : (
                    dbData.teamsTable.map((t) => (
                      <tr key={t.teamId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                          #{t.slotNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {t.name} {t.tag && <span className="text-cyan-400 font-mono">[{t.tag}]</span>}
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
          </div>
        )}

        {/* TAB 3: SCORE / LEADERBOARD DATABASE */}
        {activeTab === 'scores' && (
          <div className="space-y-8">
            {/* Real-Time Live Standings / Leaderboard */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Live Standings Leaderboard (Recalculated)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Competitor (Player / Team)</th>
                      <th className="py-3 px-4">Match Wins</th>
                      <th className="py-3 px-4">Total Score</th>
                      <th className="py-3 px-4">Total Kills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dbData.scoreMatrix.leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Awaiting score submissions to generate leaderboard.
                        </td>
                      </tr>
                    ) : (
                      dbData.scoreMatrix.leaderboard.map((entry, idx) => (
                        <tr key={entry.participantId} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                            #{idx + 1}
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
