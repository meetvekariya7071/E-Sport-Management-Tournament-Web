import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, role, bio } = req.body;

      if (!email || !username || !password) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: email, username, and password are required fields.'
        });
        return;
      }

      const result = await AuthService.registerUser({ email, username, password, role, bio });
      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: result
      });
    } catch (error: any) {
      if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Registration failed.' });
      }
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const emailOrUsername = req.body.emailOrUsername || req.body.email;
      const { password } = req.body;

      if (!emailOrUsername || !password) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: emailOrUsername and password are required.'
        });
        return;
      }

      const result = await AuthService.loginUser({ emailOrUsername, password });
      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: result
      });
    } catch (error: any) {
      if (error.requiresVerification) {
        res.status(403).json({
          success: false,
          requiresVerification: true,
          email: error.email,
          message: error.message
        });
        return;
      }
      if (error.message.startsWith('UNAUTHORIZED:')) {
        res.status(401).json({ success: false, error: error.message.replace('UNAUTHORIZED: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Login failed.' });
      }
    }
  }

  /**
   * GET /api/auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: req.user
    });
  }

  /**
   * POST /api/auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = (req.body.token || req.query.token) as string;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required.'
        });
        return;
      }

      const result = await AuthService.verifyEmail(token);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Email verification failed.' });
      }
    }
  }

  /**
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email address is required.'
        });
        return;
      }

      const result = await AuthService.resendVerification(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Resending verification failed.' });
      }
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required.'
        });
        return;
      }

      const result = await AuthService.forgotPassword(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Password reset request failed.' });
      }
    }
  }

  /**
   * POST /api/auth/verify-reset-otp
   */
  static async verifyResetOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({
          success: false,
          error: 'Email and 6-digit verification code are required.'
        });
        return;
      }

      const result = await AuthService.verifyResetOtp(email, otp);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'OTP verification failed.' });
      }
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const token = req.body.token || req.body.otp;
      const { newPassword, email } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Verification code (OTP) and new password are required.'
        });
        return;
      }

      const result = await AuthService.resetPassword(token, newPassword, email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Password reset failed.' });
      }
    }
  }

  /**
   * POST /api/auth/resend-otp
   */
  static async resendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email address is required.'
        });
        return;
      }

      const result = await AuthService.resendOtp(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('TOO_MANY_REQUESTS:')) {
        res.status(429).json({ success: false, error: error.message.replace('TOO_MANY_REQUESTS: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to resend verification code.' });
      }
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({
          success: false,
          error: 'Email and 6-digit verification code are required.'
        });
        return;
      }

      const result = await AuthService.verifyOtp(email, otp);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'OTP verification failed.' });
      }
    }
  }

  /**
   * PATCH /api/auth/update-unverified-email
   * Scenario A: Fix email typos for unverified accounts
   */
  static async updateUnverifiedEmail(req: Request, res: Response): Promise<void> {
    try {
      const { oldEmail, newEmail } = req.body;

      if (!oldEmail || !newEmail) {
        res.status(400).json({
          success: false,
          error: 'Current email and new email address are required.'
        });
        return;
      }

      const result = await AuthService.updateUnverifiedEmail(oldEmail, newEmail);
      res.status(200).json({
        success: true,
        message: result.message,
        newEmail: result.newEmail
      });
    } catch (error: any) {
      if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to update email address.' });
      }
    }
  }
}



