import { prisma } from '../config/db';
import {
  TournamentFormat,
  TournamentFormats,
  TournamentStatus,
  TournamentStatuses,
  ParticipantStatuses,
  MatchStatuses
} from '../types';
import { NotificationService } from './notification.service';
import { AuditService } from './audit.service';
import { getTournamentLifecycleStatus } from '../utils/tournamentLifecycle';

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
    registrationStartDate: string;
    registrationEndDate: string;
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

    const lifecycle = getTournamentLifecycleStatus({
      registrationStartDate,
      registrationEndDate,
      startDate,
      endDate
    });

    const initialStatus =
      lifecycle === 'LIVE'
        ? TournamentStatuses.IN_PROGRESS
        : lifecycle === 'PAST'
        ? TournamentStatuses.COMPLETED
        : TournamentStatuses.REGISTRATION_OPEN;

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
        registrationStartDate: new Date(registrationStartDate),
        registrationEndDate: new Date(registrationEndDate),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
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
  static async getTournamentDatabase(tournamentId: string, organizerId: string, isAdmin = false) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: true,
        organizer: { select: { id: true, username: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, username: true, email: true, isBanned: true } },
            team: { select: { id: true, name: true, tag: true } }
          },
          orderBy: { registeredAt: 'asc' }
        },
        teams: {
          include: {
            captain: { select: { id: true, username: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, username: true } }
              }
            }
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
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    if (!isAdmin && tournament.organizerId !== organizerId) {
      throw new Error('FORBIDDEN: You do not own this tournament.');
    }

    const isSolo = tournament.format === TournamentFormats.SOLO;

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
            inviteCode: t.inviteCode,
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
        teams: {
          include: {
            captain: { select: { id: true, username: true } },
            members: {
              include: {
                user: { select: { id: true, username: true } }
              }
            }
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
      teams: tournament.format === TournamentFormats.SOLO ? [] : tournament.teams
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
      lifecycleStatus: getTournamentLifecycleStatus(t)
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

    const result = await prisma.$transaction(async (tx) => {
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
          captainId: team.captainId,
          currentMembers: team.members.length + 1,
          maxMembers
        },
        tournamentTitle: tournament.title,
        participant
      };
    });

    // Notify team captain
    if (result.team.captainId && result.team.captainId !== userId) {
      await NotificationService.create({
        userId: result.team.captainId,
        title: 'Teammate Joined Roster',
        message: `${user.username} joined your team "${result.team.name}" for "${result.tournamentTitle}".`,
        type: 'INVITE',
        link: `/tournaments/${tournamentId}`
      });
    }

    // Audit log
    await AuditService.log({
      actorId: userId,
      action: 'TEAM_JOIN',
      targetEntity: 'TEAM',
      targetId: result.team.id,
      details: {
        tournamentId,
        teamName: result.team.name
      }
    });

    return result;
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
}
