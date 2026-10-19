import { Request, Response } from 'express';
import { RefereeService } from '../services/referee.service';

export class RefereeController {
  static async getAssignedMatches(req: Request, res: Response): Promise<void> {
    try {
      const refereeId = req.user!.id;
      const tournamentId = req.query.tournamentId as string;

      const matches = await RefereeService.getAssignedMatches(refereeId, tournamentId);
      res.status(200).json({ success: true, count: matches.length, matches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async verifyMatchScorecard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const refereeId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const verifiedMatch = await RefereeService.verifyMatchScorecard(id, refereeId, ipAddress);
      res.status(200).json({
        success: true,
        message: 'Match scorecard officially verified and approved.',
        match: verifiedMatch
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getTournamentRoster(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roster = await RefereeService.getTournamentRoster(id);
      res.status(200).json({ success: true, count: roster.length, roster });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateParticipantCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const { id, participantId } = req.params;
      const { status, reason } = req.body;
      const actorId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!['CHECKED_IN', 'NO_SHOW', 'DISQUALIFIED', 'REGISTERED'].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid status. Allowed values: 'CHECKED_IN', 'NO_SHOW', 'DISQUALIFIED', 'REGISTERED'."
        });
        return;
      }

      const updated = await RefereeService.updateParticipantCheckin(
        id,
        participantId,
        status,
        actorId,
        reason,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `Participant check-in status updated to ${status}.`,
        participant: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
