import api from './axios';
import { Game } from '../types';

export const gameService = {
  async getAllGames(): Promise<Game[]> {
    const res = await api.get('/games');
    return res.data.data;
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

  async deleteGame(id: string): Promise<void> {
    await api.delete(`/games/${id}`);
  }
};
