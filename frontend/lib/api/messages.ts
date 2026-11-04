import { apiRequest } from './client';

export type MessageSide = 'BUYER' | 'PARTNER';

export type ConversationSummary = {
  id: string;
  subject: string;
  lastMessageAt: string;
  lastMessageSide: MessageSide | null;
  unread: boolean;
  partnerOrganization: { id: string; companyName: string };
  buyerOrganization?: { id: string; companyName: string } | null;
  listing?: { id: string; name: string } | null;
  lastMessage?: { body: string; senderSide: MessageSide; createdAt: string } | null;
};

export type ConversationList = {
  items: ConversationSummary[];
  unreadCount: number;
};

export type ThreadMessage = {
  id: string;
  senderSide: MessageSide;
  body: string;
  createdAt: string;
};

export type ConversationThread = Omit<ConversationSummary, 'lastMessage'> & {
  messages: ThreadMessage[];
};

export type MessagesRole = 'buyer' | 'partner';

const base = (role: MessagesRole) =>
  role === 'buyer' ? '/buyer/conversations' : '/partner/conversations';

export const listConversations = (role: MessagesRole) =>
  apiRequest<ConversationList>(base(role), { auth: true });

export const getConversation = (role: MessagesRole, id: string) =>
  apiRequest<ConversationThread>(`${base(role)}/${id}`, { auth: true });

export const sendMessage = (role: MessagesRole, id: string, body: string) =>
  apiRequest<ThreadMessage>(`${base(role)}/${id}/messages`, {
    method: 'POST',
    auth: true,
    body: { body },
  });

export const markConversationRead = (role: MessagesRole, id: string) =>
  apiRequest<{ ok: true }>(`${base(role)}/${id}/read`, {
    method: 'POST',
    auth: true,
  });

export const startConversation = (body: {
  organizationId: string;
  listingId?: string;
  subject: string;
  body: string;
}) =>
  apiRequest<{ id: string; created: boolean }>('/buyer/conversations', {
    method: 'POST',
    auth: true,
    body,
  });
