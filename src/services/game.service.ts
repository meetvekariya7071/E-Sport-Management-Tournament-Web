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
   * Retrieves all games from the catalog.
   */
  static async getAllGames() {
    return await prisma.game.findMany({
      include: {
        _count: {
          select: { tournaments: true }
        }
      },
      orderBy: { title: 'asc' }
    });
  }

  /**
   * Deletes a game if no tournaments rely on it.
   */
  static async deleteGame(gameId: string) {
    const tournamentCount = await prisma.tournament.count({
      where: { gameId }
    });

    if (tournamentCount > 0) {
      throw new Error(`FORBIDDEN: Cannot delete game because ${tournamentCount} tournament(s) are bound to it.`);
    }

    return await prisma.game.delete({
      where: { id: gameId }
    });
  }
}
