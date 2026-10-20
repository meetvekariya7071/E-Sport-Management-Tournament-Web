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

    it('GET /api/referee/matches/:id returns full Match Control Room details', async () => {
      const res = await request(app)
        .get(`/api/referee/matches/${testMatch.id}`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.id).toBe(testMatch.id);
      expect(Array.isArray(res.body.match.results)).toBe(true);
    });

    it('PATCH /api/referee/matches/:id/checkin toggles match attendance and substitute notes', async () => {
      const res = await request(app)
        .patch(`/api/referee/matches/${testMatch.id}/checkin`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          participantId: testParticipant.id,
          status: 'CHECKED_IN',
          checkinNote: 'Present on LAN seat #4',
          isSubstituteApproved: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.participant.status).toBe('CHECKED_IN');
      expect(res.body.participant.checkinNote).toBe('Present on LAN seat #4');
    });

    it('PATCH /api/referee/matches/:id/status locks roster, starts match, and generates room token', async () => {
      const res = await request(app)
        .patch(`/api/referee/matches/${testMatch.id}/status`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          lockRoster: true,
          status: 'IN_PROGRESS',
          lobbyCredentials: 'Server: US-East-1 | Pass: esports2026'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.status).toBe('IN_PROGRESS');
      expect(res.body.match.roomToken).toBeDefined();
      expect(res.body.match.roomToken).toMatch(/^LOBBY-/);
    });

    it('POST /api/tournaments/:id/assign-referee allows organizer to assign a referee', async () => {
      const res = await request(app)
        .post(`/api/tournaments/${testTournament.id}/assign-referee`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          refereeId: refereeUser.id,
          matchId: testMatch.id
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('assigned');
    });

    it('GET /api/referee/tournaments/:id/database provides referee read-only sub-database access', async () => {
      const res = await request(app)
        .get(`/api/referee/tournaments/${testTournament.id}/database`)
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.id).toBe(testTournament.id);
      expect(Array.isArray(res.body.data.playersTable)).toBe(true);
    });

    it('POST /api/referee/matches/:id/verify-score approves and finalizes scorecard', async () => {
      const res = await request(app)
        .post(`/api/referee/matches/${testMatch.id}/verify-score`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          action: 'APPROVE',
          refereeNote: 'Verified match results. All scores accurate according to tournament rulebook.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.isVerified).toBe(true);
      expect(res.body.match.refereeNote).toContain('All scores accurate');
    });

    it('POST /api/referee/matches/:id/verify-score overrides scores and corrects kills/winner', async () => {
      const res = await request(app)
        .post(`/api/referee/matches/${testMatch.id}/verify-score`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          action: 'OVERRIDE',
          refereeNote: 'Overrode faulty kill count from 3 to 7 based on stream replay.',
          results: [
            {
              participantId: testParticipant.id,
              score: 25,
              kills: 7,
              placement: 1,
              isWinner: true
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match.isVerified).toBe(true);
      expect(res.body.match.refereeNote).toContain('Overrode faulty kill count');
    });

    it('POST /api/referee/players/:id/sanction issues a warning, disqualification, and admin escalation', async () => {
      // 1. Issue Warning
      const warnRes = await request(app)
        .post(`/api/referee/players/${testParticipant.id}/sanction`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          sanctionType: 'WARNING',
          reason: 'Late arrival to lobby stage.',
          tournamentId: testTournament.id,
          matchId: testMatch.id
        });

      expect(warnRes.status).toBe(200);
      expect(warnRes.body.success).toBe(true);
      expect(warnRes.body.participant.warningsCount).toBe(1);

      // 2. Disqualify Match
      const dqRes = await request(app)
        .post(`/api/referee/players/${testParticipant.id}/sanction`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          sanctionType: 'MATCH_DISQUALIFY',
          reason: 'Unauthorized software injection detected in game memory.',
          tournamentId: testTournament.id,
          matchId: testMatch.id
        });

      expect(dqRes.status).toBe(200);
      expect(dqRes.body.success).toBe(true);
      expect(dqRes.body.participant.isMatchDisqualified).toBe(true);
      expect(dqRes.body.participant.status).toBe('DISQUALIFIED');

      // 3. Escalate to Admin
      const escRes = await request(app)
        .post(`/api/referee/players/${testParticipant.id}/sanction`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          sanctionType: 'ESCALATE_ADMIN',
          reason: 'Repeated cheating and toxic behavior. Review for hardware ID ban.',
          tournamentId: testTournament.id,
          matchId: testMatch.id,
          proofUrl: 'https://clips.twitch.tv/testevidence'
        });

      expect(escRes.status).toBe(200);
      expect(escRes.body.success).toBe(true);
      expect(escRes.body.participant.isEscalatedToAdmin).toBe(true);
    });
  });

  describe('2. Match Dispute Ticketing Engine & Referee Queue', () => {
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

    it('GET /api/referee/disputes returns dynamic ticket queue assigned to referee', async () => {
      const res = await request(app)
        .get('/api/referee/disputes')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.disputes)).toBe(true);
      expect(res.body.disputes.some((d: any) => d.id === testDispute.id)).toBe(true);
      const ticket = res.body.disputes.find((d: any) => d.id === testDispute.id);
      expect(ticket.complaining.username).toBe(playerUser.username);
    });

    it('PATCH /api/referee/disputes/:disputeId resolves dispute by upholding with forfeit or dismissing', async () => {
      const res = await request(app)
        .patch(`/api/referee/disputes/${testDispute.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          action: 'UPHOLD',
          actionTaken: 'FORFEIT_AWARDED',
          resolutionNote: 'Reviewed match replay. Infraction confirmed; walkover awarded to complaining player.',
          forfeitWinnerParticipantId: testParticipant.id
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dispute.status).toBe('RESOLVED');
      expect(res.body.dispute.actionTaken).toBe('FORFEIT_AWARDED');
      expect(res.body.dispute.resolutionNote).toContain('walkover awarded');
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
