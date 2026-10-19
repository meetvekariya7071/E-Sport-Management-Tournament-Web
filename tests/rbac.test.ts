import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Role-Based Access Control (RBAC) & Scoped Ownership Test Suite', () => {
  let adminToken: string;
  let organizerToken: string;
  let otherOrganizerToken: string;
  let playerToken: string;
  let testGameId: string;
  let organizerTournamentId: string;

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'admin@esports.com', password: 'PASSWORD123!' });
    adminToken = adminRes.body.data.token;

    // 2. Login Organizer
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'organizer@esports.com', password: 'PASSWORD123!' });
    organizerToken = orgRes.body.data.token;

    // 3. Register a second organizer
    const org2Unique = Date.now();
    const org2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `org2_${org2Unique}`,
        email: `org2_${org2Unique}@esports.com`,
        password: 'Password123!',
        role: 'ORGANIZER'
      });
    otherOrganizerToken = org2Res.body.data.token;

    // 4. Register a Player
    const playerUnique = Date.now();
    const playerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: `rbacplayer_${playerUnique}`,
        email: `rbacplayer_${playerUnique}@esports.com`,
        password: 'Password123!',
        role: 'PLAYER'
      });
    playerToken = playerRes.body.data.token;

    // 5. Admin creates a game
    const game = await prisma.game.create({
      data: {
        title: `RBAC Game ${Date.now()}`,
        slug: `rbac-game-${Date.now()}`,
        genre: 'Strategy',
        platform: 'PC',
        isTeamBased: false
      }
    });
    testGameId = game.id;

    // 6. Organizer 1 creates a tournament
    const tourneyRes = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Scoped Tournament ${Date.now()}`,
        slug: `scoped-tourney-${Date.now()}`,
        gameId: testGameId,
        format: 'SOLO',
        maxParticipants: 8,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });
    organizerTournamentId = tourneyRes.body.data.id;
  });

  it('1. RBAC - Regular player cannot create or delete master games (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/admin/games/${testGameId}`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('2. RBAC - Organizer cannot access admin governance or ban users (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/fake-user-id/ban`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ isBanned: true, reason: 'Unauthorized ban test' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Ownership Isolation - Organizer 2 cannot edit or update Organizer 1 tournament (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/organizer/tournaments/${organizerTournamentId}`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`)
      .send({ title: 'Hijacked Tournament Name' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Ownership Isolation - Organizer 2 cannot delete Organizer 1 tournament (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/organizer/tournaments/${organizerTournamentId}`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('5. RBAC - Platform Admin has super-admin rights to inspect any tournament sub-database', async () => {
    const res = await request(app)
      .get(`/api/admin/tournaments/${organizerTournamentId}/inspect`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overview.id).toBe(organizerTournamentId);
  });
});
