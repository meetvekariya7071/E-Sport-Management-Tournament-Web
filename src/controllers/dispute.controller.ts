import { Request, Response } from 'express';
import { DisputeService } from '../services/dispute.service';

export class DisputeController {
  /**
   * POST /api/tournaments/:id/disputes
   * Player raises a dispute on an active/recent match.
   */
  static async createDispute(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const claimantId = req.user!.id;
      const { matchId, reason, description, proofUrl } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!matchId || !reason || !description) {
        res.status(400).json({
          success: false,
          error: 'matchId, reason, and description are required fields.'
        });
        return;
      }

      const dispute = await DisputeService.createDispute(
        {
          tournamentId,
          matchId,
          claimantId,
          reason,
          description,
          proofUrl
        },
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Dispute ticket submitted successfully. Tournament officials have been notified.',
        data: dispute
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else if (err.message.includes('registered participant')) {
        res.status(403).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to submit dispute' });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/disputes
   * Retrieves all disputes for a tournament.
   */
  static async getTournamentDisputes(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const status = req.query.status as string | undefined;

      const disputes = await DisputeService.getDisputesByTournament(tournamentId, status);
      res.status(200).json({ success: true, data: disputes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch disputes' });
    }
  }

  /**
   * GET /api/disputes
   * Retrieves disputes for the authenticated user based on role.
   */
  static async getUserDisputes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const tournamentId = req.query.tournamentId as string | undefined;
      const status = req.query.status as string | undefined;

      const disputes = await DisputeService.getDisputesForUser(userId, role, {
        tournamentId,
        status
      });

      res.status(200).json({ success: true, data: disputes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch disputes' });
    }
  }

  /**
   * PATCH /api/disputes/:disputeId/resolve
   * Review board action: Investigate, Accept & Overwrite Score, or Dismiss.
   */
  static async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const resolverId = req.user!.id;
      const resolverRole = req.user!.role;
      const { action, resolutionNotes, scoreAdjustments } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!action || !resolutionNotes) {
        res.status(400).json({
          success: false,
          error: 'action and resolutionNotes are required fields.'
        });
        return;
      }

      const validActions = ['INVESTIGATE', 'ACCEPT_OVERWRITE', 'DISMISS'];
      if (!validActions.includes(action)) {
        res.status(400).json({
          success: false,
          error: `Invalid action '${action}'. Must be one of: ${validActions.join(', ')}`
        });
        return;
      }

      const resolved = await DisputeService.resolveDispute(
        disputeId,
        resolverId,
        resolverRole,
        {
          action,
          resolutionNotes,
          scoreAdjustments
        },
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `Dispute status updated: ${action}`,
        data: resolved
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else if (err.message.includes('Unauthorized')) {
        res.status(403).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to resolve dispute' });
      }
    }
  }
}
