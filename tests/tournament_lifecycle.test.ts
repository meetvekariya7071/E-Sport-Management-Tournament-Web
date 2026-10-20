import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { evaluateTournamentLifecycle, validateTournamentDates } from '../src/utils/tournamentLifecycle';

describe('Tournament Lifecycle Architecture & Chronological Date Validation Suite', () => {
  let organizerToken: string;
  let gameId: string;

  beforeAll(async () => {
    // 1. Get or create game
    let game = await prisma.game.findFirst();
    if (!game) {
      game = await prisma.game.create({
        data: {
          title: `Lifecycle Test Game ${Date.now()}`,
          slug: `lifecycle-game-${Date.now()}`,
          genre: 'FPS',
          platform: 'PC',
          isTeamBased: false
        }
      });
    }
    gameId = game.id;

    // 2. Login as demo organizer
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'organizer@esports.com', password: 'PASSWORD123!' });
    organizerToken = orgRes.body.data.token;
  });

  // =========================================================================
  // 1. DYNAMIC LIFECYCLE EVALUATOR UNIT TESTS
  // =========================================================================
  describe('1. Dynamic Lifecycle Status Evaluator Utility', () => {
    const fixedNow = new Date('2026-06-15T12:00:00Z');

    it('Evaluates to UPCOMING when now < registrationStartDate', () => {
      const status = evaluateTournamentLifecycle(
        {
          registrationStartDate: new Date('2026-06-16T00:00:00Z'),
          registrationEndDate: new Date('2026-06-18T00:00:00Z'),
          startDate: new Date('2026-06-19T00:00:00Z'),
          endDate: new Date('2026-06-20T00:00:00Z')
        },
        fixedNow
      );
      expect(status).toBe('UPCOMING');
    });

    it('Evaluates to REGISTRATION_OPEN when now >= registrationStartDate && now <= registrationEndDate', () => {
      const status = evaluateTournamentLifecycle(
        {
          registrationStartDate: new Date('2026-06-14T00:00:00Z'),
          registrationEndDate: new Date('2026-06-16T00:00:00Z'),
          startDate: new Date('2026-06-17T00:00:00Z'),
          endDate: new Date('2026-06-18T00:00:00Z')
        },
        fixedNow
      );
      expect(status).toBe('REGISTRATION_OPEN');
    });

    it('Evaluates to IN_PROGRESS when now > registrationEndDate && now <= endDate', () => {
      const status = evaluateTournamentLifecycle(
        {
          registrationStartDate: new Date('2026-06-10T00:00:00Z'),
          registrationEndDate: new Date('2026-06-14T00:00:00Z'),
          startDate: new Date('2026-06-15T00:00:00Z'),
          endDate: new Date('2026-06-17T00:00:00Z')
        },
        fixedNow
      );
      expect(status).toBe('IN_PROGRESS');
    });

    it('Evaluates to COMPLETED when now > endDate', () => {
      const status = evaluateTournamentLifecycle(
        {
          registrationStartDate: new Date('2026-06-01T00:00:00Z'),
          registrationEndDate: new Date('2026-06-05T00:00:00Z'),
          startDate: new Date('2026-06-06T00:00:00Z'),
          endDate: new Date('2026-06-10T00:00:00Z')
        },
        fixedNow
      );
      expect(status).toBe('COMPLETED');
    });

    it('Evaluates to COMPLETED when status is explicitly COMPLETED regardless of dates', () => {
      const status = evaluateTournamentLifecycle(
        {
          registrationStartDate: new Date('2026-06-20T00:00:00Z'),
          registrationEndDate: new Date('2026-06-25T00:00:00Z'),
          startDate: new Date('2026-06-26T00:00:00Z'),
          endDate: new Date('2026-06-30T00:00:00Z'),
          status: 'COMPLETED'
        },
        fixedNow
      );
      expect(status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // 2. CHRONOLOGICAL DATE VALIDATION IN POST /api/tournaments
  // =========================================================================
  describe('2. Backend Route Chronological Date Validation (POST /api/tournaments)', () => {
    it('Rejects when registrationStartDate >= registrationEndDate (400 Bad Request)', async () => {
      const now = Date.now();
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: `Invalid Reg Dates ${now}`,
          slug: `invalid-reg-${now}`,
          gameId,
          format: 'SOLO',
          maxParticipants: 8,
          registrationStartDate: new Date(now + 86400000 * 3).toISOString(), // 3 days ahead
          registrationEndDate: new Date(now + 86400000 * 2).toISOString(),   // 2 days ahead (EARLIER!)
          startDate: new Date(now + 86400000 * 4).toISOString(),
          endDate: new Date(now + 86400000 * 5).toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Rejects when registrationEndDate > startDate (400 Bad Request)', async () => {
      const now = Date.now();
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: `Invalid Start Date ${now}`,
          slug: `invalid-start-${now}`,
          gameId,
          format: 'SOLO',
          maxParticipants: 8,
          registrationStartDate: new Date(now + 86400000 * 1).toISOString(),
          registrationEndDate: new Date(now + 86400000 * 5).toISOString(), // Reg closes day 5
          startDate: new Date(now + 86400000 * 4).toISOString(),           // Tournament starts day 4 (BEFORE reg ends!)
          endDate: new Date(now + 86400000 * 7).toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Rejects when startDate >= endDate (400 Bad Request)', async () => {
      const now = Date.now();
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: `Invalid End Date ${now}`,
          slug: `invalid-end-${now}`,
          gameId,
          format: 'SOLO',
          maxParticipants: 8,
          registrationStartDate: new Date(now + 86400000 * 1).toISOString(),
          registrationEndDate: new Date(now + 86400000 * 2).toISOString(),
          startDate: new Date(now + 86400000 * 6).toISOString(),
          endDate: new Date(now + 86400000 * 5).toISOString() // End date before start date!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Successfully creates tournament when chronological dates are strictly valid', async () => {
      const now = Date.now();
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: `Valid Chrono Tournament ${now}`,
          slug: `valid-chrono-${now}`,
          gameId,
          format: 'SOLO',
          maxParticipants: 8,
          registrationStartDate: new Date(now + 86400000 * 1).toISOString(),
          registrationEndDate: new Date(now + 86400000 * 2).toISOString(),
          startDate: new Date(now + 86400000 * 3).toISOString(),
          endDate: new Date(now + 86400000 * 4).toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registrationStartDate).toBeDefined();
      expect(res.body.data.registrationEndDate).toBeDefined();
      expect(res.body.data.status).toBe('UPCOMING');
    });
  });

  // =========================================================================
  // 3. PUBLIC CATALOG ENDPOINT INCLUDES DYNAMIC LIFECYCLE
  // =========================================================================
  describe('3. GET /api/tournaments dynamic lifecycle payload', () => {
    it('Returns tournaments with evaluated lifecycleStatus field', async () => {
      const res = await request(app).get('/api/tournaments');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const first = res.body.data[0];
      expect(first.lifecycleStatus).toBeDefined();
      expect(['UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED']).toContain(first.lifecycleStatus);
    });
  });
});
