import { apiRequest } from './client';

export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  items: InAppNotification[];
  unreadCount: number;
};

export const notificationsApi = {
  list: (take = 15) =>
    apiRequest<NotificationsResponse>(`/notifications?take=${take}`, {
      auth: true,
    }),
  unreadCount: () =>
    apiRequest<{ unreadCount: number }>('/notifications/unread-count', {
      auth: true,
    }),
  markRead: (id: string) =>
    apiRequest<{ updated: number }>(`/notifications/${id}/read`, {
      method: 'POST',
      auth: true,
    }),
  markAllRead: () =>
    apiRequest<{ updated: number }>('/notifications/read-all', {
      method: 'POST',
      auth: true,
    }),
};
