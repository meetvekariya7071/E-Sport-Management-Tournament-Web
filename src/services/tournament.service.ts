import { prisma } from '../config/db';
import {
  TournamentFormat,
  TournamentFormats,
  TournamentStatus,
  TournamentStatuses,
  ParticipantStatuses,
  MatchStatuses
} from '../types';
import { evaluateTournamentLifecycle } from '../utils/tournamentLifecycle';

export class TournamentService {
  /**
   * Creates a new tournament.
   * Format logic: Validates game capability, max participant bounds, initializes scoped models.
   */
  static async createTournament(data: {
    title: string;
    slug: string;
    description?: string;
    bannerImage?: string;
    prizePool?: string;
    structure?: string;
    gameId: string;
    organizerId: string;
    format: TournamentFormat;
    maxParticipants: number;
    registrationStartDate?: string;
    registrationEndDate?: string;
    startDate: string;
    endDate?: string;
    rules?: any;
  }) {
    const {
      title,
      slug,
      description,
      bannerImage,
      prizePool,
      structure = 'SINGLE_ELIMINATION',
      gameId,
      organizerId,
      format,
      maxParticipants,
      registrationStartDate,
      registrationEndDate,
      startDate,
      endDate,
      rules
    } = data;

    // Validate format
    if (!Object.values(TournamentFormats).includes(format)) {
      throw new Error(`BAD_REQUEST: Invalid format. Must be SOLO, DUO, or SQUAD.`);
    }

    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new Error('NOT_FOUND: Specified game not found in catalog.');
    }

    // Verify game supports requested format
    if (!game.isTeamBased && (format === TournamentFormats.DUO || format === TournamentFormats.SQUAD)) {
      throw new Error('BAD_REQUEST: The selected game is solo-only and does not support DUO or SQUAD formats.');
    }

    // Check slug collision
    const existing = await prisma.tournament.findUnique({ where: { slug } });
    if (existing) {
      throw new Error('CONFLICT: A tournament with this URL slug already exists.');
    }

    const regStartDate = registrationStartDate ? new Date(registrationStartDate) : new Date();
    const regEndDate = registrationEndDate ? new Date(registrationEndDate) : new Date(startDate);
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const initialStatus = evaluateTournamentLifecycle({
      registrationStartDate: regStartDate,
      registrationEndDate: regEndDate,
      startDate: start,
      endDate: end
    });

