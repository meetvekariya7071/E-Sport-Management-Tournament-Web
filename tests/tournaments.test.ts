import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Tournament Format & Registration Isolation Test Suite', () => {
  let organizerToken: string;
  let playerToken: string;
  let playerUser: any;
  let gameId: string;
  let soloTournamentId: string;
  let duoTournamentId: string;

  beforeAll(async () => {
    // 1. Get or create a game for testing
    let game = await prisma.game.findFirst({ where: { isTeamBased: true } });
    if (!game) {
      game = await prisma.game.create({
        data: {
          title: `Battle Game ${Date.now()}`,
          slug: `battle-game-${Date.now()}`,
          genre: 'Action',
          platform: 'PC',
          isTeamBased: true,
          minTeamSize: 2,
          maxTeamSize: 4
        }
      });
    }
    gameId = game.id;

    // 2. Login as seeded organizer
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'organizer@esports.com', password: 'PASSWORD123!' });
    organizerToken = orgRes.body.data.token;

    // 3. Register a fresh player
    const pUnique = Date.now();
    const playerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: `tourneyplayer_${pUnique}`,
        email: `tourneyplayer_${pUnique}@esports.com`,
        password: 'Password123!',
        role: 'PLAYER'
      });
    playerToken = playerRes.body.data.token;
    playerUser = playerRes.body.data.user;

    // 4. Create SOLO tournament
    const soloRes = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Solo Cup ${pUnique}`,
        slug: `solo-cup-${pUnique}`,
        gameId,
        format: 'SOLO',
        maxParticipants: 16,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });
    soloTournamentId = soloRes.body.data.id;

    // 5. Create DUO tournament
    const duoRes = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Duo Showdown ${pUnique}`,
        slug: `duo-showdown-${pUnique}`,
        gameId,
        format: 'DUO',
        maxParticipants: 16,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });
    duoTournamentId = duoRes.body.data.id;
  });

  it('1. SOLO Tournament - Should prevent team creation and reject with 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${soloTournamentId}/teams`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        name: 'Illegal Solo Team',
        tag: 'IST'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('solo');
  });

  it('2. SOLO Tournament - Should allow direct solo player registration with IGN prompt', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${soloTournamentId}/register/solo`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ inGameName: 'SoloChampX' });

    expect(res.status).toBe(201);
    expect(res.body.participant.teamId).toBeNull();
    expect(res.body.participant.inGameName).toBe('SoloChampX');
  });

  it('3. DUO Tournament - Should prevent solo registration (requires team formation)', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/register/solo`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ inGameName: 'RogueSolo' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('DUO');
  });

  it('4. DUO Tournament - Should allow captain to create a team and generate 6-char invite code', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        name: `Alpha Duos ${Date.now()}`,
        tag: 'ALPH',
        inGameName: 'CaptainAlpha'
      });

    expect(res.status).toBe(201);
    expect(res.body.team.inviteCode).toBeDefined();
    expect(res.body.team.inviteCode.length).toBeGreaterThanOrEqual(6);
  });

  it('5. DUO Tournament - Should reject joining team with non-existent invite code', async () => {
    const p2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `joinplayer_${Date.now()}`,
        email: `joinplayer_${Date.now()}@esports.com`,
        password: 'Password123!',
        role: 'PLAYER'
      });
    const p2Token = p2Res.body.data.token;

    const res = await request(app)
      .post(`/api/tournaments/${duoTournamentId}/teams/join`)
      .set('Authorization', `Bearer ${p2Token}`)
      .send({
        inviteCode: 'BADCODE9',
        inGameName: 'TeammateBeta'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid team invite code');
  });
});
