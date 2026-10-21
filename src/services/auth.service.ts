import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { Role, Roles } from '../types';
import { emailService } from './email.service';

export class AuthService {
  // Track timestamp of last OTP sent per email for the 60-second cooldown rate limit
  private static lastOtpSentMap = new Map<string, number>();

  /**
   * Generates a cryptographically secure 6-digit numerical OTP.
   */
  private static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generates a secure random 32-byte token (hex format).
   */
  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a token or OTP using SHA-256 for secure database storage.
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Registers a new user with hashed password, isEmailVerified=false, and dispatches 6-digit verification OTP.
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

    // Generate 6-digit numerical OTP (valid for 10 minutes)
    const rawOtp = this.generateOtp();
    const hashedVerificationToken = this.hashToken(rawOtp);
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
        bio: bio || null,
        isEmailVerified: false,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: verificationExpires
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    // Record OTP dispatch timestamp for cooldown tracking
    this.lastOtpSentMap.set(newUser.email.toLowerCase(), Date.now());

    // In development mode, log OTP clearly in the backend console
    console.log(`\n======================================================`);
    console.log(`[DEV ONLY] OTP for ${newUser.email} is: ${rawOtp}`);
    console.log(`======================================================\n`);

    // Dispatch verification OTP email
    emailService
      .sendOtpEmail(newUser.email, rawOtp, newUser.username)
      .catch((err) => console.error('[AuthService.registerUser] Email delivery failure:', err));

    const token = jwt.sign(
      { sub: newUser.id, email: newUser.email, role: newUser.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      user: newUser,
      token,
      message: 'Account registered. 6-digit verification code has been dispatched to your email.'
    };
  }


