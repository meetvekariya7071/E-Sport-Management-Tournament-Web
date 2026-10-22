import { prisma } from '../config/db';
import { Role, Roles, TournamentStatuses } from '../types';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AdminService {
  /**
   * KPI Summary Cards for Admin Dashboard:
   * Total registered players, active organizers, active tournaments, total games available.
   */
  static async getKPISummary() {
    const [totalPlayers, activeOrganizers, activeTournaments, totalGames, totalMatches] =
      await Promise.all([
        prisma.user.count({ where: { role: Roles.PLAYER } }),
        prisma.user.count({ where: { role: Roles.ORGANIZER, isBanned: false } }),
        prisma.tournament.count({
          where: {
            status: { in: [TournamentStatuses.REGISTRATION_OPEN, TournamentStatuses.IN_PROGRESS] }
          }
        }),
        prisma.game.count(),
        prisma.match.count()
      ]);

    return {
      totalPlayers,
      activeOrganizers,
      activeTournaments,
      totalGames,
      totalMatches
    };
  }

  /**
   * Generic paginated database table retrieval for Players, Organizers, Games, Tournaments
   */
  static async getTableData(
    table: 'players' | 'organizers' | 'games' | 'tournaments',
    options: PaginationOptions
  ) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.max(Number(options.limit) || 10, 1);
    const skip = (page - 1) * limit;
    const search = options.search?.trim();
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

    if (table === 'players' || table === 'organizers') {
      const targetRole =
        table === 'players'
          ? Roles.PLAYER
          : table === 'organizers'
          ? Roles.ORGANIZER
          : Roles.PLAYER;

      const where: any = {
        role: targetRole,
        ...(search
          ? {
              OR: [
                { username: { contains: search } },
                { email: { contains: search } }
              ]
            }
          : {})
      };

      const orderBy: any = {};
      if (options.sortBy) {
        orderBy[options.sortBy] = sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      const [total, data] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBanned: true,
            banReason: true,
            createdAt: true,
            _count: {
              select: {
                participations: true,
                organizedTournaments: true
              }
            }
          }
        })
      ]);

      return {
        data: data.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          isBanned: u.isBanned,
          banReason: u.banReason,
          createdAt: u.createdAt,
          gamesPlayed: u._count.participations,
          tournamentsJoined: u._count.participations,
          tournamentsManaged: u._count.organizedTournaments,
          tournamentsCreated: u._count.organizedTournaments
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    if (table === 'games') {
      const where: any = search
        ? {
            OR: [
              { title: { contains: search } },
              { genre: { contains: search } },
              { platform: { contains: search } }
            ]
          }
        : {};

      const orderBy: any = {};
      if (options.sortBy) {
        orderBy[options.sortBy] = sortOrder;
      } else {
        orderBy.title = 'asc';
      }

      const [total, data] = await Promise.all([
        prisma.game.count({ where }),
        prisma.game.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            createdBy: { select: { id: true, username: true } },
            _count: { select: { tournaments: true } }
          }
        })
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    if (table === 'tournaments') {
      const where: any = search
        ? {
            OR: [
              { title: { contains: search } },
              { slug: { contains: search } },
              { format: { contains: search } }
            ]
          }
        : {};

      const orderBy: any = {};
      if (options.sortBy) {
        orderBy[options.sortBy] = sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      const [total, data] = await Promise.all([
        prisma.tournament.count({ where }),
        prisma.tournament.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            game: { select: { id: true, title: true, slug: true, genre: true } },
            organizer: { select: { id: true, username: true, email: true } },
            _count: {
              select: { participants: true, teams: true, matches: true }
            }
          }
        })
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    throw new Error('BAD_REQUEST: Invalid table requested.');
  }

  /**
   * Updates user status (Ban / Unban).
   */
  static async toggleUserStatus(userId: string, isBanned: boolean, banReason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('NOT_FOUND: User does not exist.');
    }

    if (user.role === Roles.ADMIN) {
      throw new Error('FORBIDDEN: Cannot ban a platform administrator.');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        banReason: isBanned ? banReason || 'Disciplinary violation applied by administrator' : null
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        banReason: true,
        updatedAt: true
      }
    });
  }

  /**
   * Forcefully deletes any tournament violating rules.
   */
  static async deleteTournament(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new Error('NOT_FOUND: Tournament does not exist.');
    }

    // Prisma onDelete: Cascade handles participants, teams, rounds, and matches
    return await prisma.tournament.delete({
      where: { id: tournamentId }
    });
  }

  /**
   * Tournament Inspector View for Admin:
   * Returns:
   * - Tab 1: Registered Players
   * - Tab 2: Registered Teams (automatically empty if SOLO)
   * - Tab 3: Scores & Match Brackets
   */
  static async inspectTournament(tournamentId: string) {
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
                verifiedBy: { select: { id: true, username: true } },
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

    const isSolo = tournament.format === 'SOLO';

    return {
      overview: {
        id: tournament.id,
        title: tournament.title,
        slug: tournament.slug,
        description: tournament.description,
        format: tournament.format,
        status: tournament.status,
        maxParticipants: tournament.maxParticipants,
        currentCount: tournament.currentCount,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        createdAt: tournament.createdAt,
        game: tournament.game,
        organizer: tournament.organizer
      },
      // Tab 1: Registered Players
      players: tournament.participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        username: p.user.username,
        email: p.user.email,
        isBanned: p.user.isBanned,
        status: p.status,
        seed: p.seed,
        team: p.team ? { id: p.team.id, name: p.team.name, tag: p.team.tag } : null,
        registeredAt: p.registeredAt,
        disqualified: p.status === 'DISQUALIFIED',
        disqualifyReason: p.disqualifyReason
      })),
      // Tab 2: Registered Teams (hidden/empty for SOLO)
      teams: isSolo
        ? []
        : tournament.teams.map((t) => ({
            id: t.id,
            name: t.name,
            tag: t.tag,
            inviteCode: t.inviteCode,
            captain: t.captain,
            rosterCount: t.members.length,
            members: t.members.map((m) => ({
              id: m.user.id,
              username: m.user.username,
              role: m.role
            })),
            createdAt: t.createdAt
          })),
      // Tab 3: Scores & Match Brackets
      bracket: tournament.rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        name: r.name,
        matches: r.matches.map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          status: m.status,
          verifiedBy: m.verifiedBy,
          scheduledAt: m.scheduledAt,
          completedAt: m.completedAt,
          results: m.results.map((res) => ({
            id: res.id,
            score: res.score,
            kills: res.kills,
            placement: res.placement,
            isWinner: res.isWinner,
            competitorName: res.participant.team?.name || res.participant.user.username
          }))
        }))
      }))
    };
  }
}
