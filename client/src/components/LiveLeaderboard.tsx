import React from 'react';
import { LeaderboardRow } from '../types';
import { Trophy, Flame, Swords, Shield, Medal, Users, User } from 'lucide-react';

interface LiveLeaderboardProps {
  rows: LeaderboardRow[];
  format: string;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ rows, format }) => {
  const isSolo = format === 'SOLO';

  if (!rows || rows.length === 0) {
    return (
      <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="font-heading font-bold text-lg text-white">No Scores Recorded Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Standings will automatically calculate and update in real-time as match rounds are played and published.
        </p>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 text-black font-extrabold flex items-center justify-center font-mono text-xs shadow-glow-cyan border border-amber-200">
            🥇 1
          </span>
        );
      case 2:
        return (
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 text-black font-extrabold flex items-center justify-center font-mono text-xs border border-white">
            🥈 2
          </span>
        );
      case 3:
        return (
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-extrabold flex items-center justify-center font-mono text-xs border border-amber-600">
            🥉 3
          </span>
        );
      default:
        return (
          <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-bold flex items-center justify-center font-mono text-xs border border-slate-700">
            {rank}
          </span>
        );
    }
  };

  return (
    <div className="gaming-card rounded-2xl border border-slate-800 overflow-hidden space-y-4">
      {/* Table Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-heading font-extrabold text-base text-white">
            Live Tournament Standings
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>LIVE POINTS AGGREGATE</span>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 text-center w-14">Rank</th>
              <th className="py-3 px-4">{isSolo ? 'Player / IGN' : 'Team Roster'}</th>
              <th className="py-3 px-4 text-center">Matches</th>
              <th className="py-3 px-4 text-center">Wins</th>
              <th className="py-3 px-4 text-center">Kills</th>
              <th className="py-3 px-4 text-right pr-6 font-bold text-white">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row) => {
              const isTop3 = row.rank <= 3;

              return (
                <tr
                  key={row.participantId || row.teamId || row.rank}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isTop3 ? 'bg-slate-900/40' : ''
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">{getRankBadge(row.rank)}</div>
                  </td>

                  {/* Competitor / Team Details */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-heading font-bold text-white text-sm">
                          {row.name}
                        </span>
                        {row.tag && (
                          <span className="text-[10px] font-mono text-cyan-400">
                            [{row.tag}]
                          </span>
                        )}
                        {row.disqualified && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                            DQ
                          </span>
                        )}
                      </div>

                      {/* Roster Members for DUO / SQUAD */}
                      {row.participants && row.participants.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {row.participants.map((pName, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded"
                            >
                              {pName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Matches Played */}
                  <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                    {row.matchesPlayed}
                  </td>

                  {/* Wins */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                    {row.wins}
                  </td>

                  {/* Kills */}
                  <td className="py-3.5 px-4 text-center font-mono text-amber-400 font-semibold">
                    {row.totalKills}
                  </td>

                  {/* Total Score */}
                  <td className="py-3.5 px-4 text-right pr-6 font-mono font-extrabold text-base text-cyan-400">
                    {row.totalScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
