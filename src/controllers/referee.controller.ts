import { Request, Response } from 'express';
import { RefereeService } from '../services/referee.service';

export class RefereeController {
  /**
   * GET /api/referee/matches
   * Retrieve matches assigned to the logged-in referee along with KPI summary
   */
  static async getAssignedMatches(req: Request, res: Response): Promise<void> {
    try {
      const refereeId = req.user!.id;
      const tournamentId = req.query.tournamentId as string;

      const [matches, kpis] = await Promise.all([
        RefereeService.getAssignedMatches(refereeId, tournamentId),
        RefereeService.getRefereeKPIs(refereeId)
      ]);

      res.status(200).json({
        success: true,
        count: matches.length,
        kpis,
        matches
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/referee/matches/:id
   * Match Control Room: details, roster checklist, substitute states, and lobby room token
   */
  static async getMatchControlRoom(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const refereeId = req.user!.id;

      const match = await RefereeService.getMatchControlRoom(id, refereeId);
      res.status(200).json({ success: true, match });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/referee/matches/:id/checkin
   * Interactive attendance sheet toggling (Present, Late, No-Show, Disqualified) and substitute approval
   */
  static async updateMatchCheckin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { participantId, status, reason, isSubstituteApproved, checkinNote } = req.body;
      const actorId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!participantId) {
        res.status(400).json({ success: false, error: 'Missing required field: participantId' });
        return;
      }

      const updated = await RefereeService.updateMatchCheckin({
        matchId: id,
        participantId,
        status,
        reason,
        isSubstituteApproved,
        checkinNote,
        actorId,
        ipAddress
      });

      res.status(200).json({
        success: true,
        message: 'Participant check-in attendance updated.',
        participant: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/referee/matches/:id/status
   * Lock Roster & Start Match or update match progress
   */
  static async updateMatchStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, lockRoster, lobbyCredentials } = req.body;
      const actorId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!status && lockRoster === undefined) {
        res.status(400).json({ success: false, error: 'Either status or lockRoster must be specified.' });
        return;
      }

      const updatedMatch = await RefereeService.updateMatchStatus({
        matchId: id,
        status: status || 'IN_PROGRESS',
        lockRoster,
        lobbyCredentials,
        actorId,
        ipAddress
      });

      res.status(200).json({
        success: true,
        message: lockRoster
          ? `Roster locked. Match #${updatedMatch.matchNumber} started with Room Token: ${updatedMatch.roomToken}`
          : `Match status updated to ${updatedMatch.status}`,
        match: updatedMatch
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/tournaments/:id/assign-referee
   * Organizers & Admins assigning a referee to a tournament or specific match
   */
  static async assignReferee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { refereeId, matchId } = req.body;
      const actorId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!refereeId) {
        res.status(400).json({ success: false, error: 'Missing required field: refereeId' });
        return;
      }

      const result = await RefereeService.assignReferee({
        tournamentId: id,
        refereeId,
        matchId,
        actorId,
        ipAddress
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/referee/matches/:id/verify
   * One-click scorecard verification
   */
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

  /**
   * GET /api/referee/tournaments/:id/participants
   * Tournament check-in roster
   */
  static async getTournamentRoster(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roster = await RefereeService.getTournamentRoster(id);
      res.status(200).json({ success: true, count: roster.length, roster });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/referee/tournaments/:id/database
   * Read-only Tournament Sub-Database Inspection (Players, Teams, Scores)
   */
  static async getTournamentDatabase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const refereeId = req.user!.id;
      const subDatabase = await RefereeService.getTournamentDatabase(id, refereeId);
      res.status(200).json({ success: true, data: subDatabase });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/referee/tournaments/:id/participants/:participantId/check-in
   * Tournament-level check-in
   */
  static async updateParticipantCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const { id, participantId } = req.params;
      const { status, reason } = req.body;
      const actorId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

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
        message: 'Participant check-in status updated.',
        participant: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/referee/matches/:id/verify-score
   * Confirms scores and commits changes (Approve & Finalize or Edit & Override)
   */
  static async verifyScorecardWithOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, refereeNote, results } = req.body;
      const refereeId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!action || !['APPROVE', 'OVERRIDE'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Action must be specified as either "APPROVE" or "OVERRIDE".'
        });
        return;
      }

      if (!refereeNote || !refereeNote.trim()) {
        res.status(400).json({
          success: false,
          error: 'Mandatory referee note is required for score verification.'
        });
        return;
      }

      const verifiedMatch = await RefereeService.verifyScorecardWithOverride({
        matchId: id,
        refereeId,
        action,
        refereeNote,
        results,
        ipAddress
      });

      res.status(200).json({
        success: true,
        message:
          action === 'OVERRIDE'
            ? 'Match scores officially overridden, validated, and saved.'
            : 'Match scores approved and officially finalized.',
        match: verifiedMatch
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/referee/disputes
   * Fetches open/active dispute tickets for referee's assigned matches
   */
  static async getRefereeDisputes(req: Request, res: Response): Promise<void> {
    try {
      const refereeId = req.user!.id;
      const status = req.query.status as string;

      const disputes = await RefereeService.getRefereeDisputes(refereeId, status);
      res.status(200).json({
        success: true,
        count: disputes.length,
        disputes
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/referee/disputes/:disputeId
   * Dispute Resolution Suite: Uphold (overturn match, forfeit, dock points) or Dismiss
   */
  static async resolveRefereeDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const {
        action,
        actionTaken,
        resolutionNote,
        forfeitWinnerParticipantId,
        dockedParticipantId,
        dockPoints,
        overwriteScore
      } = req.body;
      const refereeId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!resolutionNote || !resolutionNote.trim()) {
        res.status(400).json({
          success: false,
          error: 'Resolution note / explanation is required.'
        });
        return;
      }

      const updated = await RefereeService.resolveRefereeDispute({
        disputeId,
        refereeId,
        action: action || 'UPHOLD',
        actionTaken,
        resolutionNote,
        forfeitWinnerParticipantId,
        dockedParticipantId,
        dockPoints,
        overwriteScore,
        ipAddress
      });

      res.status(200).json({
        success: true,
        message: `Dispute ticket resolved as ${updated.status}.`,
        dispute: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/referee/players/:id/sanction
   * Issues warnings, match disqualifications, or admin escalations
   */
  static async sanctionPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sanctionType, reason, tournamentId, matchId, proofUrl } = req.body;
      const refereeId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!sanctionType || !['WARNING', 'MATCH_DISQUALIFY', 'ESCALATE_ADMIN'].includes(sanctionType)) {
        res.status(400).json({
          success: false,
          error: 'sanctionType must be "WARNING", "MATCH_DISQUALIFY", or "ESCALATE_ADMIN".'
        });
        return;
      }

      if (!reason || !reason.trim()) {
        res.status(400).json({
          success: false,
          error: 'Reason and evidence explanation are mandatory for disciplinary actions.'
        });
        return;
      }

      const result = await RefereeService.sanctionPlayer({
        targetId: id,
        refereeId,
        sanctionType,
        reason,
        tournamentId,
        matchId,
        proofUrl,
        ipAddress
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
