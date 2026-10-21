import api from './axios';
import { User } from '../types';

export const userService = {
  /**
   * Scenario B (Step 1): Requests an email change with current password verification.
   */
  async requestEmailChange(newEmail: string, currentPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/user/request-email-change', { newEmail, currentPassword });
    return res.data;
  },

  /**
   * Scenario B (Step 2): Confirms email change with the 6-digit OTP code.
   */
  async confirmEmailChange(otp: string): Promise<{
    success: boolean;
    message: string;
    data: { user: User; token: string };
  }> {
    const res = await api.post('/user/confirm-email-change', { otp });
    return res.data;
  }
};
