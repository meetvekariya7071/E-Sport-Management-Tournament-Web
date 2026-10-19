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
  }
};
