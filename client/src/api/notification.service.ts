import api from './axios';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INVITE' | 'MATCH_START' | 'SCORE_UPDATE' | 'BAN' | 'DISPUTE_UPDATE' | 'GENERAL';
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NotificationAPI = {
  async getNotifications(page = 1, limit = 30) {
    const res = await api.get('/notifications', { params: { page, limit } });
    return res.data;
  },

  async markRead(id: string) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  }
};
