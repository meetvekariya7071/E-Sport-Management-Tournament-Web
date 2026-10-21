import { Request, Response } from 'express';
import { RefereeService } from '../services/referee.service';

export class RefereeController {
  /**
   * GET /api/referee/matches
   * Fetches matches assigned to the referee (or accessible by organizer/admin).
   */
  static async getAssignedMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const tournamentId = req.query.tournamentId as string | undefined;

      const matches = await RefereeService.getAssignedMatches(userId, role, tournamentId);
      res.status(200).json({ success: true, data: matches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to retrieve assigned matches' });
    }
  }

  /**
   * GET /api/referee/matches/:id
   * Fetches single match scorecard details for verification review.
   */
  static async getMatchById(req: Request, res: Response): Promise<void> {
    try {
      const matchId = req.params.id;
      const userId = req.user!.id;
      const role = req.user!.role;

      const match = await RefereeService.getMatchById(matchId, userId, role);
      res.status(200).json({ success: true, data: match });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to retrieve match details' });
      }
    }
  }

  /**
   * POST /api/referee/matches/:id/verify-score
   * Confirms scores and commits changes with official sign-off or referee override.
   */
  static async verifyMatchScore(req: Request, res: Response): Promise<void> {
    try {
      const matchId = req.params.id;
      const userId = req.user!.id;
      const role = req.user!.role;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const verifiedMatch = await RefereeService.verifyMatchScore(
        matchId,
        userId,
        role,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'Match scorecard officially verified and signed off.',
        data: verifiedMatch
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else if (err.message.includes('Unauthorized')) {
        res.status(403).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to verify match scorecard' });
      }
    }
  }

  /**
   * PATCH /api/referee/matches/:id/verify (Alias)
   */
  static async verifyMatchScorecard(req: Request, res: Response): Promise<void> {
    return RefereeController.verifyMatchScore(req, res);
  }

  /**
   * GET /api/referee/disputes
   * Fetches open and assigned tickets for referee's matches.
   */
  static async getAssignedDisputes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const tournamentId = req.query.tournamentId as string | undefined;
      const status = req.query.status as string | undefined;

      const disputes = await RefereeService.getAssignedDisputes(userId, role, {
        tournamentId,
        status
      });

      res.status(200).json({ success: true, data: disputes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to retrieve dispute tickets' });
    }
  }

  /**
   * PATCH /api/referee/disputes/:disputeId
   * Updates dispute status and resolution notes (Uphold or Dismiss).
   */
  static async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const resolverId = req.user!.id;
      const resolverRole = req.user!.role;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const resolved = await RefereeService.resolveDispute(
        disputeId,
        resolverId,
        resolverRole,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `Dispute ticket resolved: ${req.body.action}`,
        data: resolved
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else if (err.message.includes('Unauthorized')) {
        res.status(403).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to update dispute' });
      }
    }
  }

  /**
   * POST /api/referee/players/:id/sanction
   * Issues warnings, match disqualifications, or admin escalations.
   */
  static async sanctionPlayer(req: Request, res: Response): Promise<void> {
    try {
      const targetId = req.params.id;
      const operatorId = req.user!.id;
      const role = req.user!.role;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await RefereeService.sanctionPlayer(
        targetId,
        operatorId,
        role,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to execute disciplinary sanction' });
      }
    }
  }

  /**
   * GET /api/referee/tournaments/:id/check-in
   * Retrieves participant check-in / attendance roster.
   */
  static async getCheckInList(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const list = await RefereeService.getCheckInList(tournamentId);
      res.status(200).json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to retrieve check-in list' });
    }
  }

  /**
   * PATCH /api/referee/participants/:id/status
   * Updates participant check-in status (PRESENT, CHECKED_IN, NO_SHOW, DISQUALIFIED).
   */
  static async updateParticipantStatus(req: Request, res: Response): Promise<void> {
    try {
      const participantId = req.params.id;
      const operatorId = req.user!.id;
      const role = req.user!.role;
      const { status, reason } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!status) {
        res.status(400).json({ success: false, error: 'Status is required' });
        return;
      }

      const updated = await RefereeService.updateParticipantCheckIn(
        participantId,
        status,
        operatorId,
        role,
        reason,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `Participant marked as ${status}.`,
        data: updated
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
      } else if (err.message.includes('Unauthorized')) {
        res.status(403).json({ success: false, error: err.message });
      } else if (err.message.includes('Invalid status')) {
        res.status(400).json({ success: false, error: err.message });
      } else {
        res.status(500).json({ success: false, error: err.message || 'Failed to update participant status' });
      }
    }
  }
}
