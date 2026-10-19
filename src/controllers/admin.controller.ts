import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { GameService } from '../services/game.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

export class AdminController {
  /**
   * GET /api/admin/audit-logs
   * View platform-wide audit logs
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, actionType, targetEntity, search } = req.query;
      const logs = await AuditService.getLogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        actionType: actionType as string,
        targetEntity: targetEntity as string,
        search: search as string
      });

      res.status(200).json({ success: true, ...logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch audit logs' });
    }
  }

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
      const adminId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (typeof isBanned !== 'boolean') {
        res.status(400).json({ success: false, error: 'isBanned boolean field is required' });
        return;
      }

      const updated = await AdminService.toggleUserStatus(id, isBanned, reason);

      // Audit Log
      await AuditService.log({
        actorId: adminId,
        actionType: isBanned ? 'USER_BAN' : 'USER_UNBAN',
        targetEntity: 'USER',
        targetId: id,
        details: { isBanned, reason: reason || 'N/A' },
        ipAddress
      });

      // Notification
      await NotificationService.send({
        userId: id,
        title: isBanned ? 'Account Suspended' : 'Account Reinstated',
        message: isBanned
          ? `Your account has been suspended: ${reason || 'Terms of service violation'}`
          : 'Your account suspension has been lifted.',
        type: 'BAN',
        link: '/'
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
      const adminId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      await AdminService.deleteTournament(id);

      await AuditService.log({
        actorId: adminId,
        actionType: 'TOURNAMENT_DELETE',
        targetEntity: 'TOURNAMENT',
        targetId: id,
        details: { action: 'Admin force delete' },
        ipAddress
      });

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
      const ipAddress = req.ip || req.socket.remoteAddress;

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

      await AuditService.log({
        actorId: adminId,
        actionType: 'GAME_CREATE',
        targetEntity: 'GAME',
        targetId: game.id,
        details: { title: game.title, platform: game.platform },
        ipAddress
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
      const adminId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      await GameService.deleteGame(id);

      await AuditService.log({
        actorId: adminId,
        actionType: 'GAME_DELETE',
        targetEntity: 'GAME',
        targetId: id,
        details: { action: 'Admin deleted game' },
        ipAddress
      });

      res.status(200).json({ success: true, message: 'Game removed from catalog.' });
    } catch (err: any) {
      if (err.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: err.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to delete game' });
      }
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