    return await prisma.tournament.create({
      data: {
        title,
        slug,
        description: description || null,
        bannerImage: bannerImage || null,
        prizePool: prizePool || null,
        structure,
        gameId,
        organizerId,
        format,
        status: initialStatus,
        maxParticipants: Number(maxParticipants),
        registrationStartDate: regStartDate,
        registrationEndDate: regEndDate,
        startDate: start,
        endDate: end,
        rules: rules ? (typeof rules === 'string' ? rules : JSON.stringify(rules)) : '{}'
      },
      include: {
        game: { select: { title: true, slug: true, isTeamBased: true } },
        organizer: { select: { id: true, username: true, email: true } }
      }
    });
  }

  /**
   * Retrieves high-level organizer performance stats:
   * Total tournaments hosted, active tournaments running, total participants enrolled, pending score submissions.
   */
  static async getOrganizerStats(organizerId: string) {
    const [totalHosted, activeTournaments, enrolledParticipants, pendingMatches] = await Promise.all([
      prisma.tournament.count({ where: { organizerId } }),
      prisma.tournament.count({
        where: {
          organizerId,
          status: { in: [TournamentStatuses.REGISTRATION_OPEN, TournamentStatuses.IN_PROGRESS] }
        }
      }),
      prisma.tournamentParticipant.count({
        where: { tournament: { organizerId } }
      }),
      prisma.match.count({
        where: {
          tournament: { organizerId },
          status: { in: [MatchStatuses.PENDING, MatchStatuses.IN_PROGRESS] }
        }
      })
    ]);

    return {
      totalHosted,
      activeTournaments,
      enrolledParticipants,
      pendingMatches
    };
  }

  /**
   * Lists all tournaments owned by a specific organizer.
   */
  static async getOrganizerTournaments(organizerId: string) {
    return await prisma.tournament.findMany({
      where: { organizerId },
      include: {
        game: { select: { id: true, title: true, slug: true, genre: true } },
        _count: {
          select: { participants: true, teams: true, matches: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Updates tournament metadata (validates ownership).
   */
  static async updateTournament(
    tournamentId: string,
    organizerId: string,
    data: {
      title?: string;
      description?: string;
      bannerImage?: string;
      prizePool?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    return await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        title: data.title ?? tournament.title,
        description: data.description ?? tournament.description,
        bannerImage: data.bannerImage ?? tournament.bannerImage,
        prizePool: data.prizePool ?? tournament.prizePool,
        status: data.status ?? tournament.status,
        startDate: data.startDate ? new Date(data.startDate) : tournament.startDate,
        endDate: data.endDate ? new Date(data.endDate) : tournament.endDate
      }
    });
  }

  /**
   * Deletes a tournament (validates ownership or Admin).
   */
  static async deleteTournament(tournamentId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    return await prisma.tournament.delete({
      where: { id: tournamentId }
    });
  }

  /**
   * Dedicated Tournament Database Viewer:
   * Returns:
   * - Database 1: Players Table (registered users, check-in status, IGN/username, disqualification details)
   * - Database 2: Teams Table (only instantiated if DUO/SQUAD, completely omitted if SOLO)
   * - Database 3: Scores / Leaderboard Database (matrix of matches, scores, kills, placement, winners)
   */
  static async getTournamentDatabase(
    tournamentId: string,
    organizerId: string,
    isAdmin = false,
    isReferee = false
  ) {
    // First check tournament basic format and authorization with lightweight select
    const baseInfo = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        organizerId: true,
        format: true
      }
    });

    if (!baseInfo) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (!isAdmin && !isReferee && baseInfo.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    const isSolo = baseInfo.format === TournamentFormats.SOLO;

    // Optimized select projection
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        bannerImage: true,
        prizePool: true,
        structure: true,
        format: true,
        status: true,
        maxParticipants: true,
        currentCount: true,
        startDate: true,
        endDate: true,
        organizerId: true,
        game: {
          select: { id: true, title: true, slug: true, genre: true, platform: true }
        },
        organizer: {
          select: { id: true, username: true, email: true }
        },
        participants: {
          select: {
            id: true,
            teamId: true,
            inGameName: true,
            status: true,
            seed: true,
            disqualifyReason: true,
            registeredAt: true,
            user: {
              select: { id: true, username: true, email: true, isBanned: true }
            },
            team: {
              select: { id: true, name: true, tag: true }
            }
          },
          orderBy: { registeredAt: 'asc' }
        },
        teams: {
          select: {
            id: true,
            name: true,
            tag: true,
            inviteCode: true,
            createdAt: true,
            captain: { select: { id: true, username: true, email: true } },
            members: {
              select: {
                role: true,
                user: { select: { id: true, username: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        rounds: {
          select: {
            id: true,
            roundNumber: true,
            name: true,
            matches: {
              select: {
                id: true,
                matchNumber: true,
                status: true,
                scheduledAt: true,
                completedAt: true,
                referee: { select: { id: true, username: true } },
                results: {
                  select: {
                    id: true,
                    participantId: true,
                    score: true,
                    kills: true,
                    placement: true,
                    isWinner: true,
                    participant: {
                      select: {
                        user: { select: { username: true } },
                        team: { select: { name: true } }
                      }
                    }
                  }
                }
              },
              orderBy: { matchNumber: 'asc' }
            }
          },
          orderBy: { roundNumber: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    // Build database views
    return {
      overview: {
        id: tournament.id,
        title: tournament.title,
        slug: tournament.slug,
        description: tournament.description,
        bannerImage: tournament.bannerImage,
        prizePool: tournament.prizePool,
        structure: tournament.structure,
        format: tournament.format,
        status: tournament.status,
        maxParticipants: tournament.maxParticipants,
        currentCount: tournament.currentCount,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        game: tournament.game,
        organizer: tournament.organizer
      },

      // Database 1: Players Table
      playersTable: tournament.participants.map((p, index) => ({
        slotNumber: index + 1,
        participantId: p.id,
        userId: p.user.id,
        ign: p.user.username,
        email: p.user.email,
        teamId: p.teamId,
        teamName: p.team?.name || null,
        status: p.status, // REGISTERED, CHECKED_IN, DISQUALIFIED
        seed: p.seed || index + 1,
        isBanned: p.user.isBanned,
        registeredAt: p.registeredAt,
        disqualified: p.status === ParticipantStatuses.DISQUALIFIED,
        disqualifyReason: p.disqualifyReason
      })),

      // Database 2: Teams Table (Only for DUO or SQUAD; strictly empty for SOLO)
      teamsTable: isSolo
        ? []
        : tournament.teams.map((t, index) => ({
            slotNumber: index + 1,
            teamId: t.id,
            name: t.name,
            tag: t.tag,
            inviteCode: t.inviteCode || null,
            captain: t.captain,
            rosterCount: t.members.length,
            members: t.members.map((m) => ({
              userId: m.user.id,
              username: m.user.username,
              role: m.role
            })),
            createdAt: t.createdAt
          })),

      // Database 3: Scores / Leaderboard Database
      scoreMatrix: {
        rounds: tournament.rounds.map((r) => ({
          roundId: r.id,
          roundNumber: r.roundNumber,
          name: r.name,
          matches: r.matches.map((m) => ({
            matchId: m.id,
            matchNumber: m.matchNumber,
            status: m.status,
            referee: m.referee,
            scheduledAt: m.scheduledAt,
            completedAt: m.completedAt,
            results: m.results.map((res) => ({
              resultId: res.id,
              participantId: res.participantId,
              competitorName: res.participant.team?.name || res.participant.user.username,
              score: res.score,
              kills: res.kills || 0,
              placement: res.placement,
              isWinner: res.isWinner
            }))
          }))
        })),

        // Standings / Leaderboard calculated from results
        leaderboard: this.computeLeaderboard(tournament.participants, tournament.rounds)
      }
    };
  }

  /**
   * Helper to compute real-time tournament standings from match results.
   */
  private static computeLeaderboard(participants: any[], rounds: any[]) {
    const scoresMap = new Map<string, { competitorName: string; wins: number; totalScore: number; totalKills: number }>();

    for (const p of participants) {
      const name = p.team?.name || p.user.username;
      scoresMap.set(p.id, { competitorName: name, wins: 0, totalScore: 0, totalKills: 0 });
    }

    for (const r of rounds) {
      for (const m of r.matches) {
        for (const res of m.results) {
          const entry = scoresMap.get(res.participantId);
          if (entry) {
            entry.totalScore += res.score || 0;
            entry.totalKills += res.kills || 0;
            if (res.isWinner) entry.wins += 1;
          }
        }
      }
    }

    return Array.from(scoresMap.entries())
      .map(([participantId, stats]) => ({
        participantId,
        ...stats
      }))
      .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore || b.totalKills - a.totalKills);
  }

  /**
   * Commits or updates scores for a specific match (Organizer or Admin).
   */
  static async submitMatchScores(data: {
    tournamentId: string;
    organizerId: string;
    matchId: string;
    scores: Array<{
      participantId: string;
      score: number;
      kills?: number;
      placement?: number;
      isWinner?: boolean;
    }>;
    isAdmin?: boolean;
  }) {
    const { tournamentId, organizerId, matchId, scores, isAdmin } = data;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    if (tournament.status === TournamentStatuses.COMPLETED) {
      throw new Error('FORBIDDEN: This tournament is completed and its database is archived/locked.');
    }

    return await prisma.$transaction(async (tx) => {
      for (const item of scores) {
        await tx.matchResult.upsert({
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
            isWinner: Boolean(item.isWinner)
          },
          create: {
            matchId,
            participantId: item.participantId,
            score: Number(item.score),
            kills: item.kills ? Number(item.kills) : 0,
            placement: item.placement ? Number(item.placement) : null,
            isWinner: Boolean(item.isWinner)
          }
        });
      }

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatuses.COMPLETED,
          completedAt: new Date()
        }
      });

      // Update tournament status to IN_PROGRESS if currently REGISTRATION_OPEN
      if (tournament.status === TournamentStatuses.REGISTRATION_OPEN) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatuses.IN_PROGRESS }
        });
      }

      return { success: true, message: 'Scores submitted and leaderboard updated.' };
    });
  }

  /**
   * Completes the tournament and archives the score database.
   */
  static async completeTournament(tournamentId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    return await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatuses.COMPLETED,
        endDate: new Date()
      }
    });
  }

  /**
   * Disqualifies a participant from this tournament.
   */
  static async disqualifyParticipant(data: {
    tournamentId: string;
    participantId: string;
    actorId: string;
    reason?: string;
  }) {
    const { tournamentId, participantId, actorId, reason } = data;

    const participant = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId }
    });

    if (!participant) {
      throw new Error('NOT_FOUND: Participant not found in this tournament.');
    }

    return await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data: {
        status: ParticipantStatuses.DISQUALIFIED,
        disqualifiedBy: actorId,
        disqualifyReason: reason || 'Disqualified by tournament official'
      }
    });
  }

  /**
   * Player Registration:
   *  - SOLO: Team generation is bypassed!
   *  - DUO / SQUAD: Team generation required.
   */
  static async joinTournament(data: {
    tournamentId: string;
    userId: string;
    teamName?: string;
    teamTag?: string;
    partnerUserIds?: string[];
  }) {
    const { tournamentId, userId, teamName, teamTag, partnerUserIds = [] } = data;

    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('NOT_FOUND: Tournament not found.');
      }

      if (tournament.status !== TournamentStatuses.REGISTRATION_OPEN) {
        throw new Error('FORBIDDEN: Tournament registration is currently closed.');
      }

      if (tournament.currentCount >= tournament.maxParticipants) {
        throw new Error('CAPACITY_EXCEEDED: Tournament has reached maximum participant capacity.');
      }

      const existingUserRegistration = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId
          }
        }
      });

      if (existingUserRegistration) {
        throw new Error('CONFLICT: You have already registered for this tournament.');
      }

      if (tournament.format === TournamentFormats.SOLO) {
        const participant = await tx.tournamentParticipant.create({
          data: {
            tournamentId,
            userId,
            teamId: null,
            status: ParticipantStatuses.REGISTERED
          },
          include: {
            user: { select: { id: true, username: true, email: true } }
          }
        });

        await tx.tournament.update({
          where: { id: tournamentId },
          data: { currentCount: { increment: 1 } }
        });

        return {
          type: TournamentFormats.SOLO,
          message: 'Successfully registered as solo competitor.',
          participant
        };
      }

      if (!teamName || teamName.trim().length === 0) {
        throw new Error('BAD_REQUEST: Team name is required for DUO/SQUAD tournaments.');
      }

      const requiredTeammates = tournament.format === TournamentFormats.DUO ? 1 : 3;
      if (partnerUserIds.length !== requiredTeammates) {
        throw new Error(
          `BAD_REQUEST: Format ${tournament.format} requires exactly ${requiredTeammates} partner(s).`
        );
      }

      const fullRosterUserIds = [userId, ...partnerUserIds];

      if (new Set(fullRosterUserIds).size !== fullRosterUserIds.length) {
        throw new Error('BAD_REQUEST: Duplicate teammate IDs detected in roster.');
      }

      const rosterUsers = await tx.user.findMany({
        where: {
          id: { in: fullRosterUserIds },
          isBanned: false
        }
      });

      if (rosterUsers.length !== fullRosterUserIds.length) {
        throw new Error('BAD_REQUEST: One or more selected teammates are either non-existent or currently banned.');
      }

      const conflictingRegistrations = await tx.tournamentParticipant.findMany({
        where: {
          tournamentId,
          userId: { in: fullRosterUserIds }
        },
        include: { user: { select: { username: true } } }
      });

      if (conflictingRegistrations.length > 0) {
        const conflictNames = conflictingRegistrations.map((c) => c.user.username).join(', ');
        throw new Error(`CONFLICT: Teammate(s) [${conflictNames}] are already registered in this tournament.`);
      }

      const existingTeamName = await tx.team.findUnique({
        where: {
          tournamentId_name: {
            tournamentId,
            name: teamName.trim()
          }
        }
      });

      if (existingTeamName) {
        throw new Error('CONFLICT: A team with this name is already registered in this tournament.');
      }

      const team = await tx.team.create({
        data: {
          tournamentId,
          name: teamName.trim(),
          tag: teamTag ? teamTag.trim().toUpperCase() : null,
          captainId: userId
        }
      });

      await tx.teamMember.createMany({
        data: fullRosterUserIds.map((memberId) => ({
          teamId: team.id,
          userId: memberId,
          role: memberId === userId ? 'CAPTAIN' : 'STARTER'
        }))
      });

      await tx.tournamentParticipant.createMany({
        data: fullRosterUserIds.map((memberId) => ({
          tournamentId,
          userId: memberId,
          teamId: team.id,
          status: ParticipantStatuses.REGISTERED
        }))
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { currentCount: { increment: 1 } }
      });

      return {
        type: tournament.format,
        message: `Team '${team.name}' registered successfully.`,
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          captainId: team.captainId,
          roster: rosterUsers.map((u) => ({ id: u.id, username: u.username, email: u.email }))
        }
      };
    });
  }

  /**
   * Scoped Tournament Details
   */
  static async getTournamentDetails(tournamentId: string) {
    const base = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { format: true }
    });

    if (!base) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    const isSolo = base.format === TournamentFormats.SOLO;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: { select: { id: true, title: true, slug: true, genre: true, isTeamBased: true } },
        organizer: { select: { id: true, username: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            team: { select: { id: true, name: true, tag: true } }
          },
          orderBy: { registeredAt: 'asc' }
        },
        ...(isSolo
          ? {}
          : {
              teams: {
                include: {
                  captain: { select: { id: true, username: true } },
                  members: {
                    include: {
                      user: { select: { id: true, username: true } }
                    }
                  }
                }
              }
            }),
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
                        user: { select: { username: true } },
                        team: { select: { name: true } }
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
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    return {
      ...tournament,
      lifecycleStatus: evaluateTournamentLifecycle(tournament),
      teams: (tournament as any).teams || []
    };
  }

  /**
   * Retrieves public tournaments with optional filters (gameId, format, status, search)
   */
  static async getPublicTournaments(query: {
    gameId?: string;
    format?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};
    if (query.gameId) {
      where.gameId = query.gameId;
    }
    if (query.format) {
      where.format = query.format;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } }
      ];
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        game: { select: { id: true, title: true, slug: true, coverImage: true, genre: true, platform: true } },
        organizer: { select: { id: true, username: true, email: true } },
        _count: { select: { participants: true, teams: true } }
      },
      orderBy: { startDate: 'asc' }
    });

    return tournaments.map((t) => ({
      ...t,
      lifecycleStatus: evaluateTournamentLifecycle(t)
    }));
  }

  /**
   * Registers an individual player directly for a SOLO tournament.
   * Strictly bypasses Team generation and guarantees relational isolation.
   */
  static async registerSolo(tournamentId: string, userId: string, inGameName?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('NOT_FOUND: User does not exist.');
    }
    if (user.isBanned) {
      throw new Error('FORBIDDEN: Your account is currently suspended from competitive tournaments.');
    }

    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('NOT_FOUND: Tournament does not exist.');
      }

      if (tournament.status !== TournamentStatuses.REGISTRATION_OPEN) {
        throw new Error(`BAD_REQUEST: Registration is closed for this tournament (Status: ${tournament.status}).`);
      }

      if (tournament.format !== TournamentFormats.SOLO) {
        throw new Error(`BAD_REQUEST: Tournament format is ${tournament.format}. Please create or join a team.`);
      }

      if (tournament.currentCount >= tournament.maxParticipants) {
        throw new Error('CAPACITY_EXCEEDED: Tournament registration has reached maximum capacity.');
      }

      const existing = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId
          }
        }
      });

      if (existing) {
        throw new Error('CONFLICT: You are already registered for this tournament.');
      }

      const participant = await tx.tournamentParticipant.create({
        data: {
          tournamentId,
          userId,
          teamId: null,
          inGameName: inGameName?.trim() || user.username,
          status: ParticipantStatuses.REGISTERED
        },
        include: {
          user: { select: { id: true, username: true, email: true } }
        }
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { currentCount: { increment: 1 } }
      });

      return {
        success: true,
        message: 'Successfully registered for solo tournament.',
        participant
      };
    });
  }

  /**
   * Creates a new Team for DUO / SQUAD tournaments and generates a unique 6-character Invite Code.
   */
  static async createTeam(tournamentId: string, captainId: string, data: { name: string; tag?: string; inGameName?: string }) {
    const captain = await prisma.user.findUnique({ where: { id: captainId } });
    if (!captain) {
      throw new Error('NOT_FOUND: Captain user does not exist.');
    }
    if (captain.isBanned) {
      throw new Error('FORBIDDEN: Your account is currently suspended.');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error('BAD_REQUEST: Team name is required.');
    }

    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('NOT_FOUND: Tournament does not exist.');
      }

      if (tournament.status !== TournamentStatuses.REGISTRATION_OPEN) {
        throw new Error(`BAD_REQUEST: Registration is closed for this tournament (Status: ${tournament.status}).`);
      }

      if (tournament.format === TournamentFormats.SOLO) {
        throw new Error('BAD_REQUEST: SOLO format tournaments do not support team creation. Use solo registration.');
      }

      if (tournament.currentCount >= tournament.maxParticipants) {
        throw new Error('CAPACITY_EXCEEDED: Tournament team slots are full.');
      }

      const existingRegistration = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: captainId
          }
        }
      });

      if (existingRegistration) {
        throw new Error('CONFLICT: You are already registered in this tournament.');
      }

      const existingTeam = await tx.team.findUnique({
        where: {
          tournamentId_name: {
            tournamentId,
            name: data.name.trim()
          }
        }
      });

      if (existingTeam) {
        throw new Error(`CONFLICT: A team named '${data.name.trim()}' is already registered in this tournament.`);
      }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let inviteCode = '';
      for (let i = 0; i < 6; i++) {
        inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      let collision = await tx.team.findUnique({ where: { inviteCode } });
      while (collision) {
        inviteCode = '';
        for (let i = 0; i < 6; i++) {
          inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        collision = await tx.team.findUnique({ where: { inviteCode } });
      }

      const team = await tx.team.create({
        data: {
          tournamentId,
          name: data.name.trim(),
          tag: data.tag ? data.tag.trim().toUpperCase() : null,
          captainId,
          inviteCode
        }
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: captainId,
          role: 'CAPTAIN'
        }
      });

      await tx.tournamentParticipant.create({
        data: {
          tournamentId,
          userId: captainId,
          teamId: team.id,
          inGameName: data.inGameName?.trim() || captain.username,
          status: ParticipantStatuses.REGISTERED
        }
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { currentCount: { increment: 1 } }
      });

      return {
        success: true,
        message: `Team '${team.name}' registered successfully. Share invite code '${inviteCode}' with teammates.`,
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          inviteCode: team.inviteCode,
          captainId: team.captainId,
          roster: [{ id: captain.id, username: captain.username, role: 'CAPTAIN' }]
        }
      };
    });
  }

  /**
   * Adds a player to an existing team using a 6-character Invite Code.
   * Strictly enforces roster capacity limits (DUO = 2, SQUAD = 4).
   */
  static async joinTeamWithInviteCode(
    tournamentId: string,
    userId: string,
    data: { inviteCode: string; inGameName?: string }
  ) {
    if (!data.inviteCode || data.inviteCode.trim().length === 0) {
      throw new Error('BAD_REQUEST: Invite code is required.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('NOT_FOUND: User not found.');
    }
    if (user.isBanned) {
      throw new Error('FORBIDDEN: Your account is suspended.');
    }

    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new Error('NOT_FOUND: Tournament not found.');
      }

      if (tournament.status !== TournamentStatuses.REGISTRATION_OPEN) {
        throw new Error('BAD_REQUEST: Registration has closed for this tournament.');
      }

      const existingRegistration = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId
          }
        }
      });

      if (existingRegistration) {
        throw new Error('CONFLICT: You are already registered in this tournament.');
      }

      const team = await tx.team.findFirst({
        where: {
          tournamentId,
          inviteCode: data.inviteCode.trim().toUpperCase()
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } }
          }
        }
      });

      if (!team) {
        throw new Error('NOT_FOUND: Invalid team invite code for this tournament.');
      }

      const maxMembers = tournament.format === TournamentFormats.DUO ? 2 : 4;
      if (team.members.length >= maxMembers) {
        throw new Error(
          `CAPACITY_EXCEEDED: Capacity lock: This team roster is already full (${team.members.length}/${maxMembers} players).`
        );
      }

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: 'STARTER'
        }
      });

      const participant = await tx.tournamentParticipant.create({
        data: {
          tournamentId,
          userId,
          teamId: team.id,
          inGameName: data.inGameName?.trim() || user.username,
          status: ParticipantStatuses.REGISTERED
        }
      });

      return {
        success: true,
        message: `Successfully joined team '${team.name}'.`,
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          currentMembers: team.members.length + 1,
          maxMembers
        },
        participant
      };
    });
  }

  /**
   * Withdraws a player or team from a tournament before registration closes.
   */
  static async withdrawRegistration(tournamentId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const participant = await tx.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId
          }
        },
        include: {
          tournament: true,
          team: {
            include: {
              members: true
            }
          }
        }
      });

      if (!participant) {
        throw new Error('NOT_FOUND: You are not registered for this tournament.');
      }

      if (participant.tournament.status !== TournamentStatuses.REGISTRATION_OPEN) {
        throw new Error('FORBIDDEN: Cannot withdraw after registration has closed or tournament has begun.');
      }

      if (!participant.teamId || !participant.team) {
        await tx.tournamentParticipant.delete({
          where: { id: participant.id }
        });

        await tx.tournament.update({
          where: { id: tournamentId },
          data: { currentCount: { decrement: 1 } }
        });

        return {
          success: true,
          message: 'Successfully withdrawn from solo tournament.'
        };
      }

      const team = participant.team;
      if (team.captainId === userId) {
        await tx.tournamentParticipant.deleteMany({
          where: { teamId: team.id }
        });

        await tx.teamMember.deleteMany({
          where: { teamId: team.id }
        });

        await tx.team.delete({
          where: { id: team.id }
        });

        await tx.tournament.update({
          where: { id: tournamentId },
          data: { currentCount: { decrement: 1 } }
        });

        return {
          success: true,
          message: `Team '${team.name}' has been disbanded and all roster members withdrawn.`
        };
      } else {
        await tx.teamMember.delete({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId
            }
          }
        });

        await tx.tournamentParticipant.delete({
          where: { id: participant.id }
        });

        return {
          success: true,
          message: `Successfully left team '${team.name}'.`
        };
      }
    });
  }

  /**
   * Retrieves all tournaments and registrations for a specific logged-in player.
   */
  static async getPlayerRegistrations(userId: string) {
    const registrations = await prisma.tournamentParticipant.findMany({
      where: { userId },
      include: {
        tournament: {
          include: {
            game: { select: { id: true, title: true, slug: true, coverImage: true, genre: true, platform: true } },
            organizer: { select: { id: true, username: true, email: true } },
            rounds: {
              orderBy: { roundNumber: 'asc' },
              include: {
                matches: {
                  orderBy: { matchNumber: 'asc' },
                  include: {
                    results: {
                      include: {
                        participant: {
                          include: {
                            user: { select: { id: true, username: true } },
                            team: { select: { id: true, name: true, tag: true } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        team: {
          include: {
            captain: { select: { id: true, username: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, username: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    return registrations.map((reg) => ({
      registrationId: reg.id,
      status: reg.status,
      inGameName: reg.inGameName,
      registeredAt: reg.registeredAt,
      tournament: {
        id: reg.tournament.id,
        title: reg.tournament.title,
        slug: reg.tournament.slug,
        format: reg.tournament.format,
        status: reg.tournament.status,
        startDate: reg.tournament.startDate,
        endDate: reg.tournament.endDate,
        prizePool: reg.tournament.prizePool,
        structure: reg.tournament.structure,
        currentCount: reg.tournament.currentCount,
        maxParticipants: reg.tournament.maxParticipants,
        bannerImage: reg.tournament.bannerImage,
        game: reg.tournament.game,
        organizer: reg.tournament.organizer,
        rounds: reg.tournament.rounds
      },
      team: reg.team
        ? {
            id: reg.team.id,
            name: reg.team.name,
            tag: reg.team.tag,
            inviteCode: reg.team.inviteCode,
            isCaptain: reg.team.captainId === userId,
            captain: reg.team.captain,
            members: reg.team.members.map((m) => ({
              userId: m.user.id,
              username: m.user.username,
              role: m.role,
              joinedAt: m.joinedAt
            }))
          }
        : null
    }));
  }

  /**
   * Generates bracket structure and initial Round 1 matches.
   * Supports Single Elimination seeding & Battle Royale points matrices.
   */
  static async generateBracket(tournamentId: string, actorId: string, isAdmin: boolean) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            team: { select: { id: true, name: true, tag: true } }
          }
        },
        teams: {
          include: {
            members: { include: { user: { select: { id: true, username: true } } } },
            captain: { select: { id: true, username: true } }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (!isAdmin && tournament.organizerId !== actorId) {
      throw new Error('FORBIDDEN: You do not have permission to generate this bracket.');
    }

    const activeParticipants = tournament.participants.filter(
      (p) => p.status !== ParticipantStatuses.DISQUALIFIED
    );

    let competitors: Array<{
      id: string;
      name: string;
      tag?: string | null;
      type: string;
    }> = [];

    if (tournament.format === TournamentFormats.SOLO) {
      competitors = activeParticipants.map((p) => ({
        id: p.id,
        name: p.inGameName || p.user.username,
        tag: null,
        type: 'SOLO'
      }));
    } else {
      const teamMap = new Map<string, (typeof activeParticipants)[0]>();
      for (const p of activeParticipants) {
        if (p.teamId && !teamMap.has(p.teamId)) {
          teamMap.set(p.teamId, p);
        }
      }
      competitors = Array.from(teamMap.values()).map((p) => ({
        id: p.id,
        name: p.team?.name || p.inGameName || p.user.username,
        tag: p.team?.tag || null,
        type: tournament.format
      }));
    }

    if (competitors.length < 2) {
      throw new Error(
        `BAD_REQUEST: At least 2 active competitors are required to generate a bracket. Current registered count: ${competitors.length}`
      );
    }

    // Shuffle competitors for fair random seeding
    for (let i = competitors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [competitors[i], competitors[j]] = [competitors[j], competitors[i]];
    }

    return await prisma.$transaction(async (tx) => {
      // Clean up previously generated rounds and matches
      await tx.round.deleteMany({ where: { tournamentId } });

      if (tournament.structure === 'SINGLE_ELIMINATION') {
        const count = competitors.length;
        let bracketSize = 2;
        while (bracketSize < count) {
          bracketSize *= 2;
        }

        const totalRounds = Math.log2(bracketSize);

        const getRoundName = (roundNum: number, total: number) => {
          const fromEnd = total - roundNum + 1;
          if (fromEnd === 1) return 'Finals';
          if (fromEnd === 2) return 'Semifinals';
          if (fromEnd === 3) return 'Quarterfinals';
          if (fromEnd === 4) return 'Round of 16';
          if (fromEnd === 5) return 'Round of 32';
          return `Round ${roundNum}`;
        };

        const roundEntities = [];
        for (let r = 1; r <= totalRounds; r++) {
          const roundName = getRoundName(r, totalRounds);
          const round = await tx.round.create({
            data: {
              tournamentId,
              roundNumber: r,
              name: roundName
            }
          });
          roundEntities.push(round);
        }

        // Generate matches in reverse order so nextMatchId can be set
        const createdMatchesByRound = new Map<number, any[]>();

        for (let r = totalRounds; r >= 1; r--) {
          const round = roundEntities[r - 1];
          const matchesInRound = Math.pow(2, totalRounds - r);
          const roundMatches = [];

          for (let m = 1; m <= matchesInRound; m++) {
            let nextMatchId: string | null = null;
            if (r < totalRounds) {
              const nextRoundMatches = createdMatchesByRound.get(r + 1);
              const nextMatchIndex = Math.floor((m - 1) / 2);
              if (nextRoundMatches && nextRoundMatches[nextMatchIndex]) {
                nextMatchId = nextRoundMatches[nextMatchIndex].id;
              }
            }

            const match = await tx.match.create({
              data: {
                tournamentId,
                roundId: round.id,
                matchNumber: m,
                nextMatchId,
                status: r === 1 ? 'SCHEDULED' : 'PENDING'
              }
            });
            roundMatches.push(match);
          }
          createdMatchesByRound.set(r, roundMatches);
        }

        // Populate Round 1 matches with seeded competitors
        const round1Matches = createdMatchesByRound.get(1) || [];
        for (let m = 0; m < round1Matches.length; m++) {
          const match = round1Matches[m];
          const comp1 = competitors[m * 2];
          const comp2 = competitors[m * 2 + 1];

          if (comp1) {
            await tx.matchResult.create({
              data: {
                matchId: match.id,
                participantId: comp1.id,
                score: 0,
                kills: 0,
                placement: null,
                isWinner: false
              }
            });
          }

          if (comp2) {
            await tx.matchResult.create({
              data: {
                matchId: match.id,
                participantId: comp2.id,
                score: 0,
                kills: 0,
                placement: null,
                isWinner: false
              }
            });
          } else if (comp1 && !comp2) {
            // Bye auto-advances
            if (match.nextMatchId) {
              await tx.match.update({
                where: { id: match.id },
                data: {
                  status: 'COMPLETED',
                  winnerParticipantId: comp1.id
                }
              });
              await tx.matchResult.create({
                data: {
                  matchId: match.nextMatchId,
                  participantId: comp1.id,
                  score: 0,
                  kills: 0,
                  isWinner: false
                }
              });
            }
          }
        }
      } else {
        // LEADERBOARD_POINTS / BATTLE ROYALE format
        const roundNames = ['Match 1 - Opening Scrim', 'Match 2 - Mid Bracket', 'Match 3 - Final Showdown'];
        for (let r = 1; r <= roundNames.length; r++) {
          const round = await tx.round.create({
            data: {
              tournamentId,
              roundNumber: r,
              name: roundNames[r - 1]
            }
          });

          const match = await tx.match.create({
            data: {
              tournamentId,
              roundId: round.id,
              matchNumber: 1,
              status: r === 1 ? 'IN_PROGRESS' : 'SCHEDULED'
            }
          });

          for (const comp of competitors) {
            await tx.matchResult.create({
              data: {
                matchId: match.id,
                participantId: comp.id,
                score: 0,
                kills: 0,
                placement: null,
                isWinner: false
              }
            });
          }
        }
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatuses.IN_PROGRESS }
      });

      return {
        success: true,
        message: 'Tournament bracket generated and seeded successfully.',
        structure: tournament.structure,
        totalCompetitors: competitors.length
      };
    });
  }

  /**
   * Commits match scores, automatically determines round winners, and creates next-round fixtures.
   */
  static async updateMatchScore(
    tournamentId: string,
    matchId: string,
    actorId: string,
    isAdmin: boolean,
    data: {
      scores: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number;
        isWinner?: boolean;
      }>;
      status?: string;
    }
  ) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    if (!isAdmin && tournament.organizerId !== actorId) {
      throw new Error('FORBIDDEN: You do not have permission to score matches in this tournament.');
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: true,
        results: true
      }
    });

    if (!match || match.tournamentId !== tournamentId) {
      throw new Error('NOT_FOUND: Match not found in this tournament.');
    }

    return await prisma.$transaction(async (tx) => {
      // Update each score
      for (const item of data.scores) {
        await tx.matchResult.upsert({
          where: {
            matchId_participantId: {
              matchId,
              participantId: item.participantId
            }
          },
          update: {
            score: Number(item.score || 0),
            kills: Number(item.kills || 0),
            placement: item.placement ? Number(item.placement) : null,
            isWinner: Boolean(item.isWinner),
            submittedAt: new Date()
          },
          create: {
            matchId,
            participantId: item.participantId,
            score: Number(item.score || 0),
            kills: Number(item.kills || 0),
            placement: item.placement ? Number(item.placement) : null,
            isWinner: Boolean(item.isWinner),
            submittedAt: new Date()
          }
        });
      }

      const newStatus = data.status || 'COMPLETED';
      let winnerParticipantId: string | null = null;

      const explicitWinner = data.scores.find((s) => s.isWinner);
      if (explicitWinner) {
        winnerParticipantId = explicitWinner.participantId;
      } else if (data.scores.length > 0) {
        const sorted = [...data.scores].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (sorted[0] && (sorted[0].score || 0) > 0) {
          winnerParticipantId = sorted[0].participantId;
          await tx.matchResult.update({
            where: {
              matchId_participantId: {
                matchId,
                participantId: winnerParticipantId
              }
            },
            data: { isWinner: true }
          });
        }
      }

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: newStatus,
          winnerParticipantId: winnerParticipantId || match.winnerParticipantId,
          completedAt: newStatus === 'COMPLETED' ? new Date() : null
        },
        include: {
          round: true,
          results: {
            include: {
              participant: {
                include: {
                  user: { select: { id: true, username: true } },
                  team: { select: { id: true, name: true, tag: true } }
                }
              }
            }
          }
        }
      });

      // Elimination Bracket Advancement
      if (
        tournament.structure === 'SINGLE_ELIMINATION' &&
        newStatus === 'COMPLETED' &&
        updatedMatch.winnerParticipantId &&
        updatedMatch.nextMatchId
      ) {
        await tx.matchResult.upsert({
          where: {
            matchId_participantId: {
              matchId: updatedMatch.nextMatchId,
              participantId: updatedMatch.winnerParticipantId
            }
          },
          update: {},
          create: {
            matchId: updatedMatch.nextMatchId,
            participantId: updatedMatch.winnerParticipantId,
            score: 0,
            kills: 0,
            isWinner: false
          }
        });

        const nextCount = await tx.matchResult.count({
          where: { matchId: updatedMatch.nextMatchId }
        });

        if (nextCount >= 2) {
          await tx.match.update({
            where: { id: updatedMatch.nextMatchId },
            data: { status: 'SCHEDULED' }
          });
        }
      }

      return updatedMatch;
    });
  }

  /**
   * Retrieves structured match tree for frontend bracket rendering.
   */
  static async getBracket(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: { select: { id: true, title: true, slug: true, platform: true } },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            matches: {
              orderBy: { matchNumber: 'asc' },
              include: {
                results: {
                  include: {
                    participant: {
                      include: {
                        user: { select: { id: true, username: true, avatarUrl: true } },
                        team: { select: { id: true, name: true, tag: true } }
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
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    return {
      tournamentId: tournament.id,
      title: tournament.title,
      structure: tournament.structure,
      format: tournament.format,
      status: tournament.status,
      rounds: tournament.rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        name: r.name,
        matches: r.matches.map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          status: m.status,
          nextMatchId: m.nextMatchId,
          winnerParticipantId: m.winnerParticipantId,
          scheduledAt: m.scheduledAt,
          completedAt: m.completedAt,
          competitors: m.results.map((res) => ({
            resultId: res.id,
            participantId: res.participantId,
            score: res.score,
            kills: res.kills || 0,
            placement: res.placement,
            isWinner: res.isWinner,
            name:
              tournament.format === TournamentFormats.SOLO
                ? res.participant.inGameName || res.participant.user.username
                : res.participant.team?.name || res.participant.inGameName || res.participant.user.username,
            tag: res.participant.team?.tag || null,
            username: res.participant.user.username,
            avatarUrl: res.participant.user.avatarUrl
          }))
        }))
      }))
    };
  }

  /**
   * Retrieves live recalculated leaderboard standings (Points / Battle Royale format).
   */
  static async getLeaderboard(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true } },
            team: { select: { id: true, name: true, tag: true } },
            matchResults: true
          }
        }
      }
    });

    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament not found.');
    }

    const isSolo = tournament.format === TournamentFormats.SOLO;

    if (isSolo) {
      const rows = tournament.participants.map((p) => {
        const totalScore = p.matchResults.reduce((sum, r) => sum + r.score, 0);
        const totalKills = p.matchResults.reduce((sum, r) => sum + (r.kills || 0), 0);
        const matchesPlayed = p.matchResults.length;
        const wins = p.matchResults.filter((r) => r.isWinner).length;
        const bestPlacement = p.matchResults.reduce((min, r) => {
          if (!r.placement) return min;
          return min === null ? r.placement : Math.min(min, r.placement);
        }, null as number | null);

        return {
          participantId: p.id,
          name: p.inGameName || p.user.username,
          username: p.user.username,
          tag: null,
          matchesPlayed,
          totalScore,
          totalKills,
          wins,
          bestPlacement: bestPlacement || '-',
          disqualified: p.status === ParticipantStatuses.DISQUALIFIED
        };
      });

      rows.sort((a, b) => b.totalScore - a.totalScore || b.totalKills - a.totalKills || b.wins - a.wins);

      return rows.map((r, idx) => ({ rank: idx + 1, ...r }));
    } else {
      const teamMap = new Map<
        string,
        {
          teamId: string;
          name: string;
          tag?: string | null;
          totalScore: number;
          totalKills: number;
          matchesPlayed: number;
          wins: number;
          bestPlacement: number | null;
          participants: string[];
        }
      >();

      for (const p of tournament.participants) {
        if (!p.team) continue;
        const entry = teamMap.get(p.team.id) || {
          teamId: p.team.id,
          name: p.team.name,
          tag: p.team.tag,
          totalScore: 0,
          totalKills: 0,
          matchesPlayed: 0,
          wins: 0,
          bestPlacement: null,
          participants: []
        };

        const pScore = p.matchResults.reduce((sum, r) => sum + r.score, 0);
        const pKills = p.matchResults.reduce((sum, r) => sum + (r.kills || 0), 0);
        entry.totalScore += pScore;
        entry.totalKills += pKills;
        entry.matchesPlayed = Math.max(entry.matchesPlayed, p.matchResults.length);
        entry.wins += p.matchResults.filter((r) => r.isWinner).length;
        p.matchResults.forEach((r) => {
          if (r.placement) {
            entry.bestPlacement =
              entry.bestPlacement === null ? r.placement : Math.min(entry.bestPlacement, r.placement);
          }
        });
        entry.participants.push(p.inGameName || p.user.username);
        teamMap.set(p.team.id, entry);
      }

      const rows = Array.from(teamMap.values());
      rows.sort((a, b) => b.totalScore - a.totalScore || b.totalKills - a.totalKills || b.wins - a.wins);

      return rows.map((r, idx) => ({ rank: idx + 1, ...r }));
    }
  }
}
