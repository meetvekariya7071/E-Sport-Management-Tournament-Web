import React, { useState } from 'react';
import { BracketRound, BracketMatch, BracketCompetitor } from '../types';
import { Trophy, Swords, CheckCircle2, Clock, Shield, Sparkles, KeyRound, FastForward, RotateCcw } from 'lucide-react';
import MatchRoomCredentialsModal from './MatchRoomCredentialsModal';
import WalkoverModal from './WalkoverModal';
import { tournamentService } from '../services/tournament.service';

interface BracketVisualizerProps {
  rounds: BracketRound[];
  structure?: string;
  tournamentId?: string;
  isOrganizerOrAdmin?: boolean;
  onSelectMatch?: (match: BracketMatch) => void;
  selectedMatchId?: string;
  isInteractive?: boolean;
  onBracketRefreshNeeded?: () => void;
}

export const BracketVisualizer: React.FC<BracketVisualizerProps> = ({
  rounds,
  structure = 'SINGLE_ELIMINATION',
  tournamentId,
  isOrganizerOrAdmin = false,
  onSelectMatch,
  selectedMatchId,
  isInteractive = false,
  onBracketRefreshNeeded
}) => {
  const [credentialsMatch, setCredentialsMatch] = useState<BracketMatch | null>(null);
  const [walkoverMatch, setWalkoverMatch] = useState<BracketMatch | null>(null);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  const handleRollback = async (matchId: string, matchNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tournamentId) return;

    const confirmed = window.confirm(
      `Confirm Bracket Rollback for Match #${matchNumber}?\n\nThis will safely revert the match to Scheduled, reset its scores, and clear downstream bracket advances in an atomic database transaction.`
    );
    if (!confirmed) return;

    setIsRollingBack(matchId);
    try {
      await tournamentService.rollbackMatch(tournamentId, matchId);
      if (onBracketRefreshNeeded) onBracketRefreshNeeded();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to roll back match.');
    } finally {
      setIsRollingBack(null);
    }
  };

  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 text-cyan-400">
          <Swords className="w-8 h-8 opacity-75" />
        </div>
        <h3 className="text-xl font-bold text-slate-200">No Bracket Generated Yet</h3>
        <p className="text-slate-400 text-sm max-w-md mt-2">
          The tournament bracket fixtures will appear here once participants check in and the
          organizer initializes the bracket.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-8 pt-2 scrollbar-thin scrollbar-thumb-slate-700">
      <div
        className="flex gap-8 min-w-max items-stretch px-2"
        style={{ minHeight: '520px' }}
      >
        {rounds.map((round, roundIdx) => {
          const isFinals = roundIdx === rounds.length - 1;

          return (
            <div
              key={round.id || round.roundNumber}
              className="flex flex-col min-w-[280px] max-w-[320px] flex-1"
            >
              {/* Round Header */}
              <div className="mb-6 pb-3 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                    {isFinals ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span className="text-amber-400">Championship</span>
                      </>
                    ) : (
                      <>
                        <Swords className="w-3.5 h-3.5" />
                        <span>Round {round.roundNumber}</span>
                      </>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-white mt-0.5 tracking-tight">
                    {round.name}
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                  {round.matches.length} {round.matches.length === 1 ? 'Match' : 'Matches'}
                </span>
              </div>

              {/* Match Column with dynamic distributed spacing */}
              <div className="flex-1 flex flex-col justify-around gap-6 relative">
                {round.matches.map((match) => {
                  const isSelected = selectedMatchId === match.id;
                  const isCompleted = match.status === 'COMPLETED';
                  const isInProgress = match.status === 'IN_PROGRESS';
                  const comp1 = match.competitors[0];
                  const comp2 = match.competitors[1];

                  return (
                    <div
                      key={match.id}
                      onClick={() => isInteractive && onSelectMatch && onSelectMatch(match)}
                      className={`relative rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? 'border-cyan-400 bg-slate-800/95 ring-2 ring-cyan-400/30 shadow-[0_0_25px_rgba(0,240,255,0.2)]'
                          : isCompleted
                          ? 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700'
                          : isInProgress
                          ? 'border-amber-500/50 bg-slate-900/90 ring-1 ring-amber-500/20'
                          : 'border-slate-800/60 bg-slate-900/40 opacity-80'
                      } ${isInteractive ? 'cursor-pointer hover:scale-[1.01]' : ''} p-3.5 shadow-lg backdrop-blur-sm`}
                    >
                      {/* Match Meta Header */}
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2.5 pb-2 border-b border-slate-800/60">
                        <span className="font-mono text-slate-400">
                          Match #{match.matchNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Concluded
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded text-[10px] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded text-[10px]">
                              <Clock className="w-3 h-3" /> Scheduled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Competitor 1 Slot */}
                      <CompetitorRow
                        competitor={comp1}
                        isWinner={comp1?.isWinner}
                        isCompleted={isCompleted}
                        slotNumber={1}
                      />

                      {/* Divider */}
                      <div className="my-1.5 flex items-center justify-center">
                        <div className="h-px bg-slate-800/80 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-widest">
                          VS
                        </span>
                        <div className="h-px bg-slate-800/80 flex-1"></div>
                      </div>

                      {/* Competitor 2 Slot */}
                      <CompetitorRow
                        competitor={comp2}
                        isWinner={comp2?.isWinner}
                        isCompleted={isCompleted}
                        slotNumber={2}
                      />

                      {/* Operations & Credentials Action Bar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCredentialsMatch(match);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                            match.hasCredentials
                              ? 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60'
                              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          title="View / Edit Custom Room Credentials"
                        >
                          <KeyRound className="w-3 h-3 text-indigo-400" />
                          <span>{match.hasCredentials ? 'Lobby Ready' : 'Lobby Pass'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {isOrganizerOrAdmin && !isCompleted && comp1 && comp2 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWalkoverMatch(match);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-900/60 transition"
                              title="Award Walkover / Bye"
                            >
                              <FastForward className="w-3 h-3 text-amber-400" />
                              <span>Walkover</span>
                            </button>
                          )}

                          {isOrganizerOrAdmin && isCompleted && (
                            <button
                              type="button"
                              disabled={isRollingBack === match.id}
                              onClick={(e) => handleRollback(match.id, match.matchNumber, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 transition disabled:opacity-50"
                              title="Revert match scores & downstream bracket advances"
                            >
                              <RotateCcw className={`w-3 h-3 text-rose-400 ${isRollingBack === match.id ? 'animate-spin' : ''}`} />
                              <span>{isRollingBack === match.id ? 'Undoing...' : 'Undo'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Room Credentials Modal */}
      {tournamentId && credentialsMatch && (
        <MatchRoomCredentialsModal
          tournamentId={tournamentId}
          matchId={credentialsMatch.id}
          matchNumber={credentialsMatch.matchNumber}
          matchStatus={credentialsMatch.status}
          isStaff={isOrganizerOrAdmin}
          isOpen={Boolean(credentialsMatch)}
          onClose={() => setCredentialsMatch(null)}
        />
      )}

      {/* Walkover / Bye Modal */}
      {tournamentId && walkoverMatch && (
        <WalkoverModal
          tournamentId={tournamentId}
          match={walkoverMatch}
          isOpen={Boolean(walkoverMatch)}
          onClose={() => setWalkoverMatch(null)}
          onSuccess={() => {
            if (onBracketRefreshNeeded) onBracketRefreshNeeded();
          }}
        />
      )}
    </div>
  );
};

interface CompetitorRowProps {
  competitor?: BracketCompetitor;
  isWinner?: boolean;
  isCompleted: boolean;
  slotNumber: number;
}

const CompetitorRow: React.FC<CompetitorRowProps> = ({
  competitor,
  isWinner,
  isCompleted,
  slotNumber
}) => {
  if (!competitor) {
    return (
      <div className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-slate-950/40 border border-dashed border-slate-800/80 text-slate-400 text-xs italic">
        <span>TBD (Slot {slotNumber})</span>
        <span className="font-mono text-slate-400">-</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between py-2 px-2.5 rounded-lg transition-all ${
        isWinner
          ? 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : isCompleted
          ? 'bg-slate-950/60 border border-slate-800/60 text-slate-400'
          : 'bg-slate-950/40 border border-slate-800/80 text-slate-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {/* Avatar or Icon */}
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
            isWinner
              ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400/50'
              : 'bg-slate-800 text-slate-300 border border-slate-700/80'
          }`}
        >
          {competitor.tag ? competitor.tag.substring(0, 3) : competitor.name.substring(0, 2).toUpperCase()}
        </div>

        {/* Competitor Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold truncate max-w-[130px] ${
                isWinner ? 'text-emerald-300 font-extrabold' : 'text-slate-200'
              }`}
            >
              {competitor.name}
            </span>
            {isWinner && (
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
            )}
          </div>
          {competitor.kills !== undefined && competitor.kills > 0 && (
            <span className="text-[10px] text-slate-400 block font-mono">
              {competitor.kills} Kills
            </span>
          )}
        </div>
      </div>

      {/* Live Score Counter */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
            isWinner
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800/80 text-slate-300'
          }`}
        >
          {competitor.score ?? 0}
        </span>
      </div>
    </div>
  );
};
