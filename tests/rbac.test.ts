import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';

describe('Role-Based Access Control (RBAC) & Ownership Security Suite', () => {
  const timestamp = Date.now();
  let adminUser: any;
  let adminToken: string;
  let organizer1: any;
  let organizer1Token: string;
  let organizer2: any;
  let organizer2Token: string;
  let playerUser: any;
  let playerToken: string;

  let testGame: any;
  let tournament1Id: string;

  beforeAll(async () => {
    // 1. Create Users
    adminUser = await prisma.user.create({
      data: {
        email: `rbac_admin_${timestamp}@esports.com`,
        username: `rbac_admin_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ADMIN'
      }
    });
    adminToken = jwt.sign(
      { sub: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    organizer1 = await prisma.user.create({
      data: {
        email: `rbac_org1_${timestamp}@esports.com`,
        username: `rbac_org1_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ORGANIZER'
      }
    });
    organizer1Token = jwt.sign(
      { sub: organizer1.id, email: organizer1.email, role: 'ORGANIZER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    organizer2 = await prisma.user.create({
      data: {
        email: `rbac_org2_${timestamp}@esports.com`,
        username: `rbac_org2_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'ORGANIZER'
      }
    });
    organizer2Token = jwt.sign(
      { sub: organizer2.id, email: organizer2.email, role: 'ORGANIZER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    playerUser = await prisma.user.create({
      data: {
        email: `rbac_player_${timestamp}@esports.com`,
        username: `rbac_player_${timestamp}`,
        passwordHash: '$2b$10$hashedpasswordforexampletests1234567890',
        role: 'PLAYER'
      }
    });
    playerToken = jwt.sign(
      { sub: playerUser.id, email: playerUser.email, role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Create Test Game
    testGame = await prisma.game.create({
      data: {
        title: `RBAC Test Game ${timestamp}`,
        slug: `rbac-game-${timestamp}`,
        genre: 'MOBA',
        minTeamSize: 1,
        maxTeamSize: 5,
        isTeamBased: false
      }
    });

    // 3. Organizer 1 creates Tournament 1
    const tourneyRes = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizer1Token}`)
      .send({
        title: `Organizer 1 Cup ${timestamp}`,
        slug: `org1-cup-${timestamp}`,
        gameId: testGame.id,
        format: 'SOLO',
        maxParticipants: 8,
        startDate: new Date(Date.now() + 86400000).toISOString()
      });
    tournament1Id = tourneyRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup
    if (tournament1Id) {
      await prisma.tournament.delete({ where: { id: tournament1Id } }).catch(() => {});
    }
    if (testGame?.id) {
      await prisma.game.delete({ where: { id: testGame.id } }).catch(() => {});
    }
    const userIds = [adminUser?.id, organizer1?.id, organizer2?.id, playerUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Game Governance RBAC - Non-admin (PLAYER) cannot delete games', async () => {
    const res = await request(app)
      .delete(`/api/games/${testGame.id}`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  it('2. Game Governance RBAC - Non-admin (ORGANIZER) cannot delete games', async () => {
    const res = await request(app)
      .delete(`/api/games/${testGame.id}`)
      .set('Authorization', `Bearer ${organizer1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  it('3. User Moderation RBAC - Non-admin cannot ban users', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${playerUser.id}/status`)
      .set('Authorization', `Bearer ${organizer1Token}`)
      .send({ isBanned: true, banReason: 'Attempted unauthorized moderation' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. User Moderation RBAC - ADMIN can successfully ban and unban users', async () => {
    const banRes = await request(app)
      .patch(`/api/admin/users/${playerUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBanned: true, banReason: 'Rule infraction' });

    expect(banRes.status).toBe(200);
    expect(banRes.body.data.isBanned).toBe(true);

    // Revoke ban
    const unbanRes = await request(app)
      .patch(`/api/admin/users/${playerUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBanned: false });

    expect(unbanRes.status).toBe(200);
    expect(unbanRes.body.data.isBanned).toBe(false);
  });

  it('5. Tournament Scope Ownership - Foreign Organizer (Organizer 2) CANNOT generate bracket for Organizer 1 tournament', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournament1Id}/generate-bracket`)
      .set('Authorization', `Bearer ${organizer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('You do not have permission to manage this tournament');
  });

  it('6. Tournament Scope Ownership - Tournament Owner (Organizer 1) CAN access bracket operations', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournament1Id}/generate-bracket`)
      .set('Authorization', `Bearer ${organizer1Token}`);

    // If no participants, it returns 400 Bad Request, NOT 403 Forbidden!
    // This proves ownership verification passed.
    expect(res.status).not.toBe(403);
  });

  it('7. Tournament Scope Ownership - ADMIN bypasses tournament ownership guard', async () => {
    const res = await request(app)
      .post(`/api/tournaments/${tournament1Id}/generate-bracket`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Admin bypasses ownership check (does not get 403)
    expect(res.status).not.toBe(403);
  });

  it('8. Game Governance RBAC - ADMIN can successfully delete games', async () => {
    const tempGame = await prisma.game.create({
      data: {
        title: `Temp Game for Deletion ${timestamp}`,
        slug: `temp-del-${timestamp}`,
        genre: 'RACING'
      }
    });

    const res = await request(app)
      .delete(`/api/games/${tempGame.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await prisma.game.findUnique({ where: { id: tempGame.id } });
    expect(check).toBeNull();
  });
});
