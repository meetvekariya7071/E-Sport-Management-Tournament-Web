import { Request, Response } from 'express';
import { TournamentService } from '../services/tournament.service';
import { BracketService } from '../services/bracket.service';
import { ExportService } from '../services/export.service';
import { CacheService } from '../services/cache.service';
import { TournamentFormat } from '../types';
import { validateTournamentDates } from '../utils/tournamentLifecycle';

export class TournamentController {
  /**
   * POST /api/tournaments
   * Admin & Organizer only.
   */
  static async createTournament(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        slug,
        description,
        bannerImage,
        prizePool,
        structure,
        gameId,
        format,
        maxParticipants,
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
        rules
      } = req.body;

      const organizerId = req.user!.id;

      if (!title || !slug || !gameId || !format || !maxParticipants || !registrationStartDate || !registrationEndDate || !startDate) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: title, slug, gameId, format, maxParticipants, registrationStartDate, registrationEndDate, and startDate are required.'
        });
        return;
      }

      // Enforce chronological date validations:
      // registrationStartDate < registrationEndDate
      // registrationEndDate <= startDate
      // startDate < endDate
      const dateValidation = validateTournamentDates({
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate
      });

      if (!dateValidation.valid) {
        res.status(400).json({
          success: false,
          error: `Bad Request: ${dateValidation.error}`
        });
        return;
      }

      const tournament = await TournamentService.createTournament({
        title,
        slug,
        description,
        bannerImage,
        prizePool,
        structure,
        gameId,
        organizerId,
        format: format as TournamentFormat,
        maxParticipants: Number(maxParticipants),
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
        rules
      });

      res.status(201).json({
        success: true,
        message: 'Tournament initialized and scoped successfully.',
        data: tournament
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Tournament creation failed.' });
      }
    }
  }

  /**
   * GET /api/organizer/stats
   */
  static async getOrganizerStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await TournamentService.getOrganizerStats(req.user!.id);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/organizer/tournaments
   */
  static async getOrganizerTournaments(req: Request, res: Response): Promise<void> {
    try {
      const tournaments = await TournamentService.getOrganizerTournaments(req.user!.id);
      res.status(200).json({ success: true, data: tournaments });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/organizer/tournaments/:id
   */
  static async updateTournament(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await TournamentService.updateTournament(id, req.user!.id, req.body);
      res.status(200).json({ success: true, message: 'Tournament updated successfully.', data: updated });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * DELETE /api/organizer/tournaments/:id
   */
  static async deleteTournament(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAdmin = req.user!.role === 'ADMIN';
      await TournamentService.deleteTournament(id, req.user!.id, isAdmin);
      res.status(200).json({ success: true, message: 'Tournament deleted successfully.' });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/organizer/tournaments/:id/database
   */
  static async getTournamentDatabase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAdmin = req.user!.role === 'ADMIN';
      const databaseView = await TournamentService.getTournamentDatabase(id, req.user!.id, isAdmin);
      res.status(200).json({ success: true, data: databaseView });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/organizer/tournaments/:id/scores
   */
  static async submitScores(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { matchId, scores } = req.body;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!matchId || !Array.isArray(scores)) {
        res.status(400).json({ success: false, error: 'matchId and scores array are required.' });
        return;
      }

      const result = await TournamentService.submitMatchScores({
        tournamentId: id,
        organizerId: req.user!.id,
        matchId,
        scores,
        isAdmin
      });

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/organizer/tournaments/:id/complete
   */
  static async completeTournament(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAdmin = req.user!.role === 'ADMIN';
      const completed = await TournamentService.completeTournament(id, req.user!.id, isAdmin);
      res.status(200).json({
        success: true,
        message: 'Tournament has been officially concluded and score database is archived.',
        data: completed
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * PATCH /api/organizer/tournaments/:id/participants/:playerId/disqualify
   */
  static async disqualifyParticipant(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const participantId = req.params.participantId || req.params.playerId;
      const { reason } = req.body;
      const actorId = req.user!.id;

      const participant = await TournamentService.disqualifyParticipant({
        tournamentId,
        participantId,
        actorId,
        reason
      });

      res.status(200).json({
        success: true,
        message: 'Participant disqualified from tournament.',
        data: participant
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Disqualification failed.' });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/join
   */
  static async joinTournament(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const userId = req.user!.id;
      const { teamName, teamTag, partnerUserIds } = req.body;

      const result = await TournamentService.joinTournament({
        tournamentId,
        userId,
        teamName,
        teamTag,
        partnerUserIds
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:') || error.message.startsWith('CAPACITY_EXCEEDED:')) {
        res.status(403).json({ success: false, error: error.message.replace(/^(FORBIDDEN|CAPACITY_EXCEEDED):\s*/, '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Tournament registration failed.' });
      }
    }
  }

  /**
   * GET /api/tournaments
   * Public discovery catalog with filters (gameId, format, status, search)
   */
  static async getPublicTournaments(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, format, status, search } = req.query;
      const tournaments = await TournamentService.getPublicTournaments({
        gameId: gameId as string | undefined,
        format: format as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined
      });
      res.status(200).json({ success: true, data: tournaments });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/tournaments/:id/details or GET /api/tournaments/:id
   */
  static async getTournamentDetails(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const details = await TournamentService.getTournamentDetails(tournamentId);
      res.status(200).json({ success: true, data: details });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/register/solo
   * Solo registration with IGN prompt; directly inserts into TournamentParticipant.
   */
  static async registerSolo(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const userId = req.user!.id;
      const { inGameName } = req.body;

      const result = await TournamentService.registerSolo(tournamentId, userId, inGameName);
      CacheService.invalidateTournament(tournamentId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:') || error.message.startsWith('CAPACITY_EXCEEDED:')) {
        res.status(403).json({ success: false, error: error.message.split(': ')[1] });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Solo registration failed.' });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/teams
   * Captain creates team, generating a unique 6-character invite code.
   */
  static async createTeam(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const captainId = req.user!.id;
      const { name, tag, inGameName } = req.body;

      const result = await TournamentService.createTeam(tournamentId, captainId, {
        name,
        tag,
        inGameName
      });
      CacheService.invalidateTournament(tournamentId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:') || error.message.startsWith('CAPACITY_EXCEEDED:')) {
        res.status(403).json({ success: false, error: error.message.split(': ')[1] });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Team creation failed.' });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/teams/join
   * Player joins team using 6-character Invite Code. Enforces DUO/SQUAD capacity lock.
   */
  static async joinTeamWithInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const userId = req.user!.id;
      const { inviteCode, inGameName } = req.body;

      const result = await TournamentService.joinTeamWithInviteCode(tournamentId, userId, {
        inviteCode,
        inGameName
      });
      CacheService.invalidateTournament(tournamentId);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:') || error.message.startsWith('CAPACITY_EXCEEDED:')) {
        res.status(403).json({ success: false, error: error.message.replace(/^(FORBIDDEN|CAPACITY_EXCEEDED):\s*/, '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to join team.' });
      }
    }
  }

  /**
   * DELETE /api/tournaments/:id/register
   * Withdraws solo player or disbands/leaves team before tournament starts.
   */
  static async withdrawRegistration(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const userId = req.user!.id;

      const result = await TournamentService.withdrawRegistration(tournamentId, userId);
      CacheService.invalidateTournament(tournamentId);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Withdrawal failed.' });
      }
    }
  }

  /**
   * GET /api/player/registrations
   * Retrieves all tournaments and rosters joined by current logged-in user.
   */
  static async getPlayerRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const registrations = await TournamentService.getPlayerRegistrations(userId);
      res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/tournaments/:id/generate-bracket
   * Generates single elimination or leaderboard points bracket fixtures.
   * Prevents bracket generation if minimum required participants have not checked in.
   */
  static async generateBracket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await BracketService.generateBracket(id, userId, isAdmin);
      CacheService.invalidateTournament(id);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Bracket generation failed.' });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/bracket
   * Returns structured match tree for frontend visualizer rendering.
   */
  static async getTournamentBracket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bracket = await BracketService.getTournamentBracket(id);
      res.status(200).json({ success: true, data: bracket });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch bracket.' });
      }
    }
  }

  /**
   * PUT /api/tournaments/:id/matches/:matchId
   * Commits match scores, automatically determines round winners, creates next-round fixtures,
   * and broadcasts real-time WebSocket events.
   */
  static async updateMatchScore(req: Request, res: Response): Promise<void> {
    try {
      const { id, matchId } = req.params;
      const { scores } = req.body;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!Array.isArray(scores) || scores.length === 0) {
        res.status(400).json({ success: false, error: 'A valid scores array is required.' });
        return;
      }

      const result = await BracketService.updateMatchScore({
        tournamentId: id,
        matchId,
        scores,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to update match score.' });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/publish-round
   * Publishes entire round scoring matrix and fires real-time WebSocket broadcast.
   */
  static async publishRound(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { roundId, matchScores } = req.body;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!roundId || !Array.isArray(matchScores)) {
        res.status(400).json({ success: false, error: 'roundId and matchScores array are required.' });
        return;
      }

      const result = await BracketService.publishRound({
        tournamentId: id,
        roundId,
        matchScores,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to publish round.' });
      }
    }
  }

  /**
   * PATCH /api/tournaments/:id/participants/:participantId/checkin
   */
  static async checkInParticipant(req: Request, res: Response): Promise<void> {
    try {
      const { id, participantId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await BracketService.checkInParticipant(id, participantId, userId, isAdmin);
      CacheService.invalidateTournament(id);
      res.status(200).json({ success: true, message: 'Participant checked in successfully.', data: result });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Check-in failed.' });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/checkin-all
   */
  static async bulkCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await BracketService.bulkCheckIn(id, userId, isAdmin);
      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Bulk check-in failed.' });
      }
    }
  }

  // =========================================================================
  // SUB-DATABASE STREAMING CSV EXPORT ENDPOINTS
  // =========================================================================

  /**
   * GET /api/tournaments/:id/export/participants
   * CSV download of participant details (IGN, User Email, Registration Date, Check-in status).
   */
  static async exportParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filename, csv } = await ExportService.exportParticipants(id);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Export failed.' });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/export/teams
   * CSV download of team rosters, member slots, and captain information (Duo/Squad).
   */
  static async exportTeams(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filename, csv } = await ExportService.exportTeams(id);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Export failed.' });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/export/scores
   * CSV/Spreadsheet download of final match placements, kill counts, and aggregate points.
   */
  static async exportScores(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filename, csv } = await ExportService.exportScores(id);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Export failed.' });
      }
    }
  }

  /**
   * PATCH /api/tournaments/:id/tie-breakers
   * Updates tournament tie-breaker priority configuration.
   */
  static async updateTieBreakerRules(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tieBreakerRules = req.body.tieBreakerRules || req.body.rules;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!Array.isArray(tieBreakerRules) || tieBreakerRules.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: tieBreakerRules must be a non-empty array of rule names.'
        });
        return;
      }

      const result = await BracketService.updateTieBreakerRules({
        tournamentId: id,
        rules: tieBreakerRules,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/matches/:matchId/walkover
   * Awards Walkover / Bye to an advancing participant in an elimination bracket.
   */
  static async awardWalkover(req: Request, res: Response): Promise<void> {
    try {
      const { id, matchId } = req.params;
      const { winnerParticipantId, forfeitParticipantId, reason } = req.body;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!winnerParticipantId || !reason) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: winnerParticipantId and reason are required.'
        });
        return;
      }

      const result = await BracketService.awardWalkover({
        tournamentId: id,
        matchId,
        winnerParticipantId,
        forfeitParticipantId,
        reason,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/matches/:matchId/rollback
   * Rolls back an erroneous match result and cleans up downstream fixtures.
   */
  static async rollbackMatch(req: Request, res: Response): Promise<void> {
    try {
      const { id, matchId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await BracketService.rollbackMatch({
        tournamentId: id,
        matchId,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/rounds/:roundId/rollback
   * Rolls back an entire round.
   */
  static async rollbackRound(req: Request, res: Response): Promise<void> {
    try {
      const { id, roundId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await BracketService.rollbackRound({
        tournamentId: id,
        roundId,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/teams/:teamId/substitute
   * Swaps an inactive player with an active substitute.
   */
  static async substituteTeamPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { id, teamId } = req.params;
      const outgoingUserId = req.body.outgoingUserId || req.body.outUserId;
      const incomingIdentifier = req.body.incomingIdentifier || req.body.substituteEmailOrUsername || req.body.substituteIdentifier;
      const inGameName = req.body.inGameName || req.body.substituteIgn;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!outgoingUserId || !incomingIdentifier) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: outgoingUserId and incomingIdentifier (email, username, or id) are required.'
        });
        return;
      }

      const result = await BracketService.substituteTeamPlayer({
        tournamentId: id,
        teamId,
        outgoingUserId,
        incomingIdentifier,
        inGameName,
        userId,
        isAdmin
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * POST /api/tournaments/:id/matches/:matchId/credentials
   * Distributes custom match room credentials (Room ID, Password, Instructions).
   */
  static async setMatchCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { id, matchId } = req.params;
      const { customRoomId, customRoomPassword, roomInstructions } = req.body;
      const userId = req.user!.id;
      const role = req.user!.role;

      if (!customRoomId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: customRoomId (e.g., Server Name or Room ID) is required.'
        });
        return;
      }

      const result = await BracketService.setMatchCredentials({
        tournamentId: id,
        matchId,
        customRoomId,
        customRoomPassword,
        roomInstructions,
        userId,
        role
      });

      CacheService.invalidateTournament(id);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/matches/:matchId/credentials
   * Retrieves match credentials with participant & completion safeguards.
   */
  static async getMatchCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { id, matchId } = req.params;
      const userId = req.user!.id;
      const role = req.user!.role;

      const result = await BracketService.getMatchCredentials({
        tournamentId: id,
        matchId,
        userId,
        role
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }
}


