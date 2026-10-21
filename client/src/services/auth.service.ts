import api from './axios';
import { AuthResponse, Role, User } from '../types';

export const authService = {
  async register(data: {
    email: string;
    username: string;
    password: string;
    role?: Role;
    bio?: string;
  }): Promise<AuthResponse> {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  async login(credentials: {
    emailOrUsername: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await api.post('/auth/login', credentials);
    return res.data.data;
  },

  async getProfile(): Promise<User> {
    const res = await api.get('/auth/profile');
    return res.data.data;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; email?: string }> {
    const res = await api.post('/auth/verify-email', { token });
    return res.data;
  },

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/resend-verification', { email });
    return res.data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async verifyResetOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/verify-reset-otp', { email, otp });
    return res.data;
  },

  async resetPassword(
    tokenOrData: string | { token?: string; otp?: string; email?: string; newPassword: string },
    legacyPassword?: string
  ): Promise<{ success: boolean; message: string }> {
    const payload = typeof tokenOrData === 'string'
      ? { token: tokenOrData, newPassword: legacyPassword || '' }
      : tokenOrData;
    const res = await api.post('/auth/reset-password', payload);
    return res.data;
  },

  async resendOtp(email: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  },

  async verifyOtp(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
    data: { user: User; token: string };
  }> {
    const res = await api.post('/auth/verify-otp', { email, otp });
    return res.data;
  },

  async updateUnverifiedEmail(oldEmail: string, newEmail: string): Promise<{
    success: boolean;
    message: string;
    newEmail: string;
  }> {
    const res = await api.patch('/auth/update-unverified-email', { oldEmail, newEmail });
    return res.data;
  }
};



