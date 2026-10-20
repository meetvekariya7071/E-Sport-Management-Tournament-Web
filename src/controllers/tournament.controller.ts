import { Request, Response } from 'express';
import { TournamentService } from '../services/tournament.service';
import { TournamentFormat } from '../types';
import { broadcastTournamentEvent } from '../config/socket';
import { cacheService } from '../services/cache.service';
import { ExportService } from '../services/export.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../config/db';

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

      if (!title || !slug || !gameId || !format || !maxParticipants || !startDate) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: title, slug, gameId, format, maxParticipants, and startDate are required.'
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

      cacheService.invalidatePublicCatalogs();

      // Audit Log
      await AuditService.log({
        actorId: organizerId,
        actionType: 'TOURNAMENT_CREATE',
        targetEntity: 'TOURNAMENT',
        targetId: tournament.id,
        details: { title: tournament.title, format: tournament.format },
        ipAddress: req.ip || req.socket.remoteAddress
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
      cacheService.invalidateTournament(id);
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
      cacheService.invalidateTournament(id);
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

      cacheService.invalidateTournament(id);

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
      cacheService.invalidateTournament(id);
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

      cacheService.invalidateTournament(tournamentId);

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
        res.status(403).json({ success: false, error: error.message.split(': ')[1] });
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
      cacheService.invalidateTournament(tournamentId);
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
      cacheService.invalidateTournament(tournamentId);
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
      cacheService.invalidateTournament(tournamentId);

      // Notify Team Captain
      try {
        const teamRecord = await prisma.team.findUnique({
          where: { id: result.team.id },
          select: { captainId: true, name: true }
        });
        if (teamRecord && teamRecord.captainId && teamRecord.captainId !== userId) {
          await NotificationService.send({
            userId: teamRecord.captainId,
            title: `Player Joined Your Squad`,
            message: `${req.user!.username} joined team "${teamRecord.name}".`,
            type: 'INVITE',
            link: `/player/my-tournaments`
          });
        }
      } catch (err) {
        console.error('[Notification Error in joinTeam]', err);
      }

      res.status(200).json(result);
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
      cacheService.invalidateTournament(tournamentId);
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
   * Generates bracket structure and seeds competitors into Round 1 fixtures.
   */
  static async generateBracket(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const actorId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await TournamentService.generateBracket(tournamentId, actorId, isAdmin);
      cacheService.invalidateTournament(tournamentId);

      // Real-time broadcasts
      const bracket = await TournamentService.getBracket(tournamentId);
      broadcastTournamentEvent(tournamentId, 'bracket:advance', bracket);

      const leaderboard = await TournamentService.getLeaderboard(tournamentId);
      broadcastTournamentEvent(tournamentId, 'leaderboard:refresh', leaderboard);

      // Notify active participants that brackets are live
      try {
        const participants = await prisma.tournamentParticipant.findMany({
          where: { tournamentId },
          select: { userId: true }
        });
        const userIds = participants.map((p) => p.userId);
        await NotificationService.sendBulk(userIds, {
          title: 'Tournament Brackets Live!',
          message: 'Match fixtures have been scheduled. Check your bracket and match schedule now.',
          type: 'MATCH_START',
          link: `/tournaments/${tournamentId}`
        });
      } catch (notifyErr) {
        console.error('[Notification Error in generateBracket]', notifyErr);
      }

      // Audit Log
      await AuditService.log({
        actorId,
        actionType: 'BRACKET_GENERATE',
        targetEntity: 'TOURNAMENT',
        targetId: tournamentId,
        details: { totalCompetitors: result.totalCompetitors },
        ipAddress: req.ip || req.socket.remoteAddress
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to generate bracket.' });
      }
    }
  }

  /**
   * PUT /api/tournaments/:id/matches/:matchId
   * Commits match scores, automatically determines round winners, and creates next-round fixtures.
   */
  static async updateMatchScore(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const matchId = req.params.matchId;
      const actorId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { scores, status } = req.body;

      if (!Array.isArray(scores)) {
        res.status(400).json({ success: false, error: 'Scores array is required.' });
        return;
      }

      const updatedMatch = await TournamentService.updateMatchScore(
        tournamentId,
        matchId,
        actorId,
        isAdmin,
        { scores, status }
      );

      cacheService.invalidateTournament(tournamentId);

      // Broadcast real-time score update
      broadcastTournamentEvent(tournamentId, 'match:update_score', updatedMatch);

      // Broadcast updated bracket structure
      const bracket = await TournamentService.getBracket(tournamentId);
      broadcastTournamentEvent(tournamentId, 'bracket:advance', bracket);

      // Broadcast recalculated leaderboard
      const leaderboard = await TournamentService.getLeaderboard(tournamentId);
      broadcastTournamentEvent(tournamentId, 'leaderboard:refresh', leaderboard);

      // Audit Log
      await AuditService.log({
        actorId,
        actionType: 'SCORE_UPDATE',
        targetEntity: 'MATCH',
        targetId: matchId,
        details: { tournamentId, status },
        ipAddress: req.ip || req.socket.remoteAddress
      });

      // Notify match participants of updated score
      try {
        if (updatedMatch.results) {
          for (const resItem of updatedMatch.results) {
            if (resItem.participant?.user?.id) {
              await NotificationService.send({
                userId: resItem.participant.user.id,
                title: 'Match Score Recorded',
                message: `Official match score has been updated for Match #${updatedMatch.matchNumber}.`,
                type: 'SCORE_UPDATE',
                link: `/tournaments/${tournamentId}`
              });
            }
          }
        }
      } catch (notifErr) {
        console.error('[Notification Error in updateMatchScore]', notifErr);
      }

      res.status(200).json({
        success: true,
        message: 'Match score updated and broadcasted in real time.',
        data: updatedMatch
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to update match score.' });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/bracket
   * Returns structured match tree for frontend bracket visualizer.
   */
  static async getBracket(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const bracket = await TournamentService.getBracket(tournamentId);
      res.status(200).json({ success: true, data: bracket });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/leaderboard
   * Returns live standings for points / battle royale tournaments.
   */
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const leaderboard = await TournamentService.getLeaderboard(tournamentId);
      res.status(200).json({ success: true, data: leaderboard });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/export/participants
   * Streams CSV download of participant details (IGN, User Email, Registration Date, Check-in status).
   */
  static async exportParticipants(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const { filename, csv } = await ExportService.exportParticipantsCsv(tournamentId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/export/teams
   * Streams CSV download of team rosters, member slots, and captain information (Duo/Squad only).
   */
  static async exportTeams(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const { filename, csv } = await ExportService.exportTeamsCsv(tournamentId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  /**
   * GET /api/tournaments/:id/export/scores
   * Streams CSV download of final match placements, kill counts, and aggregate points.
   */
  static async exportScores(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = req.params.id;
      const { filename, csv } = await ExportService.exportScoresCsv(tournamentId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }
}
