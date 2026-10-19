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
      const { emailOrUsername, password } = req.body;

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
}
