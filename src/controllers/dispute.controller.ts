import { Request, Response } from 'express';
import { DisputeService } from '../services/dispute.service';

export class DisputeController {
  static async createDispute(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const { matchId, reason, description, proofUrl } = req.body;
      const raisedById = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!reason || !description) {
        res.status(400).json({
          success: false,
          error: 'Reason and description are mandatory to raise a dispute.'
        });
        return;
      }

      const dispute = await DisputeService.createDispute({
        tournamentId,
        matchId,
        raisedById,
        reason,
        description,
        proofUrl,
        ipAddress
      });

      res.status(201).json({
        success: true,
        message: 'Dispute ticket raised successfully.',
        dispute
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getTournamentDisputes(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const status = req.query.status as string;

      const disputes = await DisputeService.getTournamentDisputes(tournamentId, status);
      res.status(200).json({ success: true, count: disputes.length, disputes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getAllDisputes(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.query.tournamentId as string;
      const status = req.query.status as string;
      const user = req.user!;

      const disputes = await DisputeService.getAllDisputes({
        tournamentId,
        status,
        userId: user.id,
        userRole: user.role
      });

      res.status(200).json({ success: true, count: disputes.length, disputes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { status, resolutionNote, overwriteScore } = req.body;
      const resolvedById = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!status || !resolutionNote) {
        res.status(400).json({
          success: false,
          error: 'Status and resolutionNote are required to resolve a dispute.'
        });
        return;
      }

      const updated = await DisputeService.resolveDispute({
        disputeId,
        resolvedById,
        status,
        resolutionNote,
        overwriteScore,
        ipAddress
      });

      res.status(200).json({
        success: true,
        message: `Dispute ticket resolved as ${status}.`,
        dispute: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
