import React from 'react';
import { BracketData, BracketMatch, BracketRound } from '../types';
import { Trophy, CheckCircle, Clock, Zap, Swords, User, Users } from 'lucide-react';

interface BracketVisualizerProps {
  bracket: BracketData | null;
  onSelectMatch?: (match: BracketMatch) => void;
  selectedMatchId?: string;
  isInteractive?: boolean;
}

export const BracketVisualizer: React.FC<BracketVisualizerProps> = ({
  bracket,
  onSelectMatch,
  selectedMatchId,
  isInteractive = false
}) => {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
        <Swords className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="font-heading font-bold text-lg text-white">Bracket Not Generated Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The tournament organizer will generate and seed the bracket fixtures once registration reaches minimum capacity or closes.
        </p>
      </div>
    );
  }

  const isSolo = bracket.format === 'SOLO';

  return (
    <div className="space-y-6">
      {/* Structure Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
            {bracket.structure?.replace('_', ' ')}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {bracket.rounds.length} Rounds • {isSolo ? '1v1 Competitors' : 'Team Rosters'}
          </span>
        </div>
      </div>

      {/* Horizontally scrollable Bracket Tree Canvas */}
      <div className="overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="flex items-stretch space-x-8 min-w-max px-2">
          {bracket.rounds.map((round: BracketRound, rIndex: number) => {
            const isFinalRound = rIndex === bracket.rounds.length - 1;

            return (
              <div key={round.id} className="w-72 flex flex-col shrink-0">
                {/* Round Header */}
                <div className="mb-4 text-center pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-center space-x-1.5">
                    {isFinalRound && <Trophy className="w-4 h-4 text-amber-400" />}
                    <h4
                      className={`font-heading font-extrabold text-sm uppercase tracking-wider ${
                        isFinalRound ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {round.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {round.matches.length} {round.matches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>

                {/* Match Nodes in this Round */}
                <div className="flex flex-col justify-around flex-1 space-y-6 py-2">
                  {round.matches.map((match: BracketMatch) => {
                    const isCompleted = match.status === 'COMPLETED';
                    const isInProgress = match.status === 'IN_PROGRESS';
                    const isSelected = selectedMatchId === match.id;

                    const comp1 = match.competitors[0];
                    const comp2 = match.competitors[1];

                    const isComp1Winner = comp1 && (comp1.isWinner || match.winnerParticipantId === comp1.participantId);
                    const isComp2Winner = comp2 && (comp2.isWinner || match.winnerParticipantId === comp2.participantId);

                    return (
                      <div
                        key={match.id}
                        onClick={() => {
                          if (isInteractive && onSelectMatch) {
                            onSelectMatch(match);
                          }
                        }}
                        className={`relative rounded-2xl border transition-all duration-300 p-3.5 space-y-2.5 ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-400 shadow-glow-cyan ring-1 ring-cyan-400'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        } ${isInteractive ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
                      >
                        {/* Match Status Bar */}
                        <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-slate-800/80">
                          <span className="text-slate-500 font-bold">
                            M{match.matchNumber} • {round.name.slice(0, 3).toUpperCase()}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isInProgress
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {match.status}
                          </span>
                        </div>

                        {/* Competitor 1 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                            isComp1Winner
                              ? 'bg-cyan-950/40 border-cyan-500/40 text-white shadow-glow-cyan'
                              : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isComp1Winner
                                  ? 'bg-cyan-400 text-black'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isSolo ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            </div>
                            <span
                              className={`text-xs font-semibold truncate ${
                                isComp1Winner ? 'text-cyan-300 font-bold' : ''
                              }`}
                              title={comp1?.name || 'TBD'}
                            >
                              {comp1?.name || (
                                <span className="text-slate-500 italic">Waiting for Seed</span>
                              )}
                            </span>
                            {comp1?.tag && (
                              <span className="text-[10px] font-mono text-cyan-400">
                                [{comp1.tag}]
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-xs font-bold shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            {comp1 ? comp1.score : '-'}
                          </div>
                        </div>

                        {/* Competitor 2 */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                            isComp2Winner
                              ? 'bg-cyan-950/40 border-cyan-500/40 text-white shadow-glow-cyan'
                              : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isComp2Winner
                                  ? 'bg-cyan-400 text-black'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isSolo ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            </div>
                            <span
                              className={`text-xs font-semibold truncate ${
                                isComp2Winner ? 'text-cyan-300 font-bold' : ''
                              }`}
                              title={comp2?.name || 'TBD'}
                            >
                              {comp2?.name || (
                                <span className="text-slate-500 italic">Waiting for Seed</span>
                              )}
                            </span>
                            {comp2?.tag && (
                              <span className="text-[10px] font-mono text-cyan-400">
                                [{comp2.tag}]
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-xs font-bold shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            {comp2 ? comp2.score : '-'}
                          </div>
                        </div>

                        {/* Selection Hint in Scoring Console */}
                        {isInteractive && (
                          <div className="text-[10px] font-mono text-cyan-400/80 text-center pt-0.5">
                            {isSelected ? '● Editing This Match' : 'Click to score match'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
