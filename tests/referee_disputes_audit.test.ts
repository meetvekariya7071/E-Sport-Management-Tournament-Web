import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';

describe('Referee, Dispute, Notification, and Audit Trail Suite', () => {
  let adminToken: string;
  let organizerToken: string;
  let refereeToken: string;
  let playerToken: string;

  let adminUser: any;
  let organizerUser: any;
  let refereeUser: any;
  let playerUser: any;

  let testGame: any;
  let testTournament: any;
  let testParticipant: any;
  let testMatch: any;
  let testDispute: any;

  const signToken = (user: any) => {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create users
    adminUser = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@test.com`,
        username: `admin_${timestamp}`,
        passwordHash: 'hash',
        role: 'ADMIN'
      }
    });
    adminToken = signToken(adminUser);

    organizerUser = await prisma.user.create({
      data: {
        email: `org_${timestamp}@test.com`,
        username: `org_${timestamp}`,
        passwordHash: 'hash',
        role: 'ORGANIZER'
      }
    });
    organizerToken = signToken(organizerUser);

    refereeUser = await prisma.user.create({
      data: {
        email: `ref_${timestamp}@test.com`,
        username: `ref_${timestamp}`,
        passwordHash: 'hash',
        role: 'REFEREE'
      }
    });
    refereeToken = signToken(refereeUser);

    playerUser = await prisma.user.create({
      data: {
        email: `ply_${timestamp}@test.com`,
        username: `ply_${timestamp}`,
        passwordHash: 'hash',
        role: 'PLAYER'
      }
    });
    playerToken = signToken(playerUser);

    // Create Game
    testGame = await prisma.game.create({
      data: {
        title: `Game Ref Test ${timestamp}`,
        slug: `game-ref-test-${timestamp}`,
        genre: 'FPS',
        platform: 'PC'
      }
    });

    // Create Tournament
    testTournament = await prisma.tournament.create({
      data: {
        title: `Tournament Ref Test ${timestamp}`,
        slug: `tourn-ref-test-${timestamp}`,
        gameId: testGame.id,
        organizerId: organizerUser.id,
        format: 'SOLO',
        maxParticipants: 8,
        startDate: new Date(Date.now() + 86400000),
        status: 'IN_PROGRESS'
      }
    });

    // Create Participant
    testParticipant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: testTournament.id,
        userId: playerUser.id,
        inGameName: 'ProPlayer1',
        status: 'REGISTERED'
      }
    });

    // Create Round & Match
    const round = await prisma.round.create({
      data: {
        tournamentId: testTournament.id,
        roundNumber: 1,
        name: 'Quarterfinals'
      }
    });

    testMatch = await prisma.match.create({
      data: {
        tournamentId: testTournament.id,
        roundId: round.id,
        matchNumber: 1,
        refereeId: refereeUser.id,
        status: 'IN_PROGRESS'
      }
    });

    await prisma.matchResult.create({
      data: {
        matchId: testMatch.id,
        participantId: testParticipant.id,
        score: 10,
        kills: 3,
        isWinner: true
      }
    });
  });

  describe('1. Referee Management & Match Verification', () => {
    it('GET /api/referee/matches should list matches assigned to current referee', async () => {
      const res = await request(app)
        .get('/api/referee/matches')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.matches)).toBe(true);
      expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
      expect(res.body.matches[0].id).toBe(testMatch.id);
    });

    it('PATCH /api/referee/matches/:id/verify should mark scorecard as officially validated', async () => {
      const res = await request(app)
        .patch(`/api/referee/matches/${testMatch.id}/verify`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.isVerified).toBe(true);
      expect(res.body.match.verifiedById).toBe(refereeUser.id);
    });

    it('PATCH /api/referee/tournaments/:id/participants/:participantId/check-in updates attendance checklist', async () => {
      const res = await request(app)
        .patch(
          `/api/referee/tournaments/${testTournament.id}/participants/${testParticipant.id}/check-in`
        )
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ status: 'CHECKED_IN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.participant.status).toBe('CHECKED_IN');
    });

    it('GET /api/referee/tournaments/:id/participants returns participant roster', async () => {
      const res = await request(app)
        .get(`/api/referee/tournaments/${testTournament.id}/participants`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.roster)).toBe(true);
      expect(res.body.roster.some((p: any) => p.id === testParticipant.id)).toBe(true);
    });
  });

  describe('2. Match Dispute Ticketing Engine', () => {
    it('POST /api/tournaments/:id/disputes allows participant to raise a dispute', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${testTournament.id}/disputes`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({
          matchId: testMatch.id,
          reason: 'INCORRECT_SCORE',
          description: 'Opponent score was inflated by 5 points without video evidence.',
          proofUrl: 'https://example.com/proof.png'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.dispute.status).toBe('OPEN');
      expect(res.body.dispute.reason).toBe('INCORRECT_SCORE');

      testDispute = res.body.dispute;
    });

    it('GET /api/tournaments/:id/disputes retrieves tournament disputes', async () => {
      const res = await request(app)
        .get(`/api/tournaments/${testTournament.id}/disputes`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.disputes.some((d: any) => d.id === testDispute.id)).toBe(true);
    });

    it('PATCH /api/disputes/:disputeId/resolve resolves dispute with referee/organizer notes', async () => {
      const res = await request(app)
        .patch(`/api/disputes/${testDispute.id}/resolve`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNote: 'Reviewed stream recording. Discrepancy confirmed and resolved.',
          overwriteScore: {
            matchId: testMatch.id,
            results: [
              {
                participantId: testParticipant.id,
                score: 15,
                kills: 4,
                isWinner: true
              }
            ]
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dispute.status).toBe('RESOLVED');
      expect(res.body.dispute.resolutionNote).toContain('Reviewed stream recording');
    });
  });

  describe('3. Notification System', () => {
    it('GET /api/notifications returns user alerts', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('PATCH /api/notifications/read-all marks all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(check.body.unreadCount).toBe(0);
    });
  });

  describe('4. Platform Audit Trail (Admin View Only)', () => {
    it('GET /api/admin/audit-logs returns recorded system audit entries', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);

      const actionTypes = res.body.items.map((i: any) => i.actionType);
      expect(actionTypes).toContain('REFEREE_VERIFY');
      expect(actionTypes).toContain('DISPUTE_RAISE');
      expect(actionTypes).toContain('DISPUTE_RESOLVE');
    });

    it('Non-admin users cannot access /api/admin/audit-logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
