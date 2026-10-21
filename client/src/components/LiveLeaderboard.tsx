import React, { useState, useMemo } from 'react';
import { LeaderboardStanding } from '../types';
import { Trophy, Medal, Search, Flame, Target, Users, Shield, SlidersHorizontal, ArrowRight, Award } from 'lucide-react';
import TieBreakerSelectorModal from './TieBreakerSelectorModal';

interface LiveLeaderboardProps {
  standings: LeaderboardStanding[];
  structure?: string;
  tournamentId?: string;
  tieBreakerRules?: string[];
  isOrganizerOrAdmin?: boolean;
  onRulesUpdated?: (rules: string[]) => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  standings,
  structure = 'SINGLE_ELIMINATION',
  tournamentId,
  tieBreakerRules = ['TOTAL_POINTS', 'TOTAL_KILLS', 'FINAL_ROUND_PLACEMENT', 'HEAD_TO_HEAD'],
  isOrganizerOrAdmin = false,
  onRulesUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTieBreakerModal, setShowTieBreakerModal] = useState(false);
  const [activeRules, setActiveRules] = useState<string[]>(tieBreakerRules);

  const filteredStandings = useMemo(() => {
    if (!searchTerm.trim()) return standings;
    const q = searchTerm.toLowerCase();
    return standings.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tag && s.tag.toLowerCase().includes(q))
    );
  }, [standings, searchTerm]);

  const isPointsFormat = structure === 'LEADERBOARD_POINTS';

  const formatRuleName = (rule: string) => {
    switch (rule) {
      case 'TOTAL_POINTS': return 'Points';
      case 'TOTAL_KILLS': return 'Kills / Frags';
      case 'FINAL_ROUND_PLACEMENT': return 'Final Round';
      case 'HEAD_TO_HEAD': return 'Head-to-Head';
      default: return rule;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search & Meta Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor, team tag, or player IGN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 self-end sm:self-auto flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{standings.length} Competitors</span>
          </span>
          {isPointsFormat && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Placement + Kill Points</span>
            </span>
          )}
        </div>
      </div>

      {/* Tie-Breaker Safeguard Hierarchy Banner */}
      {isPointsFormat && (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Tie-Breakers:</span>
            </span>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] flex-wrap">
              {activeRules.map((rule, idx) => (
                <React.Fragment key={rule}>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 mr-1">#{idx + 1}</span>
                    {formatRuleName(rule)}
                  </span>
                  {idx < activeRules.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {isOrganizerOrAdmin && tournamentId && (
            <button
              onClick={() => setShowTieBreakerModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 hover:border-slate-600 transition shrink-0 self-start md:self-auto"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configure Tie-Breakers</span>
            </button>
          )}
        </div>
      )}

      {/* Tie-Breaker Modal */}
      {tournamentId && (
        <TieBreakerSelectorModal
          tournamentId={tournamentId}
          initialRules={activeRules}
          isOpen={showTieBreakerModal}
          onClose={() => setShowTieBreakerModal(false)}
          onRulesUpdated={(newRules) => {
            setActiveRules(newRules);
            if (onRulesUpdated) onRulesUpdated(newRules);
          }}
        />
      )}

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold text-slate-400">
              <tr>
                <th className="py-3.5 pl-6 pr-3 w-16">Rank</th>
                <th className="py-3.5 px-3">Competitor</th>
                <th className="py-3.5 px-3 text-center">Matches</th>
                {isPointsFormat && (
                  <th className="py-3.5 px-3 text-center">Rank Pts</th>
                )}
                <th className="py-3.5 px-3 text-center">Kills</th>
                <th className="py-3.5 px-3 text-center">Wins</th>
                <th className="py-3.5 pr-6 pl-3 text-right">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStandings.length === 0 ? (
                <tr>
                  <td
                    colSpan={isPointsFormat ? 7 : 6}
                    className="py-12 text-center text-slate-400"
                  >
                    No matching competitors found on leaderboard.
                  </td>
                </tr>
              ) : (
                filteredStandings.map((row) => {
                  const isGold = row.rank === 1;
                  const isSilver = row.rank === 2;
                  const isBronze = row.rank === 3;

                  return (
                    <tr
                      key={row.participantId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isGold
                          ? 'bg-amber-500/[0.04]'
                          : isSilver
                          ? 'bg-slate-300/[0.02]'
                          : isBronze
                          ? 'bg-amber-700/[0.02]'
                          : ''
                      }`}
                    >
                      {/* Rank Column with Badges */}
                      <td className="py-3.5 pl-6 pr-3 font-mono font-bold">
                        <div className="flex items-center">
                          {isGold ? (
                            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 flex items-center justify-center text-xs font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                              1
                            </span>
                          ) : isSilver ? (
                            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(203,213,225,0.3)]">
                              2
                            </span>
                          ) : isBronze ? (
                            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center text-xs font-black shadow-[0_0_8px_rgba(180,83,9,0.3)]">
                              3
                            </span>
                          ) : (
                            <span className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 flex items-center justify-center text-xs font-semibold">
                              {row.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Competitor / Team Profile */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isGold
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {row.tag ? row.tag.substring(0, 3) : row.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm truncate max-w-[180px] sm:max-w-[260px]">
                                {row.name}
                              </span>
                              {row.tag && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/20">
                                  [{row.tag}]
                                </span>
                              )}
                              {isGold && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                {row.isTeam ? 'Team Roster' : 'Solo Player'}
                                {row.bestPlacement && (
                                  <span>• Best: #{row.bestPlacement}</span>
                                )}
                              </span>
                              {row.tieBreakerBadge && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold shadow-sm">
                                  <Shield className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>{row.tieBreakerBadge}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                        {row.matchesPlayed}
                      </td>

                      {/* Rank Points (Points format only) */}
                      {isPointsFormat && (
                        <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-300">
                          {row.rankPoints}
                        </td>
                      )}

                      {/* Kills Counter */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-rose-400">
                        <div className="inline-flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 opacity-70" />
                          <span>{row.totalKills}</span>
                        </div>
                      </td>

                      {/* Wins Counter */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                        {row.wins}
                      </td>

                      {/* Total Points */}
                      <td className="py-3.5 pr-6 pl-3 text-right">
                        <span
                          className={`font-mono font-black text-base px-3 py-1 rounded-lg ${
                            isGold
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800/80 text-white border border-slate-700/60'
                          }`}
                        >
                          {row.totalPoints}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