  /**
   * Verifies a user's email address using the received token.
   */
  static async verifyEmail(token: string) {
    if (!token) {
      throw new Error('BAD_REQUEST: Verification token is required.');
    }

    const hashedToken = this.hashToken(token);

    // Look for user matching either hashed token or raw token with unexpired timestamp
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { emailVerificationToken: hashedToken },
          { emailVerificationToken: token }
        ],
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('BAD_REQUEST: Invalid or expired verification token. Please request a new verification email.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    return {
      success: true,
      email: user.email,
      message: 'Email successfully verified. Your LeagueForge account is now fully active.'
    };
  }

  /**
   * Resends verification email to an unverified user.
   */
  static async resendVerification(email: string) {
    if (!email) {
      throw new Error('BAD_REQUEST: Email is required.');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success response for privacy / anti-enumeration
    if (!user || user.isEmailVerified) {
      return {
        success: true,
        message: 'If an unverified account with this email exists, a verification link has been sent.'
      };
    }

    const rawToken = this.generateToken();
    const hashedToken = this.hashToken(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: expires
      }
    });

    emailService
      .sendVerificationEmail(user.email, user.username, rawToken)
      .catch((err) => console.error('[AuthService.resendVerification] Email delivery failure:', err));

    return {
      success: true,
      message: 'If an unverified account with this email exists, a verification link has been sent.'
    };
  }

  /**
   * Resends a fresh 6-digit OTP with a strict 60-second cooldown rate limit.
   */
  static async resendOtp(email: string) {
    if (!email) {
      throw new Error('BAD_REQUEST: Email is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate Limit / Cooldown Guard: Check if requested less than 60 seconds ago
    const lastSent = this.lastOtpSentMap.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < 60000) {
      throw new Error('TOO_MANY_REQUESTS: Please wait 60 seconds before requesting a new OTP.');
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Return generic success for privacy if user doesn't exist
    if (!user) {
      return {
        success: true,
        message: 'A fresh verification code has been dispatched to your email.'
      };
    }

    if (user.isEmailVerified) {
      return {
        success: true,
        message: 'This account email is already verified. You may proceed to login.'
      };
    }

    // Generate fresh 6-digit numerical OTP (valid for 10 minutes)
    const rawOtp = this.generateOtp();
    const hashedOtp = this.hashToken(rawOtp);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedOtp,
        emailVerificationExpires: expires
      }
    });

    // Update cooldown timestamp
    this.lastOtpSentMap.set(normalizedEmail, Date.now());

    // In development mode, log OTP clearly in the backend console
    console.log(`\n======================================================`);
    console.log(`[DEV ONLY] OTP for ${user.email} is: ${rawOtp}`);
    console.log(`======================================================\n`);

    emailService
      .sendOtpEmail(user.email, rawOtp, user.username)
      .catch((err) => console.error('[AuthService.resendOtp] Email delivery failure:', err));

    return {
      success: true,
      message: 'A fresh verification code has been dispatched to your email.'
    };
  }

  /**
   * Validates a 6-digit numerical OTP and issues a fresh JWT session.
   */
  static async verifyOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new Error('BAD_REQUEST: Email and 6-digit OTP are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      throw new Error('BAD_REQUEST: Invalid verification code or email address.');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      return {
        success: true,
        message: 'Email is already verified. Logging you in...',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            bio: user.bio,
            isEmailVerified: true,
            createdAt: user.createdAt
          },
          token
        }
      };
    }

    const hashedOtp = this.hashToken(trimmedOtp);

    // Validate OTP match and expiry
    const isValidToken =
      (user.emailVerificationToken === hashedOtp || user.emailVerificationToken === trimmedOtp) &&
      user.emailVerificationExpires &&
      user.emailVerificationExpires > new Date();

    if (!isValidToken) {
      throw new Error('BAD_REQUEST: Invalid or expired verification code. Please request a new OTP.');
    }

    // Set verified and clear token fields
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    // Clear cooldown tracking on successful verification
    this.lastOtpSentMap.delete(normalizedEmail);

    const token = jwt.sign(
      { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      success: true,
      message: 'Email successfully verified. Welcome to LeagueForge!',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          role: updatedUser.role,
          bio: updatedUser.bio,
          isEmailVerified: true,
          createdAt: updatedUser.createdAt
        },
        token
      }
    };
  }

  /**
   * Initiates forgot password flow: generates 6-digit OTP and sends reset email.
   */
  static async forgotPassword(email: string) {
    if (!email) {
      throw new Error('BAD_REQUEST: Email is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Prevent user enumeration attacks: return generic success even if user not found
    if (!user) {
      return {
        success: true,
        message: 'If an account with that email exists, a 6-digit verification code has been dispatched.'
      };
    }

    // Generate 6-digit numerical OTP (valid for 10 minutes)
    const rawOtp = this.generateOtp();
    const hashedOtp = this.hashToken(rawOtp);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedOtp,
        passwordResetExpires: expires
      }
    });

    console.log(`\n======================================================`);
    console.log(`[DEV ONLY] Password Reset OTP for ${user.email} is: ${rawOtp}`);
    console.log(`======================================================\n`);

    emailService
      .sendPasswordResetOtpEmail(user.email, user.username, rawOtp)
      .catch((err) => console.error('[AuthService.forgotPassword] Email delivery failure:', err));

    return {
      success: true,
      message: 'A 6-digit password reset verification code has been dispatched to your email address.'
    };
  }

  /**
   * Verifies 6-digit OTP code before setting new password.
   */
  static async verifyResetOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new Error('BAD_REQUEST: Email and 6-digit verification code are required.');
    }

    const trimmedCode = otp.trim();
    const hashedToken = this.hashToken(trimmedCode);

    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        OR: [
          { passwordResetToken: hashedToken },
          { passwordResetToken: trimmedCode }
        ],
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('BAD_REQUEST: Invalid or expired verification code. Please check the code or request a new one.');
    }

    return {
      success: true,
      message: 'Verification code verified successfully. Please set your new password.'
    };
  }

  /**
   * Resets password using valid, unexpired OTP or reset token.
   */
  static async resetPassword(tokenOrOtp: string, newPassword: string, email?: string) {
    if (!tokenOrOtp || !newPassword) {
      throw new Error('BAD_REQUEST: Verification code (OTP) and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('BAD_REQUEST: Password must be at least 8 characters long.');
    }

    const trimmedCode = tokenOrOtp.trim();
    const hashedToken = this.hashToken(trimmedCode);

    const whereClause: any = {
      OR: [
        { passwordResetToken: hashedToken },
        { passwordResetToken: trimmedCode }
      ],
      passwordResetExpires: { gt: new Date() }
    };

    if (email) {
      whereClause.email = email.trim().toLowerCase();
    }

    const user = await prisma.user.findFirst({
      where: whereClause
    });

    if (!user) {
      throw new Error('BAD_REQUEST: Invalid or expired verification code. Please request a new code.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return {
      success: true,
      message: 'Password has been successfully updated. You may now log in with your new password.'
    };
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

    // Demo accounts guard: ensure demo accounts bypass verification and always have isEmailVerified: true
    const demoEmails = [
      'admin@esports.com',
      'organizer@esports.com',
      'player1@esports.com',
      'player2@esports.com',
      'referee@esports.com',
      'ref1@esports.com'
    ];
    const isDemoUser = demoEmails.includes(user.email.toLowerCase());
    const isEmailVerified = isDemoUser ? true : user.isEmailVerified;

    if (isDemoUser && !user.isEmailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      }).catch((err) => console.error('[AuthService.loginUser] Demo verification update failed:', err));
    }

    if (!isEmailVerified) {
      // Auto-generate fresh 6-digit verification code and dispatch to inbox
      const otp = this.generateOtp();
      const hashedOtp = this.hashToken(otp);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: hashedOtp,
          emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      emailService.sendVerificationEmail(user.email, user.username, otp).catch((err) =>
        console.error('[AuthService.loginUser] Automatic OTP resend failed:', err)
      );

      const verificationError: any = new Error(
        "Your email address has not been verified yet. Please enter the 6-digit confirmation code sent to your inbox to activate your account."
      );
      verificationError.requiresVerification = true;
      verificationError.email = user.email;
      throw verificationError;
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
        isEmailVerified,
        createdAt: user.createdAt
      },
      token
    };
  }

  /**
   * Scenario A: Allows users with unverified accounts to fix typos in their registered email.
   * Generates a fresh 6-digit OTP and dispatches it to the new address.
   */
  static async updateUnverifiedEmail(oldEmail: string, newEmail: string) {
    if (!oldEmail || !newEmail) {
      throw new Error('BAD_REQUEST: Current email and new email address are required.');
    }

    const normOldEmail = oldEmail.trim().toLowerCase();
    const normNewEmail = newEmail.trim().toLowerCase();

    if (normOldEmail === normNewEmail) {
      throw new Error('BAD_REQUEST: New email address cannot be identical to current email.');
    }

    const user = await prisma.user.findUnique({ where: { email: normOldEmail } });

    if (!user) {
      throw new Error('NOT_FOUND: No account found registered under the specified email address.');
    }

    if (user.isEmailVerified) {
      throw new Error('BAD_REQUEST: This account is already verified. Please change your email via Account Settings.');
    }

    // Check if new email is already taken
    const existing = await prisma.user.findUnique({ where: { email: normNewEmail } });
    if (existing) {
      throw new Error('CONFLICT: An account with this new email address already exists.');
    }

    // Generate fresh 6-digit OTP (10 minutes validity)
    const rawOtp = this.generateOtp();
    const hashedOtp = this.hashToken(rawOtp);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normNewEmail,
        emailVerificationToken: hashedOtp,
        emailVerificationExpires: expires
      }
    });

    // Reset cooldown for the new email
    this.lastOtpSentMap.delete(normOldEmail);
    this.lastOtpSentMap.set(normNewEmail, Date.now());

    // In dev mode, log OTP clearly
    console.log(`\n======================================================`);
    console.log(`[DEV ONLY] Updated unverified email for ${user.username} to: ${normNewEmail}`);
    console.log(`[DEV ONLY] OTP for ${normNewEmail} is: ${rawOtp}`);
    console.log(`======================================================\n`);

    emailService
      .sendOtpEmail(normNewEmail, rawOtp, updatedUser.username)
      .catch((err) => console.error('[AuthService.updateUnverifiedEmail] Email delivery failure:', err));

    return {
      success: true,
      message: 'Email address updated successfully. A fresh verification code has been dispatched.',
      newEmail: normNewEmail
    };
  }

  /**
   * Scenario B (Step 1): Requests an email change for an authenticated user.
   * Requires password confirmation and sends a 6-digit OTP to the new email.
   */
  static async requestEmailChange(userId: string, newEmail: string, currentPassword: string) {
    if (!userId || !newEmail || !currentPassword) {
      throw new Error('BAD_REQUEST: New email and current password are required.');
    }

    const normNewEmail = newEmail.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('NOT_FOUND: User not found.');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('UNAUTHORIZED: Incorrect current password.');
    }

    if (normNewEmail === user.email.toLowerCase()) {
      throw new Error('BAD_REQUEST: New email address cannot be the same as your current email.');
    }

    // Check collision with another user
    const existing = await prisma.user.findUnique({ where: { email: normNewEmail } });
    if (existing && existing.id !== user.id) {
      throw new Error('CONFLICT: This email address is already in use by another account.');
    }

    // Generate 6-digit OTP (10 minutes validity)
    const rawOtp = this.generateOtp();
    const hashedOtp = this.hashToken(rawOtp);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: normNewEmail,
        emailChangeToken: hashedOtp,
        emailChangeExpires: expires
      }
    });

    console.log(`\n======================================================`);
    console.log(`[DEV ONLY] Email Change OTP for ${normNewEmail} is: ${rawOtp}`);
    console.log(`======================================================\n`);

    emailService
      .sendEmailChangeOtpEmail(normNewEmail, user.username, rawOtp)
      .catch((err) => console.error('[AuthService.requestEmailChange] Email delivery failure:', err));

    return {
      success: true,
      message: `A verification code has been dispatched to ${normNewEmail}.`
    };
  }

  /**
   * Scenario B (Step 2): Confirms the email change with the 6-digit OTP and issues a fresh session.
   */
  static async confirmEmailChange(userId: string, otp: string) {
    if (!userId || !otp) {
      throw new Error('BAD_REQUEST: User ID and 6-digit verification code are required.');
    }

    const trimmedOtp = otp.trim();
    const hashedOtp = this.hashToken(trimmedOtp);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('NOT_FOUND: User not found.');
    }

    if (!user.pendingEmail || !user.emailChangeToken || !user.emailChangeExpires) {
      throw new Error('BAD_REQUEST: No pending email change request found. Please submit a new request.');
    }

    if (user.emailChangeExpires <= new Date()) {
      throw new Error('BAD_REQUEST: The verification code has expired. Please request a new email change.');
    }

    const isTokenValid =
      user.emailChangeToken === hashedOtp || user.emailChangeToken === trimmedOtp;

    if (!isTokenValid) {
      throw new Error('BAD_REQUEST: Invalid verification code. Please check the code and try again.');
    }

    // Defensive check for email collision
    const existing = await prisma.user.findUnique({ where: { email: user.pendingEmail } });
    if (existing && existing.id !== user.id) {
      throw new Error('CONFLICT: This email address is already in use by another account.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        isEmailVerified: true,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpires: null
      }
    });

    const token = jwt.sign(
      { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      success: true,
      message: 'Email address successfully updated.',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          role: updatedUser.role,
          bio: updatedUser.bio,
          isEmailVerified: true,
          createdAt: updatedUser.createdAt
        },
        token
      }
    };
  }

  /**
   * Permanently deletes a user account with comprehensive relational safe-handling.
   */
  static async deleteAccount(userId: string, password: string) {
    if (!userId || !password) {
      throw new Error('BAD_REQUEST: Current password is required to delete your account.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizedTournaments: {
          where: {
            status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] }
          }
        }
      }
    });

    if (!user) {
      throw new Error('NOT_FOUND: User account not found.');
    }

    // Demo admin safeguard
    if (user.email.toLowerCase() === 'admin@esports.com') {
      throw new Error('FORBIDDEN: Demo administrator account cannot be deleted.');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('UNAUTHORIZED: Invalid password. Account deletion requires correct password authentication.');
    }

    // Check for active tournament involvements if Organizer
    if (user.organizedTournaments && user.organizedTournaments.length > 0) {
      throw new Error('BAD_REQUEST: You cannot delete your account while hosting active or ongoing tournaments. Please conclude or cancel them first.');
    }

    // Relational Integrity Safe-Handling in a Prisma Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Disconnect referee foreign keys on matches
      await tx.match.updateMany({
        where: { refereeId: userId },
        data: { refereeId: null }
      });
      await tx.match.updateMany({
        where: { verifiedById: userId },
        data: { verifiedById: null }
      });

      // 2. Disconnect dispute resolutions
      await tx.dispute.updateMany({
        where: { resolvedById: userId },
        data: { resolvedById: null }
      });

      // 3. Disconnect created games
      await tx.game.updateMany({
        where: { createdById: userId },
        data: { createdById: null }
      });

      // 4. Disconnect audit logs
      await tx.auditLog.updateMany({
        where: { actorId: userId },
        data: { actorId: null }
      });

      // 5. Handle Captained Teams (Team.captain has onDelete: Restrict)
      const captainTeams = await tx.team.findMany({
        where: { captainId: userId },
        include: { members: true }
      });

      for (const team of captainTeams) {
        const nextCaptain = team.members.find((m) => m.userId !== userId);
        if (nextCaptain) {
          await tx.team.update({
            where: { id: team.id },
            data: { captainId: nextCaptain.userId }
          });
        } else {
          await tx.tournamentParticipant.deleteMany({ where: { teamId: team.id } });
          await tx.teamMember.deleteMany({ where: { teamId: team.id } });
          await tx.team.delete({ where: { id: team.id } });
        }
      }

      // 6. Remove participant records from pending tournament registrations (DRAFT, REGISTRATION_OPEN)
      const pendingParticipants = await tx.tournamentParticipant.findMany({
        where: {
          userId,
          tournament: {
            status: { in: ['DRAFT', 'REGISTRATION_OPEN'] }
          }
        },
        include: { tournament: true }
      });

      for (const part of pendingParticipants) {
        if (part.tournament && part.tournament.currentCount > 0) {
          await tx.tournament.update({
            where: { id: part.tournamentId },
            data: { currentCount: { decrement: 1 } }
          });
        }
      }

      await tx.tournamentParticipant.deleteMany({
        where: {
          userId,
          tournament: {
            status: { in: ['DRAFT', 'REGISTRATION_OPEN'] }
          }
        }
      });

      // 7. Remove team memberships
      await tx.teamMember.deleteMany({ where: { userId } });

      // 8. Remove disputes raised by user
      await tx.dispute.deleteMany({ where: { claimantId: userId } });

      // 9. Remove user notifications
      await tx.notification.deleteMany({ where: { userId } });

      // 10. Delete the user entity
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return {
      success: true,
      message: 'Your account has been deleted.'
    };
  }
}

