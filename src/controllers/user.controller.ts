import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class UserController {
  /**
   * POST /api/user/request-email-change
   * Authenticated user requests an email change with current password confirmation.
   */
  static async requestEmailChange(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { newEmail, currentPassword } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: User authentication required.' });
        return;
      }

      if (!newEmail || !currentPassword) {
        res.status(400).json({ success: false, error: 'New email and current password are required.' });
        return;
      }

      const result = await AuthService.requestEmailChange(userId, newEmail, currentPassword);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('UNAUTHORIZED:')) {
        res.status(401).json({ success: false, error: error.message.replace('UNAUTHORIZED: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to request email change.' });
      }
    }
  }

  /**
   * POST /api/user/confirm-email-change
   * Authenticated user submits 6-digit OTP to confirm pending email change.
   */
  static async confirmEmailChange(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { otp } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: User authentication required.' });
        return;
      }

      if (!otp) {
        res.status(400).json({ success: false, error: '6-digit verification code is required.' });
        return;
      }

      const result = await AuthService.confirmEmailChange(userId, otp);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error: any) {
      if (error.message.startsWith('CONFLICT:')) {
        res.status(409).json({ success: false, error: error.message.replace('CONFLICT: ', '') });
      } else if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to confirm email change.' });
      }
    }
  }

  /**
   * DELETE /api/user/account
   * Permanently deletes user account after password verification and tournament checks.
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { password } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: User authentication required.' });
        return;
      }

      if (!password) {
        res.status(400).json({ success: false, error: 'Current password is required to delete your account.' });
        return;
      }

      const result = await AuthService.deleteAccount(userId, password);

      res.clearCookie('token');
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error.message.startsWith('BAD_REQUEST:')) {
        res.status(400).json({ success: false, error: error.message.replace('BAD_REQUEST: ', '') });
      } else if (error.message.startsWith('UNAUTHORIZED:')) {
        res.status(401).json({ success: false, error: error.message.replace('UNAUTHORIZED: ', '') });
      } else if (error.message.startsWith('FORBIDDEN:')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
      } else if (error.message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ success: false, error: error.message.replace('NOT_FOUND: ', '') });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to delete account.' });
      }
    }
  }
}
