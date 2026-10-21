import { Request, Response } from 'express';
import { GameService } from '../services/game.service';

export class GameController {
  /**
   * POST /api/games (Admin only)
   */
  static async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { title, slug, genre, platform, coverImage, isTeamBased, minTeamSize, maxTeamSize, metadata } = req.body;
      const adminId = req.user!.id;

      if (!title || !slug || !genre) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: title, slug, and genre are required.'
        });
        return;
      }

      const game = await GameService.createGame({
        title,
        slug,
        genre,
        platform,
        coverImage,
        isTeamBased,
        minTeamSize: minTeamSize ? Number(minTeamSize) : 1,
        maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 1,
        metadata,
        adminId
      });

      res.status(201).json({
        success: true,
        message: 'Game added to master catalog.',
        data: game
      });
    } catch (error: any) {
      if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to create game.' });
      }
    }
  }

  /**
   * PUT /api/games/:id (Admin only)
   */
  static async updateGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await GameService.updateGame(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Game updated successfully.',
        data: updated
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to update game.' });
      }
    }
  }

  /**
   * GET /api/games
   */
  static async getAllGames(req: Request, res: Response): Promise<void> {
    try {
      const games = await GameService.getAllGames();
      res.status(200).json({
        success: true,
        count: games.length,
        data: games
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch games.' });
    }
  }

  /**
   * DELETE /api/games/:id (Admin only)
   */
  static async deleteGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await GameService.deleteGame(id);
      res.status(200).json({
        success: true,
        message: 'Game removed from catalog.'
      });
    } catch (error: any) {
      if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to delete game.' });
      }
    }
  }
}
