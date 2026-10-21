import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';

describe('Tournament Isolation, Format Rules & Roster Limits Suite', () => {
  const timestamp = Date.now();
  let testGame: any;
  let organizerUser: any;
  let organizerToken: string;
  let player1: any;
  let player1Token: string;
  let player2: any;
  let player2Token: string;
  let player3: any;
  let player3Token: string;

  let soloTournamentId: string;
  let duoTournamentId: string;
  let duoTeamInviteCode: string;

  beforeAll(async () => {
    // 1. Create a test Game
    testGame = await prisma.game.create({
      data: {
        title: `Test Tactical Game ${timestamp}`,
        slug: `test-tactical-${timestamp}`,
        genre: 'FPS',
        minTeamSize: 1,
        maxTeamSize: 5,
        isTeamBased: true
      }
    });

    // 2. Create Users
    organizerUser = await prisma.user.create({
      data: {
        email: `org_tourney_${timestamp}@esports.com`,
        username: `org_tourney_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ORGANIZER'
      }
    });
    organizerToken = jwt.sign(
      { sub: organizerUser.id, email: organizerUser.email, role: 'ORGANIZER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    player1 = await prisma.user.create({
      data: {
        email: `p1_${timestamp}@esports.com`,
        username: `p1_user_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    player1Token = jwt.sign(
      { sub: player1.id, email: player1.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    player2 = await prisma.user.create({
      data: {
        email: `p2_${timestamp}@esports.com`,
        username: `p2_user_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    player2Token = jwt.sign(
      { sub: player2.id, email: player2.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    player3 = await prisma.user.create({
      data: {
        email: `p3_${timestamp}@esports.com`,
        username: `p3_user_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    player3Token = jwt.sign(
      { sub: player3.id, email: player3.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cascade cleanup
    if (soloTournamentId) {
      await prisma.tournament.delete({ where: { id: soloTournamentId } }).catch(() => {});
    }
    if (duoTournamentId) {
      await prisma.tournament.delete({ where: { id: duoTournamentId } }).catch(() => {});
    }
    if (testGame?.id) {
      await prisma.game.delete({ where: { id: testGame.id } }).catch(() => {});
    }
    const userIds = [organizerUser?.id, player1?.id, player2?.id, player3?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Create SOLO Tournament - Should initialize tournament with SOLO format', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Solo Championship ${timestamp}`,
        slug: `solo-championship-${timestamp}`,
        gameId: testGame.id,
        format: 'SOLO',
        maxParticipants: 16,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.format).toBe('SOLO');
    soloTournamentId = res.body.data.id;
  });

  it('2. SOLO Format Constraint - Should PREVENT team creation in a SOLO tournament', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${soloTournamentId}/teams`)
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        name: 'Illegal Solo Team',
        tag: 'IST'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('SOLO format tournaments do not support team creation');
  });

  it('3. Solo Player Registration - Should successfully register solo player without team', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${soloTournamentId}/register/solo`)
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        inGameName: 'LoneWolf_Pro'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.participant.status).toBe('REGISTERED');
    expect(res.body.participant.teamId).toBeNull();
  });

  it('4. Create DUO Tournament - Should initialize tournament with DUO format', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Duo Apex Showdown ${timestamp}`,
        slug: `duo-apex-${timestamp}`,
        gameId: testGame.id,
        format: 'DUO',
        maxParticipants: 8,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.format).toBe('DUO');
    duoTournamentId = res.body.data.id;
  });

  it('5. Team Formation - Should create team and generate 6-character alphanumeric invite code', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams`)
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        name: 'Apex Predators',
        tag: 'APEX',
        inGameName: 'Captain_Apex'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.team).toHaveProperty('inviteCode');
    expect(res.body.team.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    duoTeamInviteCode = res.body.team.inviteCode;
  });

  it('6. Team Join - Should reject join attempt with invalid invite code', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams/join`)
      .set('Authorization', `Bearer ${player2Token}`)
      .send({
        inviteCode: 'BAD999',
        inGameName: 'PlayerTwo'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid team invite code');
  });

  it('7. Team Join - Teammate should successfully join using valid invite code (Roster 2/2)', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams/join`)
      .set('Authorization', `Bearer ${player2Token}`)
      .send({
        inviteCode: duoTeamInviteCode,
        inGameName: 'Partner_In_Crime'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.team.currentMembers).toBe(2);
  });

  it('8. DUO Roster Limit Enforcement - Should reject 3rd member join because DUO capacity is 2', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams/join`)
      .set('Authorization', `Bearer ${player3Token}`)
      .send({
        inviteCode: duoTeamInviteCode,
        inGameName: 'ThirdWheel'
      });

    expect([400, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error.toLowerCase()).toMatch(/capacity|full/);
  });
});
