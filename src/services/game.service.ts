import { prisma } from '../config/db';

export class GameService {
  /**
   * Creates a new game in the global catalog (Admin only).
   */
  static async createGame(data: {
    title: string;
    slug: string;
    genre: string;
    platform?: string;
    coverImage?: string;
    isTeamBased?: boolean;
    minTeamSize?: number;
    maxTeamSize?: number;
    metadata?: any;
    adminId?: string;
  }) {
    const {
      title,
      slug,
      genre,
      platform = 'PC',
      coverImage,
      isTeamBased = false,
      minTeamSize = 1,
      maxTeamSize = 1,
      metadata,
      adminId
    } = data;

    const existingSlug = await prisma.game.findFirst({
      where: {
        OR: [{ slug }, { title }]
      }
    });

    if (existingSlug) {
      throw new Error('CONFLICT: A game with this title or slug already exists.');
    }

    return await prisma.game.create({
      data: {
        title,
        slug,
        genre,
        platform,
        coverImage: coverImage || null,
        isTeamBased,
        minTeamSize: isTeamBased ? Math.max(minTeamSize, 2) : 1,
        maxTeamSize: isTeamBased ? Math.max(maxTeamSize, minTeamSize) : 1,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        createdById: adminId || null
      }
    });
  }

  /**
   * Updates an existing game in the catalog.
   */
  static async updateGame(
    gameId: string,
    data: {
      title?: string;
      slug?: string;
      genre?: string;
      platform?: string;
      coverImage?: string;
      isTeamBased?: boolean;
      minTeamSize?: number;
      maxTeamSize?: number;
    }
  ) {
    const existing = await prisma.game.findUnique({ where: { id: gameId } });
    if (!existing) {
      throw new Error('NOT_FOUND: Game does not exist.');
    }

    return await prisma.game.update({
      where: { id: gameId },
      data: {
        title: data.title ?? existing.title,
        slug: data.slug ?? existing.slug,
        genre: data.genre ?? existing.genre,
        platform: data.platform ?? existing.platform,
        coverImage: data.coverImage ?? existing.coverImage,
        isTeamBased: data.isTeamBased ?? existing.isTeamBased,
        minTeamSize: data.minTeamSize ?? existing.minTeamSize,
        maxTeamSize: data.maxTeamSize ?? existing.maxTeamSize
      }
    });
  }

  /**
   * Retrieves games from the catalog. Filter by isActive if onlyActive is true.
   */
  static async getAllGames(onlyActive: boolean = false) {
    return await prisma.game.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { tournaments: true }
        }
      },
      orderBy: { title: 'asc' }
    });
  }

  /**
   * Deletes a game if zero tournaments linked, otherwise soft-deletes/archives it.
   */
  static async deleteGame(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('NOT_FOUND: Game does not exist.');
    }

    const tournamentCount = await prisma.tournament.count({
      where: { gameId }
    });

    if (tournamentCount > 0) {
      const archived = await prisma.game.update({
        where: { id: gameId },
        data: { isActive: false }
      });
      return {
        softDeleted: true,
        message: 'Game has active/past tournaments. It has been archived and hidden from organizers for new tournament creation.',
        game: archived
      };
    }

    await prisma.game.delete({
      where: { id: gameId }
    });
    return {
      softDeleted: false,
      message: 'Game removed from catalog completely.'
    };
  }

  /**
   * Toggles game active / archived status.
   */
  static async toggleGameStatus(gameId: string, isActive?: boolean) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new Error('NOT_FOUND: Game does not exist.');
    }

    const nextState = typeof isActive === 'boolean' ? isActive : !game.isActive;
    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { isActive: nextState }
    });

    return {
      game: updated,
      message: updated.isActive
        ? `"${updated.title}" has been unarchived and is now available for new tournaments.`
        : `"${updated.title}" has been archived and hidden from organizers for new tournament creation.`
    };
  }

  /**
   * Retrieves a single game by its ID or unique slug, including stats and associated tournaments.
   */
  static async getGameByIdOrSlug(idOrSlug: string) {
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: {
        tournaments: {
          include: {
            organizer: { select: { id: true, username: true } },
            game: { select: { id: true, title: true, slug: true, platform: true, coverImage: true } },
            _count: {
              select: {
                participants: true,
                teams: true,
                matches: true
              }
            }
          },
          orderBy: { startDate: 'desc' }
        },
        _count: {
          select: { tournaments: true }
        }
      }
    });

    if (!game) {
      throw new Error('NOT_FOUND: Game not found.');
    }

    const totalTournaments = game.tournaments.length;
    const activeTournaments = game.tournaments.filter(
      (t) => t.status === 'REGISTRATION_OPEN' || t.status === 'IN_PROGRESS'
    ).length;
    const totalParticipants = game.tournaments.reduce(
      (sum, t) => sum + (t.currentCount || 0),
      0
    );

    let totalPrizePoolAmount = 0;
    game.tournaments.forEach((t) => {
      if (t.prizePool) {
        const numeric = parseFloat(t.prizePool.replace(/[^0-9.]/g, ''));
        if (!isNaN(numeric)) {
          totalPrizePoolAmount += numeric;
        }
      }
    });

    return {
      ...game,
      stats: {
        totalTournaments,
        activeTournaments,
        totalParticipants,
        totalPrizePool: totalPrizePoolAmount > 0 ? `$${totalPrizePoolAmount.toLocaleString()}` : `${game.tournaments.filter(t => t.prizePool).length} Prize Events`
      }
    };
  }
}

