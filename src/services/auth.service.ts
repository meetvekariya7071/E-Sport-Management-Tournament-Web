import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { Role, Roles } from '../types';

export class AuthService {
  /**
   * Registers a new user with hashed password and role assignment.
   */
  static async registerUser(data: {
    email: string;
    username: string;
    password: string;
    role?: Role;
    bio?: string;
  }) {
    const { email, username, password, role = Roles.PLAYER, bio } = data;

    // Check email collision
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error('CONFLICT: An account with this email address already exists.');
    }

    // Check username collision
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new Error('CONFLICT: The username is already taken.');
    }

    // Validate role
    if (!Object.values(Roles).includes(role)) {
      throw new Error(`BAD_REQUEST: Invalid role specified. Must be one of: ${Object.values(Roles).join(', ')}`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
        bio: bio || null
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        createdAt: true
      }
    });

    const token = jwt.sign(
      { sub: newUser.id, email: newUser.email, role: newUser.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return { user: newUser, token };
  }

  /**
   * Authenticates user credentials and generates JWT token.
   */
  static async loginUser(credentials: { emailOrUsername: string; password: string }) {
    const { emailOrUsername, password } = credentials;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }]
      }
    });

    if (!user) {
      throw new Error('UNAUTHORIZED: Invalid credentials.');
    }

    if (user.isBanned) {
      throw new Error(`FORBIDDEN: This account has been banned. Reason: ${user.banReason || 'Administrative suspension'}`);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('UNAUTHORIZED: Invalid credentials.');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt
      },
      token
    };
  }
}
