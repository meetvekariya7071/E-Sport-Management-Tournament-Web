import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';

describe('Referee Verification, Dispute Flow, Notifications & Audit Logs', () => {
  const timestamp = Date.now();
  let testGame: any;
  let adminUser: any;
  let adminToken: string;
  let organizerUser: any;
  let organizerToken: string;
  let refereeUser: any;
  let refereeToken: string;
  let playerUser: any;
  let playerToken: string;

  let testTournament: any;
  let testRound: any;
  let testMatch: any;
  let testParticipant: any;
  let testDisputeId: string;
  let testNotificationId: string;

  beforeAll(async () => {
    // 1. Create Game
    testGame = await prisma.game.create({
      data: {
        title: `Referee Game ${timestamp}`,
        slug: `referee-game-${timestamp}`,
        genre: 'MOBA',
        platform: 'PC'
      }
    });

    // 2. Create Users
    adminUser = await prisma.user.create({
      data: {
        email: `admin_ref_${timestamp}@esports.com`,
        username: `admin_ref_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ADMIN'
      }
    });
    adminToken = jwt.sign(
      { sub: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    organizerUser = await prisma.user.create({
      data: {
        email: `org_ref_${timestamp}@esports.com`,
        username: `org_ref_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ORGANIZER'
      }
    });
    organizerToken = jwt.sign(
      { sub: organizerUser.id, email: organizerUser.email, role: 'ORGANIZER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    refereeUser = await prisma.user.create({
      data: {
        email: `referee_${timestamp}@esports.com`,
        username: `ref_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'REFEREE'
      }
    });
    refereeToken = jwt.sign(
      { sub: refereeUser.id, email: refereeUser.email, role: 'REFEREE' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    playerUser = await prisma.user.create({
      data: {
        email: `player_ref_${timestamp}@esports.com`,
        username: `play_ref_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    playerToken = jwt.sign(
      { sub: playerUser.id, email: playerUser.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Create Tournament
    testTournament = await prisma.tournament.create({
      data: {
        title: `Championship ${timestamp}`,
        slug: `champ-${timestamp}`,
        gameId: testGame.id,
        organizerId: organizerUser.id,
        format: 'SOLO',
        status: 'IN_PROGRESS',
        maxParticipants: 16,
        startDate: new Date(Date.now() + 86400000)
      }
    });

    // 4. Create Participant
    testParticipant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: testTournament.id,
        userId: playerUser.id,
        inGameName: 'ProPlayerX',
        status: 'CHECKED_IN'
      }
    });

    // 5. Create Round and Match assigned to Referee
    testRound = await prisma.matchRound.create({
      data: {
        tournamentId: testTournament.id,
        roundNumber: 1,
        name: 'Quarterfinals',
        stage: 'QUARTERFINALS'
      }
    });

    testMatch = await prisma.match.create({
      data: {
        tournamentId: testTournament.id,
        roundId: testRound.id,
        matchNumber: 1,
        refereeId: refereeUser.id,
        status: 'PENDING'
      }
    });

    // Create ScoreRecord
    await prisma.scoreRecord.create({
      data: {
        tournamentId: testTournament.id,
        roundNumber: 1,
        matchId: testMatch.id,
        participantId: testParticipant.id,
        score: 10,
        kills: 3,
        placement: 1,
        isWinner: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({
      where: {
        actorId: { in: [adminUser?.id, organizerUser?.id, refereeUser?.id, playerUser?.id] }
      }
    });
    await prisma.notification.deleteMany({
      where: {
        userId: { in: [adminUser?.id, organizerUser?.id, refereeUser?.id, playerUser?.id] }
      }
    });
    await prisma.dispute.deleteMany({ where: { tournamentId: testTournament?.id } });
    await prisma.scoreRecord.deleteMany({ where: { matchId: testMatch?.id } });
    await prisma.match.deleteMany({ where: { id: testMatch?.id } });
    await prisma.matchRound.deleteMany({ where: { id: testRound?.id } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: testTournament?.id } });
    await prisma.tournament.deleteMany({ where: { id: testTournament?.id } });
    await prisma.game.deleteMany({ where: { id: testGame?.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser?.id, organizerUser?.id, refereeUser?.id, playerUser?.id] } }
    });
  });

  // =========================================================================
  // 1. REFEREE DASHBOARD & VERIFICATION
  // =========================================================================
  it('GET /api/referee/matches - allows referee to view assigned matches', async () => {
    const res = await request(app)
      .get('/api/referee/matches')
      .set('Authorization', `Bearer ${refereeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((m: any) => m.id === testMatch.id);
    expect(found).toBeDefined();
    expect(found.refereeId).toBe(refereeUser.id);
  });

  it('PATCH /api/referee/matches/:id/verify - referee officially validates scorecard', async () => {
    const res = await request(app)
      .patch(`/api/referee/matches/${testMatch.id}/verify`)
      .set('Authorization', `Bearer ${refereeToken}`)
      .send({ notes: 'Validated final score with official replay footage.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isVerified).toBe(true);
    expect(res.body.data.verifiedById).toBe(refereeUser.id);
  });

  it('PATCH /api/referee/participants/:id/status - referee marks participant attendance', async () => {
    const res = await request(app)
      .patch(`/api/referee/participants/${testParticipant.id}/status`)
      .set('Authorization', `Bearer ${refereeToken}`)
      .send({ status: 'PRESENT' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PRESENT');
  });

  // =========================================================================
  // 2. DISPUTE TICKETING FLOW
  // =========================================================================
  it('POST /api/tournaments/:id/disputes - player raises a match dispute', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${testTournament.id}/disputes`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        matchId: testMatch.id,
        reason: 'INCORRECT_SCORE',
        description: 'Enemy reported 15 kills but spectator stream recorded only 10 kills.',
        proofUrl: 'https://clips.twitch.tv/example_dispute_clip'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.reason).toBe('INCORRECT_SCORE');
    testDisputeId = res.body.data.id;
  });

  it('GET /api/tournaments/:id/disputes - organizer/referee retrieves scoped disputes', async () => {
    const res = await request(app)
      .get(`/api/tournaments/${testTournament.id}/disputes`)
      .set('Authorization', `Bearer ${refereeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(testDisputeId);
  });

  it('PATCH /api/disputes/:disputeId/resolve - referee resolves dispute & overwrites score', async () => {
    const res = await request(app)
      .patch(`/api/disputes/${testDisputeId}/resolve`)
      .set('Authorization', `Bearer ${refereeToken}`)
      .send({
        action: 'ACCEPT_OVERWRITE',
        resolutionNotes: 'Evidence verified via match stream. Overwriting score.',
        scoreAdjustments: [
          {
            participantId: testParticipant.id,
            score: 8,
            kills: 2,
            placement: 1,
            isWinner: true
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedById).toBe(refereeUser.id);
  });

  // =========================================================================
  // 3. IN-APP NOTIFICATIONS
  // =========================================================================
  it('GET /api/notifications - player receives automated notification on dispute resolution', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
    testNotificationId = res.body.notifications[0].id;
  });

  it('PATCH /api/notifications/:id/read - player marks notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${testNotificationId}/read`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // =========================================================================
  // 4. PLATFORM AUDIT TRAIL (ADMIN ONLY)
  // =========================================================================
  it('GET /api/admin/audit-logs - admin inspects system audit trail with actor & entity context', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.pagination).toBeDefined();

    // Verify presence of REFEREE_VERIFIED or DISPUTE_RESOLVED action
    const actions = res.body.logs.map((l: any) => l.action);
    expect(actions).toContain('REFEREE_VERIFIED');
  });

  it('GET /api/admin/audit-logs - forbids non-admins from viewing audit logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(403);
  });
});
