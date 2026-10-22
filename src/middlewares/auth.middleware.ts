import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { Role, Roles, AuthUserPayload } from '../types';

interface DecodedToken {
  sub?: string;
  id?: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

/**
 * Authentication Middleware:
 * Validates Bearer JWT, fetches current user status from database,
 * and rejects immediately if account is banned or non-existent.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed Bearer authorization token.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: DecodedToken;

    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET) as DecodedToken;
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Token is invalid or expired.'
      });
      return;
    }

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token payload.'
      });
      return;
    }

    // Verify user in DB to ensure real-time ban enforcement
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User account has been removed.'
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Account has been suspended by an administrator.'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as Role,
      isBanned: user.isBanned
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Authentication error: ' + error.message
    });
  }
};

/**
 * Role-Based Access Control Guard:
 * Strictly matches user role against allowed roles list.
 */
export const authorizeRoles = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] roles. Your current role is '${req.user.role}'.`
      });
      return;
    }

    next();
  };
};

/**
 * Tournament Scope Ownership Guard:
 * Guarantees that an ORGANIZER can only modify or moderate their own tournaments.
 * Platform ADMIN automatically bypasses ownership verification.
 */
export const verifyTournamentOwnerOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    // Admins bypass ownership restrictions
    if (user.role === Roles.ADMIN) {
      return next();
    }

    const tournamentId = req.params.tournamentId || req.params.id;
    if (!tournamentId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request: Missing tournament ID in URL parameters.'
      });
      return;
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true }
    });

    if (!tournament) {
      res.status(404).json({
        success: false,
        error: 'Tournament not found.'
      });
      return;
    }

    if (tournament.organizerId !== user.id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to manage this tournament.'
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Scope verification failed: ' + error.message
    });
  }
};

export const authenticateToken = authenticate;
