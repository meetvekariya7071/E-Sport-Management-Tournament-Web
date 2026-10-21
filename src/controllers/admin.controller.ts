import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { GameService } from '../services/game.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

export class AdminController {
  /**
   * GET /api/admin/kpis
   * Returns high-level KPI counters matching BWP_pro admin header.
   */
  static async getKPISummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await AdminService.getKPISummary();
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to load KPIs' });
    }
  }

  /**
   * GET /api/admin/tables/:table
   * Server-side paginated, searchable, and sortable database table viewer.
   */
  static async getTableData(req: Request, res: Response): Promise<void> {
    try {
      const table = req.params.table as any;
      const { page, limit, search, sortBy, sortOrder } = req.query;

      const result = await AdminService.getTableData(table, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as any
      });

      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      if (err.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: err.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to load table' });
      }
    }
  }

  /**
   * PATCH /api/admin/users/:id/status
   * Toggle user account status (Ban / Unban).
   */
  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isBanned, reason } = req.body;

      if (typeof isBanned !== 'boolean') {
        res.status(400).json({ success: false, error: 'isBanned boolean field is required' });
        return;
      }

      const updated = await AdminService.toggleUserStatus(id, isBanned, reason);

      // Audit Log
      await AuditService.log({
        actorId: req.user?.id,
        action: isBanned ? 'USER_BAN' : 'USER_UNBAN',
        targetEntity: 'USER',
        targetId: id,
        ipAddress: req.ip || req.socket.remoteAddress,
        details: { reason, isBanned }
      });

      // User notification
      await NotificationService.create({
        userId: id,
        title: isBanned ? 'Account Suspended' : 'Account Reinstated',
        message: isBanned
          ? `Your account has been restricted by an administrator. Reason: ${reason || 'Terms of service violation'}`
          : 'Your account access has been fully restored by an administrator.',
        type: 'BAN',
        link: '/profile'
      });

      res.status(200).json({
        success: true,
        message: isBanned ? 'User account has been banned.' : 'User ban has been revoked.',
        data: updated
      });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else if (err.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: err.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to update user status' });
      }
    }
  }

  /**
   * DELETE /api/admin/tournaments/:id
   * Admin force deletion of tournament.
   */
  static async deleteTournament(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteTournament(id);
      res.status(200).json({ success: true, message: 'Tournament successfully removed by administrator.' });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to delete tournament' });
      }
    }
  }

  /**
   * GET /api/admin/tournaments/:id/inspect
   * Tournament Inspector View.
   */
  static async inspectTournament(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const details = await AdminService.inspectTournament(id);
      res.status(200).json({ success: true, data: details });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to inspect tournament' });
      }
    }
  }

  /**
   * POST /api/admin/games
   */
  static async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { title, slug, genre, platform, coverImage, isTeamBased, minTeamSize, maxTeamSize, metadata } = req.body;
      const adminId = req.user!.id;

      if (!title || !slug || !genre) {
        res.status(400).json({ success: false, error: 'title, slug, and genre are required fields.' });
        return;
      }

      const game = await GameService.createGame({
        title,
        slug,
        genre,
        platform,
        coverImage,
        isTeamBased: Boolean(isTeamBased),
        minTeamSize: minTeamSize ? Number(minTeamSize) : 1,
        maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 1,
        metadata,
        adminId
      });

      res.status(201).json({ success: true, message: 'Game added to catalog.', data: game });
    } catch (err: any) {
      if (err.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: err.message.replace('CONFLICT: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to create game' });
      }
    }
  }

  /**
   * PUT /api/admin/games/:id
   */
  static async updateGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await GameService.updateGame(id, req.body);
      res.status(200).json({ success: true, message: 'Game details updated.', data: updated });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to update game' });
      }
    }
  }

  /**
   * DELETE /api/admin/games/:id
   */
  static async deleteGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await GameService.deleteGame(id);
      res.status(200).json({
        success: true,
        softDeleted: result.softDeleted,
        message: result.message
      });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to delete game' });
      }
    }
  }

  /**
   * PATCH /api/admin/games/:id/toggle-status
   */
  static async toggleGameStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const result = await GameService.toggleGameStatus(id, isActive);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.game
      });
    } catch (err: any) {
      if (err.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: err.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to toggle game status' });
      }
    }
  }

  /**
   * GET /api/admin/audit-logs
   * Retrieves system audit trail logs for Admin review tab.
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, action, targetEntity, actorId, search } = req.query;
      const result = await AuditService.getLogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        action: action as string,
        targetEntity: targetEntity as string,
        actorId: actorId as string,
        search: search as string
      });

      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch audit logs' });
    }
  }

  /**
   * GET /api/admin/overview (backwards compatibility)
   */
  static async getAdminOverview(req: Request, res: Response): Promise<void> {
    try {
      const kpis = await AdminService.getKPISummary();
      res.status(200).json({ success: true, data: { stats: kpis } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

