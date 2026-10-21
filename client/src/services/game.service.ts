import api from './axios';
import { Game } from '../types';

export const gameService = {
  async getAllGames(onlyActive: boolean = false): Promise<Game[]> {
    const response = await api.get('/games', {
      params: onlyActive ? { active: 'true' } : {}
    });
    const gamesData = Array.isArray(response.data)
      ? response.data
      : response.data?.games || response.data?.data || [];
    return gamesData;
  },

  async getGameByIdOrSlug(idOrSlug: string): Promise<Game> {
    const res = await api.get(`/games/${idOrSlug}`);
    return res.data?.data || res.data;
  },

  async createGame(data: {
    title: string;
    slug: string;
    genre: string;
    isTeamBased?: boolean;
    minTeamSize?: number;
    maxTeamSize?: number;
  }): Promise<Game> {
    const res = await api.post('/games', data);
    return res.data.data;
  },

  async deleteGame(id: string): Promise<{ success: boolean; softDeleted?: boolean; message: string }> {
    const res = await api.delete(`/games/${id}`);
    return res.data;
  },

  async toggleGameStatus(id: string, isActive?: boolean): Promise<{ success: boolean; message: string; data: Game }> {
    const res = await api.patch(`/games/${id}/toggle-status`, { isActive });
    return res.data;
  }
};
