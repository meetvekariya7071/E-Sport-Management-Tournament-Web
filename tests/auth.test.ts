import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Auth & User Governance Test Suite', () => {
  const uniqueId = Date.now();
  const testUser = {
    username: `testuser_${uniqueId}`,
    email: `testuser_${uniqueId}@esports.com`,
    password: 'Password123!',
    role: 'PLAYER'
  };

  it('1. POST /api/auth/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.role).toBe('PLAYER');
    expect(res.body.data.token).toBeDefined();
  });

  it('2. POST /api/auth/register - Should reject duplicate email or username with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('3. POST /api/auth/register - Should reject passwords shorter than 8 chars via Zod validation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `short_${Date.now()}`,
        email: `short_${Date.now()}@esports.com`,
        password: 'Pass1'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Validation failed');
  });

  it('4. POST /api/auth/login - Should authenticate valid credentials and issue JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe(testUser.username);
  });

  it('5. POST /api/auth/login - Should reject invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('6. GET /api/auth/profile - Should access protected profile with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password
      });

    const token = loginRes.body.data.token;

    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.email).toBe(testUser.email.toLowerCase());
  });

  it('7. GET /api/auth/profile - Should reject request without token with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
