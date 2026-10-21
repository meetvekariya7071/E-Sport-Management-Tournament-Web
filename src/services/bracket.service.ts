import { prisma } from '../config/db';
import {
  TournamentStatuses,
  ParticipantStatuses,
  MatchStatuses,
  TournamentStages
} from '../types';
import {
  broadcastScoreUpdate,
  broadcastBracketAdvance,
  broadcastLeaderboardRefresh,
  broadcastMatchCredentials,
  broadcastBracketRollback
} from './socket.service';
import { NotificationService } from './notification.service';
import { AuditService } from './audit.service';

export interface ScoreInputItem {
  participantId: string;
  score: number;
  kills?: number;
  placement?: number;
  isWinner?: boolean;
}

export class BracketService {
  /**
   * Helper to compute standard Battle Royale / Points scoring.
   * Standard placement points table:
   * 1st: 10, 2nd: 6, 3rd: 5, 4th: 4, 5th: 3, 6th: 2, 7th-8th: 1, 9th+: 0
   */
  static getPlacementPoints(placement?: number | null): number {
    if (!placement || placement < 1) return 0;
    switch (placement) {
      case 1:
        return 10;
      case 2:
        return 6;
      case 3:
        return 5;
      case 4:
        return 4;
      case 5:
        return 3;
      case 6:
        return 2;
      case 7:
      case 8:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Calculates dynamic leaderboard standings across all completed / scored matches
   * with configurable multi-tier tie-breakers:
   * Priority 1: Total Points
   * Priority 2: Total Kills / Frags
   * Priority 3: Best placement in the final round
   * Priority 4: Head-to-head match history (if applicable)
   * Fallback: Best overall placement, wins, name
   */
  static computeStandings(
    participants: any[],
    rounds: any[],
    structure = 'SINGLE_ELIMINATION',
    tieBreakerRules: string[] = ['TOTAL_POINTS', 'TOTAL_KILLS', 'FINAL_ROUND_PLACEMENT', 'HEAD_TO_HEAD']
  ) {
    const map = new Map<
      string,
      {
        participantId: string;
        name: string;
        tag?: string | null;
        isTeam: boolean;
        avatarUrl?: string | null;
        totalPoints: number;
        rankPoints: number;
        killPoints: number;
        totalKills: number;
        matchesPlayed: number;
        wins: number;
        bestPlacement: number;
        finalRoundPlacement: number | null;
        roundPlacements: Record<number, number>;
        tieBreakerBadge?: string | null;
      }
    >();

    // Initialize all participants
    for (const p of participants) {
      const isTeam = Boolean(p.team);
      const name = p.team?.name || p.inGameName || p.user?.username || 'Unknown';
      const tag = p.team?.tag || null;
      const avatarUrl = p.user?.avatarUrl || null;

      map.set(p.id, {
        participantId: p.id,
        name,
        tag,
        isTeam,
        avatarUrl,
        totalPoints: 0,
        rankPoints: 0,
        killPoints: 0,
        totalKills: 0,
        matchesPlayed: 0,
        wins: 0,
        bestPlacement: 999,
        finalRoundPlacement: null,
        roundPlacements: {}
      });
    }

    // Determine the highest roundNumber that has completed or scored matches
    let maxScoredRound = 0;
    for (const r of rounds) {
      const hasScores = r.matches?.some((m: any) => m.results?.length > 0 && (m.status === 'COMPLETED' || m.results.some((res: any) => (res.score || 0) > 0 || (res.kills || 0) > 0)));
      if (hasScores && r.roundNumber > maxScoredRound) {
        maxScoredRound = r.roundNumber;
      }
    }

    // Shared matches map for Head-to-Head evaluation between any pair of participants
    const sharedMatchesMap = new Map<
      string,
      Array<{
        roundNumber: number;
        matchId: string;
        p1Placement: number;
        p2Placement: number;
        p1Score: number;
        p2Score: number;
      }>
    >();

    // Accumulate scores from all rounds & matches
    for (const r of rounds) {
      for (const m of r.matches) {
        const results = m.results || [];
        for (const res of results) {
          const entry = map.get(res.participantId);
          if (entry) {
            entry.matchesPlayed += 1;
            const kills = res.kills || 0;
            const placement = res.placement || null;

            entry.totalKills += kills;
            entry.killPoints += kills;

            let matchRankPoints = 0;
            if (structure === 'LEADERBOARD_POINTS') {
              matchRankPoints = this.getPlacementPoints(placement);
              entry.rankPoints += matchRankPoints;
              entry.totalPoints += matchRankPoints + kills;
            } else {
              entry.rankPoints += res.score || 0;
              entry.totalPoints += (res.score || 0) + kills;
            }

            if (res.isWinner || placement === 1) {
              entry.wins += 1;
            }

            if (placement && placement < entry.bestPlacement) {
              entry.bestPlacement = placement;
            }

            if (placement && r.roundNumber) {
              entry.roundPlacements[r.roundNumber] = placement;
              if (r.roundNumber === maxScoredRound) {
                entry.finalRoundPlacement = placement;
              }
            }
          }
        }

        // Record Head-to-Head matchups within this match
        if (results.length > 1) {
          for (let i = 0; i < results.length; i++) {
            for (let j = i + 1; j < results.length; j++) {
              const r1 = results[i];
              const r2 = results[j];
              const p1 = r1.participantId;
              const p2 = r2.participantId;
              const pairKey = [p1, p2].sort().join('::');
              if (!sharedMatchesMap.has(pairKey)) {
                sharedMatchesMap.set(pairKey, []);
              }
              const isFirst = p1 < p2;
              sharedMatchesMap.get(pairKey)!.push({
                roundNumber: r.roundNumber,
                matchId: m.id,
                p1Placement: isFirst ? (r1.placement || 999) : (r2.placement || 999),
                p2Placement: isFirst ? (r2.placement || 999) : (r1.placement || 999),
                p1Score: isFirst ? (r1.score || 0) : (r2.score || 0),
                p2Score: isFirst ? (r2.score || 0) : (r1.score || 0)
              });
            }
          }
        }
      }
    }

    // Tie-breaker comparator applying configured priority order
    const compareStandings = (a: any, b: any) => {
      for (const rule of tieBreakerRules) {
        if (rule === 'TOTAL_POINTS') {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
        } else if (rule === 'TOTAL_KILLS') {
          if (b.totalKills !== a.totalKills) {
            const diff = b.totalKills - a.totalKills;
            if (b.totalPoints === a.totalPoints) {
              if (diff > 0) b.tieBreakerBadge = 'Tied on pts · Leading on Kills';
              else a.tieBreakerBadge = 'Tied on pts · Leading on Kills';
            }
            return diff;
          }
        } else if (rule === 'FINAL_ROUND_PLACEMENT') {
          const aFinal = a.finalRoundPlacement ?? 999;
          const bFinal = b.finalRoundPlacement ?? 999;
          if (aFinal !== bFinal) {
            const diff = aFinal - bFinal;
            if (b.totalPoints === a.totalPoints) {
              if (diff < 0) a.tieBreakerBadge = `Tied on pts · Final Round (#${aFinal})`;
              else b.tieBreakerBadge = `Tied on pts · Final Round (#${bFinal})`;
            }
            return diff;
          }
        } else if (rule === 'HEAD_TO_HEAD') {
          const pairKey = [a.participantId, b.participantId].sort().join('::');
          const sharedMatches = sharedMatchesMap.get(pairKey);
          if (sharedMatches && sharedMatches.length > 0) {
            const isFirst = a.participantId < b.participantId;
            let aWins = 0;
            let bWins = 0;
            for (const sm of sharedMatches) {
              const aPlc = isFirst ? sm.p1Placement : sm.p2Placement;
              const bPlc = isFirst ? sm.p2Placement : sm.p1Placement;
              const aScr = isFirst ? sm.p1Score : sm.p2Score;
              const bScr = isFirst ? sm.p2Score : sm.p1Score;

              if (aPlc < bPlc || aScr > bScr) aWins++;
              else if (bPlc < aPlc || bScr > aScr) bWins++;
            }
            if (aWins !== bWins) {
              const diff = bWins - aWins;
              if (b.totalPoints === a.totalPoints) {
                if (aWins > bWins) a.tieBreakerBadge = `Tied on pts · Won H2H (${aWins}-${bWins})`;
                else b.tieBreakerBadge = `Tied on pts · Won H2H (${bWins}-${aWins})`;
              }
              return diff;
            }
          }
        }
      }

      // Default Fallbacks
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aBest = a.bestPlacement ?? 999;
      const bBest = b.bestPlacement ?? 999;
      if (aBest !== bBest) return aBest - bBest;
      return a.name.localeCompare(b.name);
    };

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        bestPlacement: item.bestPlacement === 999 ? null : item.bestPlacement
      }))
      .sort(compareStandings)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));
  }

  /**
   * Generates bracket fixtures for single elimination or points format.
   * Prevents bracket generation if minimum required participants have not checked in.
   */
  static async generateBracket(tournamentId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: true,
        participants: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            team: { select: { id: true, name: true, tag: true } }
          }
        },
        teams: true
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not have permission to manage this tournament.');
    }

    if (tournament.status === TournamentStatuses.COMPLETED) {
      throw new Error('FORBIDDEN: Tournament is already completed and locked.');
    }

    // Filter checked-in participants
    const checkedInParticipants = tournament.participants.filter(
      (p) => p.status === ParticipantStatuses.CHECKED_IN
    );

    // If 0 are checked in, check if there are registered participants and inform user
    const minRequired = tournament.structure === 'SINGLE_ELIMINATION' ? 2 : 2;
    if (checkedInParticipants.length < minRequired) {
      const registeredCount = tournament.participants.filter(
        (p) => p.status === ParticipantStatuses.REGISTERED
      ).length;

      throw new Error(
        `BAD_REQUEST: Cannot generate bracket fixtures. Minimum required participants (${minRequired} checked-in participants) have not checked in. Currently checked in: ${checkedInParticipants.length}. Registered: ${registeredCount}. Please check in participants before generating the bracket.`
      );
    }

    // For DUO/SQUAD, group participants by team
    let eligibleCompetitors: any[] = [];
    if (tournament.format === 'DUO' || tournament.format === 'SQUAD') {
      const teamMap = new Map<string, any>();
      for (const p of checkedInParticipants) {
        if (p.teamId && !teamMap.has(p.teamId)) {
          teamMap.set(p.teamId, p);
        }
      }
      eligibleCompetitors = Array.from(teamMap.values());
    } else {
      eligibleCompetitors = [...checkedInParticipants];
    }

    if (eligibleCompetitors.length < minRequired) {
      throw new Error(
        `BAD_REQUEST: Insufficient unique teams/players checked in. Found ${eligibleCompetitors.length}, minimum required is ${minRequired}.`
      );
    }

    // Randomly seed/shuffle participants
    const seededCompetitors = [...eligibleCompetitors].sort(() => Math.random() - 0.5);

    const genResult = await prisma.$transaction(async (tx) => {
      // Clean up previous rounds/matches if regenerating
      await tx.matchRound.deleteMany({
        where: { tournamentId }
      });

      if (tournament.structure === 'SINGLE_ELIMINATION') {
        const count = seededCompetitors.length;
        // Determine bracket size: 2, 4, 8, 16, 32
        let bracketSize = 2;
        if (count > 8) bracketSize = 16;
        else if (count > 4) bracketSize = 8;
        else if (count > 2) bracketSize = 4;
        else bracketSize = 2;

        const totalRounds = Math.log2(bracketSize);

        // Helper to name stages
        const getRoundMeta = (roundNum: number, total: number) => {
          const roundsFromFinal = total - roundNum;
          if (roundsFromFinal === 0) {
            return { name: 'Grand Finals', stage: TournamentStages.FINALS };
          }
          if (roundsFromFinal === 1) {
            return { name: 'Semifinals', stage: TournamentStages.SEMIFINALS };
          }
          if (roundsFromFinal === 2) {
            return { name: 'Quarterfinals', stage: TournamentStages.QUARTERFINALS };
          }
          return { name: 'Round of 16', stage: TournamentStages.ROUND_OF_16 };
        };

        // Create rounds
        const createdRounds: any[] = [];
        for (let r = 1; r <= totalRounds; r++) {
          const meta = getRoundMeta(r, totalRounds);
          const roundRecord = await tx.matchRound.create({
            data: {
              tournamentId,
              roundNumber: r,
              name: meta.name,
              stage: meta.stage
            }
          });
          createdRounds.push(roundRecord);
        }

        // Build match tree backwards from Finals down to Round 1 so we can set nextMatchId
        // Round totalRounds has 1 match
        // Round totalRounds - 1 has 2 matches, etc.
        const roundMatchesMap = new Map<number, any[]>();

        for (let r = totalRounds; r >= 1; r--) {
          const matchesCountInRound = Math.pow(2, totalRounds - r);
          const roundRecord = createdRounds[r - 1];
          const matchesInRound: any[] = [];

          for (let m = 1; m <= matchesCountInRound; m++) {
            let nextMatchId: string | null = null;
            let nextMatchSlot: number | null = null;

            if (r < totalRounds) {
              const nextRoundMatches = roundMatchesMap.get(r + 1) || [];
              const parentMatchIndex = Math.floor((m - 1) / 2);
              const parentMatch = nextRoundMatches[parentMatchIndex];
              if (parentMatch) {
                nextMatchId = parentMatch.id;
                nextMatchSlot = ((m - 1) % 2) + 1; // 1 or 2
              }
            }

            const isRound1 = r === 1;
            const matchStatus = isRound1 ? MatchStatuses.SCHEDULED : MatchStatuses.PENDING;

            const match = await tx.match.create({
              data: {
                tournamentId,
                roundId: roundRecord.id,
                matchNumber: m,
                status: matchStatus,
                nextMatchId,
                nextMatchSlot,
                scheduledAt: isRound1 ? new Date() : null
              }
            });

            matchesInRound.push(match);
          }

          roundMatchesMap.set(r, matchesInRound);
        }

        // Populate Round 1 matches with seeded competitors
        const round1Matches = roundMatchesMap.get(1) || [];
        let compIdx = 0;

        for (const match of round1Matches) {
          // Participant 1
          if (compIdx < seededCompetitors.length) {
            const comp1 = seededCompetitors[compIdx++];
            await tx.scoreRecord.create({
              data: {
                tournamentId,
                roundNumber: 1,
                matchId: match.id,
                participantId: comp1.id,
                score: 0,
                kills: 0,
                placement: 1,
                isWinner: false
              }
            });
          }

          // Participant 2
          if (compIdx < seededCompetitors.length) {
            const comp2 = seededCompetitors[compIdx++];
            await tx.scoreRecord.create({
              data: {
                tournamentId,
                roundNumber: 1,
                matchId: match.id,
                participantId: comp2.id,
                score: 0,
                kills: 0,
                placement: 2,
                isWinner: false
              }
            });
          } else if (compIdx === seededCompetitors.length && seededCompetitors.length % 2 !== 0) {
            // Bye condition: if odd participant count, auto-advance participant 1
            if (match.nextMatchId) {
              const byeWinner = seededCompetitors[compIdx - 1];
              await tx.scoreRecord.create({
                data: {
                  tournamentId,
                  roundNumber: 2,
                  matchId: match.nextMatchId,
                  participantId: byeWinner.id,
                  score: 0,
                  kills: 0,
                  placement: 1,
                  isWinner: false
                }
              });
              await tx.match.update({
                where: { id: match.id },
                data: { status: MatchStatuses.COMPLETED, completedAt: new Date() }
              });
            }
          }
        }
      } else {
        // LEADERBOARD_POINTS / BATTLE ROYALE format
        // Multi-match fixtures (4 rounds / maps)
        const mapNames = [
          'Match 1 - Opening Map',
          'Match 2 - Desert Clash',
          'Match 3 - Rainforest Siege',
          'Match 4 - Grand Finals Map'
        ];

        for (let r = 1; r <= mapNames.length; r++) {
          const roundRecord = await tx.matchRound.create({
            data: {
              tournamentId,
              roundNumber: r,
              name: mapNames[r - 1],
              stage: 'MATCH'
            }
          });

          const match = await tx.match.create({
            data: {
              tournamentId,
              roundId: roundRecord.id,
              matchNumber: 1,
              status: r === 1 ? MatchStatuses.SCHEDULED : MatchStatuses.PENDING,
              scheduledAt: new Date()
            }
          });

          // Seed all competitors into Match 1
          if (r === 1) {
            for (let i = 0; i < seededCompetitors.length; i++) {
              await tx.scoreRecord.create({
                data: {
                  tournamentId,
                  roundNumber: 1,
                  matchId: match.id,
                  participantId: seededCompetitors[i].id,
                  score: 0,
                  kills: 0,
                  placement: i + 1,
                  isWinner: false
                }
              });
            }
          }
        }
      }

      // Update tournament status to IN_PROGRESS
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatuses.IN_PROGRESS }
      });

      return {
        success: true,
        message: 'Tournament bracket fixtures generated and participants seeded successfully.'
      };
    });

    // Notify registered participants
    const participantUserIds = tournament.participants
      .map((p) => p.userId)
      .filter((uid): uid is string => Boolean(uid));

    if (participantUserIds.length > 0) {
      await NotificationService.notifyMany(participantUserIds, {
        title: 'Brackets Generated',
        message: `Match fixtures have been generated for "${tournament.title}". Check your scheduled matches.`,
        type: 'MATCH_START',
        link: `/tournaments/${tournamentId}`
      });
    }

    // Audit log
    await AuditService.log({
      actorId: organizerId,
      action: 'BRACKET_GENERATE',
      targetEntity: 'TOURNAMENT',
      targetId: tournamentId,
      details: { format: tournament.format, structure: tournament.structure }
    });

    return genResult;
  }

  /**
   * Retrieves structured tournament bracket tree for frontend visualizer rendering.
   */
  static async getTournamentBracket(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: { select: { id: true, title: true, platform: true } },
        organizer: { select: { id: true, username: true } },
        participants: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            team: { select: { id: true, name: true, tag: true } }
          }
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            matches: {
              orderBy: { matchNumber: 'asc' },
              include: {
                referee: { select: { id: true, username: true } },
                results: {
                  include: {
                    participant: {
                      include: {
                        user: { select: { id: true, username: true, avatarUrl: true } },
                        team: {
                          select: {
                            id: true,
                            name: true,
                            tag: true,
                            members: {
                              include: { user: { select: { id: true, username: true } } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    // Structure bracket response
    const structuredRounds = tournament.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      name: r.name,
      stage: r.stage,
      matches: r.matches.map((m) => {
        const competitors = m.results.map((res) => {
          const isTeam = Boolean(res.participant.team);
          const name = res.participant.team?.name || res.participant.user.username;
          const tag = res.participant.team?.tag || null;
          const avatarUrl = res.participant.user.avatarUrl || null;

          return {
            resultId: res.id,
            participantId: res.participantId,
            name,
            tag,
            isTeam,
            avatarUrl,
            score: res.score,
            kills: res.kills || 0,
            placement: res.placement,
            isWinner: res.isWinner,
            teamRoster: res.participant.team?.members.map((tm) => tm.user.username) || []
          };
        });

        return {
          id: m.id,
          matchNumber: m.matchNumber,
          roundId: m.roundId,
          status: m.status,
          nextMatchId: m.nextMatchId,
          nextMatchSlot: m.nextMatchSlot,
          hasCredentials: Boolean(m.customRoomId),
          roomInstructions: m.roomInstructions,
          scheduledAt: m.scheduledAt,
          completedAt: m.completedAt,
          referee: m.referee,
          competitors
        };
      })
    }));

    let parsedRules: any = {};
    try {
      parsedRules = tournament.rules ? JSON.parse(tournament.rules) : {};
    } catch {
      parsedRules = {};
    }

    const tieBreakerRules = parsedRules.tieBreakerRules || [
      'TOTAL_POINTS',
      'TOTAL_KILLS',
      'FINAL_ROUND_PLACEMENT',
      'HEAD_TO_HEAD'
    ];

    const standings = this.computeStandings(
      tournament.participants,
      tournament.rounds,
      tournament.structure,
      tieBreakerRules
    );

    return {
      tournament: {
        id: tournament.id,
        title: tournament.title,
        slug: tournament.slug,
        format: tournament.format,
        structure: tournament.structure,
        status: tournament.status,
        prizePool: tournament.prizePool,
        startDate: tournament.startDate,
        rules: parsedRules,
        tieBreakerRules,
        game: tournament.game,
        organizer: tournament.organizer
      },
      rounds: structuredRounds,
      standings
    };
  }

  /**
   * Commits match scores, automatically determines round winner,
   * advances winner to next-round fixture, and broadcasts real-time events.
   */
  static async updateMatchScore(data: {
    tournamentId: string;
    matchId: string;
    scores: ScoreInputItem[];
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, matchId, scores, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          include: {
            matches: {
              include: {
                results: {
                  include: {
                    participant: {
                      include: {
                        user: { select: { username: true } },
                        team: { select: { name: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not have permission to score this tournament.');
    }

    if (tournament.status === TournamentStatuses.COMPLETED) {
      throw new Error('FORBIDDEN: Tournament is completed and scores are archived.');
    }

    // Locate target match
    const targetRound = tournament.rounds.find((r) => r.matches.some((m) => m.id === matchId));
    const targetMatch = targetRound?.matches.find((m) => m.id === matchId);

    if (!targetMatch) {
      throw new Error('NOT_FOUND: Match not found within tournament.');
    }

    // Determine winner among scores
    let winnerId: string | null = null;
    let highestScore = -Infinity;

    for (const item of scores) {
      if (item.isWinner) {
        winnerId = item.participantId;
        break;
      }
      if (Number(item.score) > highestScore) {
        highestScore = Number(item.score);
        winnerId = item.participantId;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Commit all score records for current match
      for (const item of scores) {
        const isCurrentWinner = item.participantId === winnerId;
        await tx.scoreRecord.upsert({
          where: {
            matchId_participantId: {
              matchId,
              participantId: item.participantId
            }
          },
          update: {
            score: Number(item.score),
            kills: item.kills ? Number(item.kills) : 0,
            placement: item.placement ? Number(item.placement) : null,
            isWinner: isCurrentWinner,
            tournamentId,
            roundNumber: targetRound?.roundNumber
          },
          create: {
            tournamentId,
            roundNumber: targetRound?.roundNumber,
            matchId,
            participantId: item.participantId,
            score: Number(item.score),
            kills: item.kills ? Number(item.kills) : 0,
            placement: item.placement ? Number(item.placement) : null,
            isWinner: isCurrentWinner
          }
        });
      }

      // 2. Mark match as COMPLETED
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatuses.COMPLETED,
          completedAt: new Date()
        }
      });

      // 3. Single Elimination: Auto-advance winner to next round fixture
      let advancedPayload: any = null;
      if (tournament.structure === 'SINGLE_ELIMINATION' && targetMatch.nextMatchId && winnerId) {
        // Find next match
        const nextMatch = await tx.match.findUnique({
          where: { id: targetMatch.nextMatchId },
          include: { results: true }
        });

        if (nextMatch) {
          // Upsert winner in next match fixture
          await tx.scoreRecord.upsert({
            where: {
              matchId_participantId: {
                matchId: nextMatch.id,
                participantId: winnerId
              }
            },
            update: {
              score: 0,
              kills: 0,
              isWinner: false,
              tournamentId,
              roundNumber: (targetRound?.roundNumber || 1) + 1
            },
            create: {
              tournamentId,
              roundNumber: (targetRound?.roundNumber || 1) + 1,
              matchId: nextMatch.id,
              participantId: winnerId,
              score: 0,
              kills: 0,
              isWinner: false
            }
          });

          // Check if next match now has 2 competitors
          const nextMatchResultsCount = await tx.scoreRecord.count({
            where: { matchId: nextMatch.id }
          });

          if (nextMatchResultsCount >= 2) {
            await tx.match.update({
              where: { id: nextMatch.id },
              data: {
                status: MatchStatuses.SCHEDULED,
                scheduledAt: new Date()
              }
            });
          }

          const winnerParticipant = tournament.participants.find((p) => p.id === winnerId);
          const winnerName =
            winnerParticipant?.team?.name || winnerParticipant?.user.username || 'Winner';

          advancedPayload = {
            sourceMatchId: matchId,
            winnerParticipantId: winnerId,
            winnerName,
            nextMatchId: nextMatch.id,
            nextMatchSlot: targetMatch.nextMatchSlot || 1,
            targetRoundNumber: (targetRound?.roundNumber || 1) + 1
          };
        }
      }

      // 4. Update tournament status to IN_PROGRESS if needed
      if (tournament.status === TournamentStatuses.REGISTRATION_OPEN) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatuses.IN_PROGRESS }
        });
      }

      return {
        success: true,
        message: 'Match scores saved successfully.',
        winnerId,
        advancedPayload
      };
    });

    // 5. Broadcast real-time events through Socket.io
    broadcastScoreUpdate(tournamentId, {
      matchId,
      roundId: targetRound?.id,
      scores,
      status: MatchStatuses.COMPLETED
    });

    if (result.advancedPayload) {
      broadcastBracketAdvance(tournamentId, result.advancedPayload);
    }

    // Refresh and broadcast dynamic leaderboard standings
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          include: {
            matches: {
              include: { results: true }
            }
          }
        }
      }
    });

    if (updatedTournament) {
      const refreshedStandings = this.computeStandings(
        updatedTournament.participants,
        updatedTournament.rounds,
        updatedTournament.structure
      );

      broadcastLeaderboardRefresh(tournamentId, {
        standings: refreshedStandings,
        roundNumber: targetRound?.roundNumber
      });
    }

    // Notify match participants of score entry
    const matchParticipantUserIds = tournament.participants
      .filter((p) => scores.some((s) => s.participantId === p.id))
      .map((p) => p.userId)
      .filter((uid): uid is string => Boolean(uid) && uid !== userId);

    if (matchParticipantUserIds.length > 0) {
      await NotificationService.notifyMany(matchParticipantUserIds, {
        title: 'Scores Updated',
        message: `Scores have been recorded for your match in "${tournament.title}".`,
        type: 'SCORE_UPDATE',
        link: `/tournaments/${tournamentId}`
      });
    }

    // Audit log
    await AuditService.log({
      actorId: userId,
      action: 'SCORE_UPDATE',
      targetEntity: 'MATCH',
      targetId: matchId,
      details: {
        tournamentId,
        scoresCount: scores.length,
        winnerId: result.winnerId
      }
    });

    return result;
  }

  /**
   * Publishes an entire round's scoring matrix (for Organizer Scoring Console).
   * Atomically commits all rows and broadcasts WebSocket events simultaneously.
   */
  static async publishRound(data: {
    tournamentId: string;
    roundId: string;
    matchScores: Array<{
      matchId: string;
      scores: ScoreInputItem[];
    }>;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, roundId, matchScores, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          include: {
            matches: {
              include: { results: true }
            }
          }
        },
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    if (tournament.status === TournamentStatuses.COMPLETED) {
      throw new Error('FORBIDDEN: Tournament is completed and locked.');
    }

    const round = tournament.rounds.find((r) => r.id === roundId);
    if (!round) {
      throw new Error('NOT_FOUND: Target round not found.');
    }

    // Process each match in transaction
    const advancements: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of matchScores) {
        const { matchId, scores } = item;
        const currentMatch = round.matches.find((m) => m.id === matchId);
        if (!currentMatch) continue;

        let winnerId: string | null = null;
        let highestScore = -Infinity;

        for (const s of scores) {
          if (s.isWinner) {
            winnerId = s.participantId;
            break;
          }
          if (Number(s.score) > highestScore) {
            highestScore = Number(s.score);
            winnerId = s.participantId;
          }
        }

        // Upsert score records
        for (const s of scores) {
          const isWinner = s.participantId === winnerId;
          await tx.scoreRecord.upsert({
            where: {
              matchId_participantId: {
                matchId,
                participantId: s.participantId
              }
            },
            update: {
              score: Number(s.score),
              kills: s.kills ? Number(s.kills) : 0,
              placement: s.placement ? Number(s.placement) : null,
              isWinner,
              tournamentId,
              roundNumber: round.roundNumber
            },
            create: {
              tournamentId,
              roundNumber: round.roundNumber,
              matchId,
              participantId: s.participantId,
              score: Number(s.score),
              kills: s.kills ? Number(s.kills) : 0,
              placement: s.placement ? Number(s.placement) : null,
              isWinner
            }
          });
        }

        // Complete match
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: MatchStatuses.COMPLETED,
            completedAt: new Date()
          }
        });

        // Single elimination advance
        if (tournament.structure === 'SINGLE_ELIMINATION' && currentMatch.nextMatchId && winnerId) {
          const nextMatch = await tx.match.findUnique({
            where: { id: currentMatch.nextMatchId }
          });

          if (nextMatch) {
            await tx.scoreRecord.upsert({
              where: {
                matchId_participantId: {
                  matchId: nextMatch.id,
                  participantId: winnerId
                }
              },
              update: {
                score: 0,
                kills: 0,
                isWinner: false,
                tournamentId,
                roundNumber: round.roundNumber + 1
              },
              create: {
                tournamentId,
                roundNumber: round.roundNumber + 1,
                matchId: nextMatch.id,
                participantId: winnerId,
                score: 0,
                kills: 0,
                isWinner: false
              }
            });

            const nextCount = await tx.scoreRecord.count({
              where: { matchId: nextMatch.id }
            });

            if (nextCount >= 2) {
              await tx.match.update({
                where: { id: nextMatch.id },
                data: { status: MatchStatuses.SCHEDULED, scheduledAt: new Date() }
              });
            }

            const winnerParticipant = tournament.participants.find((p) => p.id === winnerId);
            const winnerName =
              winnerParticipant?.team?.name || winnerParticipant?.user.username || 'Winner';

            advancements.push({
              sourceMatchId: matchId,
              winnerParticipantId: winnerId,
              winnerName,
              nextMatchId: nextMatch.id,
              nextMatchSlot: currentMatch.nextMatchSlot || 1,
              targetRoundNumber: round.roundNumber + 1
            });
          }
        }
      }

      // Update tournament status
      if (tournament.status === TournamentStatuses.REGISTRATION_OPEN) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatuses.IN_PROGRESS }
        });
      }
    });

    // Broadcast WebSocket updates
    for (const item of matchScores) {
      broadcastScoreUpdate(tournamentId, {
        matchId: item.matchId,
        roundId,
        scores: item.scores,
        status: MatchStatuses.COMPLETED
      });
    }

    for (const adv of advancements) {
      broadcastBracketAdvance(tournamentId, adv);
    }

    // Refresh and broadcast leaderboard standings
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          include: {
            matches: {
              include: { results: true }
            }
          }
        }
      }
    });

    if (updatedTournament) {
      const standings = this.computeStandings(
        updatedTournament.participants,
        updatedTournament.rounds,
        updatedTournament.structure
      );

      broadcastLeaderboardRefresh(tournamentId, {
        standings,
        roundNumber: round.roundNumber
      });
    }

    return {
      success: true,
      message: `Round ${round.roundNumber} published and broadcasted successfully in real time.`
    };
  }

  /**
   * Check in a participant.
   */
  static async checkInParticipant(tournamentId: string, participantId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: participantId }
    });
    if (!participant || participant.tournamentId !== tournamentId) {
      throw new Error('NOT_FOUND: Participant not found in this tournament.');
    }

    return await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data: { status: ParticipantStatuses.CHECKED_IN }
    });
  }

  /**
   * Bulk check in all registered participants (convenience for organizers).
   */
  static async bulkCheckIn(tournamentId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    const result = await prisma.tournamentParticipant.updateMany({
      where: {
        tournamentId,
        status: ParticipantStatuses.REGISTERED
      },
      data: {
        status: ParticipantStatuses.CHECKED_IN
      }
    });

    return {
      success: true,
      message: `Checked in ${result.count} registered participant(s).`,
      count: result.count
    };
  }

  /**
   * Updates tournament tie-breaker rules configuration.
   */
  static async updateTieBreakerRules(data: {
    tournamentId: string;
    rules: string[];
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, rules, userId, isAdmin } = data;
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          include: {
            matches: { include: { results: true } }
          }
        }
      }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not have permission to configure this tournament.');
    }

    let parsedRules: any = {};
    try {
      parsedRules = tournament.rules ? JSON.parse(tournament.rules) : {};
    } catch {
      parsedRules = {};
    }

    parsedRules.tieBreakerRules = rules;

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { rules: JSON.stringify(parsedRules) }
    });

    const refreshedStandings = this.computeStandings(
      tournament.participants,
      tournament.rounds,
      tournament.structure,
      rules
    );

    broadcastLeaderboardRefresh(tournamentId, {
      standings: refreshedStandings
    });

    await AuditService.log({
      actorId: userId,
      action: 'TIE_BREAKER_UPDATE',
      targetEntity: 'TOURNAMENT',
      targetId: tournamentId,
      details: { tieBreakerRules: rules }
    });

    return {
      success: true,
      message: 'Tie-breaker priority rules updated successfully.',
      tieBreakerRules: rules,
      standings: refreshedStandings
    };
  }

  /**
   * Awards Walkover / Bye to an advancing participant in an elimination bracket.
   * Sets winner, updates disqualified participant with audit reason, and auto-advances.
   */
  static async awardWalkover(data: {
    tournamentId: string;
    matchId: string;
    winnerParticipantId: string;
    forfeitParticipantId?: string;
    reason: string;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, matchId, winnerParticipantId, forfeitParticipantId, reason, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true } },
            team: { select: { id: true, name: true } }
          }
        },
        rounds: {
          include: {
            matches: {
              include: {
                results: {
                  include: {
                    participant: {
                      include: {
                        user: { select: { id: true, username: true } },
                        team: { select: { id: true, name: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not have permission to manage this tournament.');
    }

    const round = tournament.rounds.find((r) => r.matches.some((m) => m.id === matchId));
    const match = round?.matches.find((m) => m.id === matchId);

    if (!match) throw new Error('NOT_FOUND: Match not found.');

    // Identify opponents in match
    const winnerResult = match.results.find((r) => r.participantId === winnerParticipantId);
    if (!winnerResult) {
      throw new Error('BAD_REQUEST: Designated winner is not a competitor in this match.');
    }

    const actualForfeitId = forfeitParticipantId || match.results.find((r) => r.participantId !== winnerParticipantId)?.participantId;

    let advancedPayload: any = null;

    await prisma.$transaction(async (tx) => {
      // 1. Mark winner score record
      await tx.scoreRecord.update({
        where: { id: winnerResult.id },
        data: {
          score: 1,
          isWinner: true,
          metadata: JSON.stringify({ walkover: true, reason })
        }
      });

      // 2. Mark forfeit opponent
      if (actualForfeitId) {
        const forfeitResult = match.results.find((r) => r.participantId === actualForfeitId);
        if (forfeitResult) {
          await tx.scoreRecord.update({
            where: { id: forfeitResult.id },
            data: {
              score: 0,
              isWinner: false,
              metadata: JSON.stringify({ forfeit: true, reason })
            }
          });
        }

        // Update participant record with disqualification note
        await tx.tournamentParticipant.update({
          where: { id: actualForfeitId },
          data: {
            status: ParticipantStatuses.DISQUALIFIED,
            disqualifyReason: `Walkover Forfeit: ${reason}`,
            disqualifiedBy: userId
          }
        });
      }

      // 3. Mark match as completed
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatuses.COMPLETED,
          completedAt: new Date()
        }
      });

      // 4. Auto-advance winner to next round fixture
      if (tournament.structure === 'SINGLE_ELIMINATION' && match.nextMatchId) {
        const nextMatch = await tx.match.findUnique({
          where: { id: match.nextMatchId },
          include: { results: true }
        });

        if (nextMatch) {
          await tx.scoreRecord.upsert({
            where: {
              matchId_participantId: {
                matchId: nextMatch.id,
                participantId: winnerParticipantId
              }
            },
            update: {
              score: 0,
              kills: 0,
              isWinner: false,
              tournamentId,
              roundNumber: (round?.roundNumber || 1) + 1
            },
            create: {
              tournamentId,
              roundNumber: (round?.roundNumber || 1) + 1,
              matchId: nextMatch.id,
              participantId: winnerParticipantId,
              score: 0,
              kills: 0,
              isWinner: false
            }
          });

          const nextMatchResultsCount = await tx.scoreRecord.count({
            where: { matchId: nextMatch.id }
          });

          if (nextMatchResultsCount >= 2) {
            await tx.match.update({
              where: { id: nextMatch.id },
              data: {
                status: MatchStatuses.SCHEDULED,
                scheduledAt: new Date()
              }
            });
          }

          const winnerParticipant = tournament.participants.find((p) => p.id === winnerParticipantId);
          const winnerName = winnerParticipant?.team?.name || winnerParticipant?.user.username || 'Winner';

          advancedPayload = {
            sourceMatchId: matchId,
            winnerParticipantId,
            winnerName,
            nextMatchId: nextMatch.id,
            nextMatchSlot: match.nextMatchSlot || 1,
            targetRoundNumber: (round?.roundNumber || 1) + 1
          };
        }
      }
    });

    // Broadcast Socket updates
    broadcastScoreUpdate(tournamentId, {
      matchId,
      roundId: round?.id,
      scores: [
        { participantId: winnerParticipantId, score: 1, isWinner: true },
        ...(actualForfeitId ? [{ participantId: actualForfeitId, score: 0, isWinner: false }] : [])
      ],
      status: MatchStatuses.COMPLETED
    });

    if (advancedPayload) {
      broadcastBracketAdvance(tournamentId, advancedPayload);
    }

    // Refresh standings
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          include: {
            matches: { include: { results: true } }
          }
        }
      }
    });

    if (updatedTournament) {
      const standings = this.computeStandings(
        updatedTournament.participants,
        updatedTournament.rounds,
        updatedTournament.structure
      );
      broadcastLeaderboardRefresh(tournamentId, { standings });
    }

    await AuditService.log({
      actorId: userId,
      action: 'WALKOVER_AWARDED',
      targetEntity: 'MATCH',
      targetId: matchId,
      details: { winnerParticipantId, forfeitParticipantId: actualForfeitId, reason }
    });

    return {
      success: true,
      message: 'Walkover successfully awarded. Winner advanced to next bracket match.',
      advancedPayload
    };
  }

  /**
   * Rolls back a completed match safely in a single transaction.
   * Clears downstream advancements, resets scores, and returns match to SCHEDULED status.
   */
  static async rollbackMatch(data: {
    tournamentId: string;
    matchId: string;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, matchId, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          include: {
            matches: {
              include: { results: true }
            }
          }
        }
      }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not have permission to manage this tournament.');
    }

    const round = tournament.rounds.find((r) => r.matches.some((m) => m.id === matchId));
    const targetMatch = round?.matches.find((m) => m.id === matchId);

    if (!targetMatch) throw new Error('NOT_FOUND: Match not found.');
    if (targetMatch.status !== MatchStatuses.COMPLETED) {
      throw new Error('BAD_REQUEST: Only completed matches can be rolled back.');
    }

    const winnerResult = targetMatch.results.find((r) => r.isWinner);
    const winnerParticipantId = winnerResult?.participantId;

    await prisma.$transaction(async (tx) => {
      // 1. Cascade cleanup: recursively remove winner from downstream fixtures
      let currentNextMatchId = targetMatch.nextMatchId;
      let currWinnerId = winnerParticipantId;

      while (currentNextMatchId && currWinnerId) {
        const downstreamMatch = await tx.match.findUnique({
          where: { id: currentNextMatchId },
          include: { results: true }
        });

        if (!downstreamMatch) break;

        // Delete winner's score record in downstream match
        await tx.scoreRecord.deleteMany({
          where: {
            matchId: currentNextMatchId,
            participantId: currWinnerId
          }
        });

        // If downstream match was also completed, roll it back to PENDING as well
        if (downstreamMatch.status === MatchStatuses.COMPLETED) {
          const downstreamWinner = downstreamMatch.results.find((r) => r.isWinner);
          await tx.match.update({
            where: { id: currentNextMatchId },
            data: {
              status: MatchStatuses.PENDING,
              completedAt: null,
              isVerified: false,
              verifiedById: null,
              verifiedAt: null
            }
          });
          // Reset remaining score records
          await tx.scoreRecord.updateMany({
            where: { matchId: currentNextMatchId },
            data: { score: 0, kills: 0, isWinner: false, placement: null }
          });
          // Continue cascading downstream if that match had advanced
          currWinnerId = downstreamWinner?.participantId;
          currentNextMatchId = downstreamMatch.nextMatchId;
        } else {
          // If downstream was scheduled, revert to pending since competitor slot is now empty
          await tx.match.update({
            where: { id: currentNextMatchId },
            data: { status: MatchStatuses.PENDING }
          });
          break;
        }
      }

      // 2. Reset target match scores & status
      await tx.scoreRecord.updateMany({
        where: { matchId },
        data: {
          score: 0,
          kills: 0,
          isWinner: false,
          placement: null
        }
      });

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatuses.SCHEDULED,
          completedAt: null,
          isVerified: false,
          verifiedById: null,
          verifiedAt: null,
          verificationNotes: null
        }
      });
    });

    // Broadcast rollback and refreshed events
    broadcastScoreUpdate(tournamentId, {
      matchId,
      roundId: round?.id,
      scores: targetMatch.results.map((r) => ({
        participantId: r.participantId,
        score: 0,
        kills: 0,
        isWinner: false
      })),
      status: MatchStatuses.SCHEDULED
    });

    broadcastBracketRollback(tournamentId, {
      matchId,
      roundId: round?.id,
      message: 'Match results rolled back for recalculation.'
    });

    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { username: true, avatarUrl: true } },
            team: { select: { name: true, tag: true } }
          }
        },
        rounds: {
          include: {
            matches: { include: { results: true } }
          }
        }
      }
    });

    if (updatedTournament) {
      const standings = this.computeStandings(
        updatedTournament.participants,
        updatedTournament.rounds,
        updatedTournament.structure
      );
      broadcastLeaderboardRefresh(tournamentId, { standings });
    }

    await AuditService.log({
      actorId: userId,
      action: 'MATCH_ROLLBACK',
      targetEntity: 'MATCH',
      targetId: matchId,
      details: { tournamentId, roundNumber: round?.roundNumber }
    });

    return {
      success: true,
      message: 'Match rolled back successfully. Erroneous scores and downstream advances cleared.'
    };
  }

  /**
   * Rolls back an entire round (for points/battle royale or knockout rounds).
   */
  static async rollbackRound(data: {
    tournamentId: string;
    roundId: string;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, roundId, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          include: {
            matches: { include: { results: true } }
          }
        }
      }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (!isAdmin && tournament.organizerId !== userId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    const round = tournament.rounds.find((r) => r.id === roundId);
    if (!round) throw new Error('NOT_FOUND: Target round not found.');

    for (const match of round.matches) {
      if (match.status === MatchStatuses.COMPLETED) {
        await this.rollbackMatch({
          tournamentId,
          matchId: match.id,
          userId,
          isAdmin
        });
      }
    }

    return {
      success: true,
      message: `Round ${round.roundNumber} rolled back. All scores reset for recalculation.`
    };
  }

  /**
   * Roster Substitution / Emergency Dropout Handler.
   * Replaces an inactive player with an active substitute without disbanding the team.
   */
  static async substituteTeamPlayer(data: {
    tournamentId: string;
    teamId: string;
    outgoingUserId: string;
    incomingIdentifier: string;
    inGameName?: string;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { tournamentId, teamId, outgoingUserId, incomingIdentifier, inGameName, userId, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');
    if (tournament.status === TournamentStatuses.COMPLETED) {
      throw new Error('FORBIDDEN: Tournament is completed. Rosters are locked.');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { include: { user: true } }
      }
    });

    if (!team || team.tournamentId !== tournamentId) {
      throw new Error('NOT_FOUND: Team not found in this tournament.');
    }

    // Permission check: Team Captain, Tournament Organizer, or Admin
    const isCaptain = team.captainId === userId;
    const isOrganizer = tournament.organizerId === userId;
    if (!isCaptain && !isOrganizer && !isAdmin) {
      throw new Error('FORBIDDEN: Only team captains or tournament organizers/admins can make roster substitutions.');
    }

    // Verify outgoing user
    const outgoingMember = team.members.find((m) => m.userId === outgoingUserId);
    if (!outgoingMember) {
      throw new Error('BAD_REQUEST: The player to be replaced is not a member of this team.');
    }

    // Lookup incoming user by id, email, or username
    const incomingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: incomingIdentifier },
          { email: incomingIdentifier },
          { username: incomingIdentifier }
        ]
      }
    });

    if (!incomingUser) {
      throw new Error('NOT_FOUND: Incoming player account could not be found.');
    }

    if (incomingUser.id === outgoingUserId) {
      throw new Error('BAD_REQUEST: Outgoing and incoming player cannot be the same user.');
    }

    if (incomingUser.isBanned) {
      throw new Error('FORBIDDEN: The incoming player account is currently suspended.');
    }

    // Check if incoming user is already registered on another team in this tournament
    const existingOtherParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId: incomingUser.id
        }
      }
    });

    if (existingOtherParticipant && existingOtherParticipant.teamId && existingOtherParticipant.teamId !== teamId && existingOtherParticipant.status !== ParticipantStatuses.DISQUALIFIED) {
      throw new Error('BAD_REQUEST: Incoming player is already registered on another team in this tournament.');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Move outgoing player role to SUBSTITUTE
      await tx.teamMember.update({
        where: { id: outgoingMember.id },
        data: { role: 'SUBSTITUTE' }
      });

      // 2. Add or promote incoming player as STARTER
      const existingTeamMember = team.members.find((m) => m.userId === incomingUser.id);
      if (existingTeamMember) {
        await tx.teamMember.update({
          where: { id: existingTeamMember.id },
          data: { role: 'STARTER' }
        });
      } else {
        await tx.teamMember.create({
          data: {
            teamId,
            userId: incomingUser.id,
            role: 'STARTER'
          }
        });
      }

      // 3. Upsert TournamentParticipant for incoming player
      await tx.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: incomingUser.id
          }
        },
        update: {
          teamId,
          inGameName: inGameName || incomingUser.username,
          status: ParticipantStatuses.CHECKED_IN
        },
        create: {
          tournamentId,
          userId: incomingUser.id,
          teamId,
          inGameName: inGameName || incomingUser.username,
          status: ParticipantStatuses.CHECKED_IN
        }
      });
    });

    // Notify users
    await NotificationService.create({
      userId: outgoingUserId,
      title: 'Roster Substitution Notice',
      message: `You were moved to substitute on team "${team.name}" for "${tournament.title}".`,
      type: 'SYSTEM',
      link: `/tournaments/${tournamentId}`
    });

    await NotificationService.create({
      userId: incomingUser.id,
      title: 'Added to Tournament Roster',
      message: `You were slotted into the active roster for team "${team.name}" in "${tournament.title}".`,
      type: 'INVITE',
      link: `/tournaments/${tournamentId}`
    });

    await AuditService.log({
      actorId: userId,
      action: 'ROSTER_SUBSTITUTION',
      targetEntity: 'TEAM',
      targetId: teamId,
      details: {
        outgoingUserId,
        incomingUserId: incomingUser.id,
        incomingUsername: incomingUser.username,
        teamName: team.name
      }
    });

    return {
      success: true,
      message: `Roster substitution successful: ${incomingUser.username} is now an active starter on ${team.name}.`
    };
  }

  /**
   * Sets custom room credentials for a match (Room ID, Password, Instructions).
   */
  static async setMatchCredentials(data: {
    tournamentId: string;
    matchId: string;
    customRoomId: string;
    customRoomPassword?: string;
    roomInstructions?: string;
    userId: string;
    role: string;
  }) {
    const { tournamentId, matchId, customRoomId, customRoomPassword, roomInstructions, userId, role } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true } },
                team: { include: { members: true } }
              }
            }
          }
        }
      }
    });

    if (!match || match.tournamentId !== tournamentId) {
      throw new Error('NOT_FOUND: Match not found.');
    }

    // Permission check: Admin, Organizer of tournament, or assigned Referee
    const isAdmin = role === 'ADMIN';
    const isOrganizer = tournament.organizerId === userId;
    const isReferee = match.refereeId === userId;

    if (!isAdmin && !isOrganizer && !isReferee) {
      throw new Error('FORBIDDEN: Only tournament staff (Admin, Organizer, Referee) can distribute match credentials.');
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        customRoomId,
        customRoomPassword: customRoomPassword || null,
        roomInstructions: roomInstructions || null
      }
    });

    // Broadcast event to tournament channel
    broadcastMatchCredentials(tournamentId, {
      matchId,
      hasCredentials: Boolean(customRoomId)
    });

    // Notify checked-in match participants
    const participantUserIds: string[] = [];
    for (const res of match.results) {
      if (res.participant.userId) participantUserIds.push(res.participant.userId);
      if (res.participant.team?.members) {
        for (const m of res.participant.team.members) {
          participantUserIds.push(m.userId);
        }
      }
    }

    const uniqueUids = Array.from(new Set(participantUserIds)).filter((uid) => uid !== userId);
    if (uniqueUids.length > 0) {
      await NotificationService.notifyMany(uniqueUids, {
        title: 'Lobby Credentials Available',
        message: `Private room credentials for Match #${match.matchNumber} have been published. Enter the lobby now.`,
        type: 'MATCH_START',
        link: `/tournaments/${tournamentId}`
      });
    }

    await AuditService.log({
      actorId: userId,
      action: 'CREDENTIALS_DISTRIBUTED',
      targetEntity: 'MATCH',
      targetId: matchId,
      details: { customRoomId }
    });

    return {
      success: true,
      message: 'Custom match room credentials published to confirmed participants.',
      match: {
        id: updatedMatch.id,
        customRoomId: updatedMatch.customRoomId,
        customRoomPassword: updatedMatch.customRoomPassword,
        roomInstructions: updatedMatch.roomInstructions
      }
    };
  }

  /**
   * Fetches room credentials with security visibility guards:
   * Visible ONLY to checked-in participants of that specific match, or tournament staff.
   * Automatically cleared/masked once the match concludes.
   */
  static async getMatchCredentials(data: {
    tournamentId: string;
    matchId: string;
    userId: string;
    role: string;
  }) {
    const { tournamentId, matchId, userId, role } = data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) throw new Error('NOT_FOUND: Tournament not found.');

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        results: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, username: true } },
                team: {
                  include: {
                    members: { select: { userId: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!match || match.tournamentId !== tournamentId) {
      throw new Error('NOT_FOUND: Match not found.');
    }

    // Staff access (Admins, Organizers, assigned Referees can always inspect credentials)
    const isStaff = role === 'ADMIN' || tournament.organizerId === userId || match.refereeId === userId;
    if (isStaff) {
      return {
        isConcluded: match.status === MatchStatuses.COMPLETED,
        isStaff: true,
        customRoomId: match.customRoomId,
        customRoomPassword: match.customRoomPassword,
        roomInstructions: match.roomInstructions
      };
    }

    // Auto-hide credentials once match concludes for participants/public
    if (match.status === MatchStatuses.COMPLETED) {
      return {
        isConcluded: true,
        message: 'Match has concluded. Room credentials are expired and secured.',
        customRoomId: null,
        customRoomPassword: null,
        roomInstructions: null
      };
    }

    // Player access: Verify caller is a participant in this specific match
    let isMatchParticipant = false;
    let isCheckedIn = false;

    for (const res of match.results) {
      const p = res.participant;
      const isSoloUser = p.userId === userId;
      const isTeamMember = p.team?.members.some((m) => m.userId === userId);

      if (isSoloUser || isTeamMember) {
        isMatchParticipant = true;
        if (p.status === ParticipantStatuses.CHECKED_IN) {
          isCheckedIn = true;
        }
        break;
      }
    }

    if (!isMatchParticipant) {
      throw new Error('FORBIDDEN: Lobby credentials are only accessible by participants assigned to this match.');
    }

    if (!isCheckedIn) {
      throw new Error('FORBIDDEN: You must be checked in to access private lobby credentials.');
    }

    return {
      isConcluded: false,
      isStaff: false,
      customRoomId: match.customRoomId,
      customRoomPassword: match.customRoomPassword,
      roomInstructions: match.roomInstructions
    };
  }
}

