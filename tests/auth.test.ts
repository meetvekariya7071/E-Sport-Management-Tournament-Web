import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';

describe('Authentication & JWT Security Suite (/api/auth)', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `test_auth_${timestamp}@esports.com`,
    username: `auth_user_${timestamp}`,
    password: 'SecurePassword123!',
    role: 'PLAYER'
  };

  const testOrganizer = {
    email: `org_${timestamp}@esports.com`,
    username: `org_user_${timestamp}`,
    password: 'SecurePassword123!',
    role: 'ORGANIZER'
  };

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUser.email, testOrganizer.email] }
      }
    });
    await prisma.$disconnect();
  });

  it('1. POST /api/auth/register - Should register a new user with hashed password and default role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.username).toBe(testUser.username);
    expect(res.body.data.user.role).toBe('PLAYER');
    expect(res.body.data.user).not.toHaveProperty('password');

    // Verify password is truly hashed in database (Bcrypt format $2a$ or $2b$)
    const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it('2. POST /api/auth/register - Should reject duplicate email or username with 409 Conflict', async () => {
    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error).toContain('already exists');
  });

  it('3. POST /api/auth/register - Should reject invalid payload using Zod runtime validation', async () => {
    const invalidRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        username: 'ab', // too short (< 3)
        password: '123'  // too short (< 6)
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });

  it('4. POST /api/auth/login - Should successfully authenticate and return signed JWT Bearer token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email);

    // Verify JWT integrity
    const token = res.body.data.token;
    const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
    expect(decoded.sub || decoded.id).toBe(res.body.data.user.id);
    expect(decoded.email).toBe(testUser.email);
    expect(decoded.role).toBe('PLAYER');
  });

  it('5. POST /api/auth/login - Should reject incorrect password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid credentials');
  });

  it('6. Role Assignment - Should correctly assign ORGANIZER role during registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testOrganizer);

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ORGANIZER');

    const dbUser = await prisma.user.findUnique({ where: { email: testOrganizer.email } });
    expect(dbUser?.role).toBe('ORGANIZER');
  });

  it('7. GET /api/auth/profile - Should reject request with expired or malformed JWT token', async () => {
    // Generate an already expired JWT token
    const expiredToken = jwt.sign(
      { id: 'fake-id', email: 'expired@esports.com', role: 'PLAYER' },
      ENV.JWT_SECRET,
      { expiresIn: '-10s' }
    );

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
