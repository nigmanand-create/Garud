import { apiRequest } from './client';
import {
  buildAuditQuery,
  type AdminOverviewQueues,
  type AuditFilters,
  type AuditKind,
} from '../platform/admin-ops';
import type {
  AccountType,
  EnquiryIntent,
  LeadStatus,
  UserRole,
  VerificationStatus,
} from './types';

export type AdminOverview = {
  queues: AdminOverviewQueues;
  attentionTotal: number;
  recentActivity: AuditEvent[];
};

export type AuditEvent = {
  id: string;
  kind: AuditKind;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: { id: string; email: string | null } | null;
  subject: { id: string; label: string };
  createdAt: string;
};

export type AuditLogResponse = {
  items: AuditEvent[];
  total: number;
  skip: number;
  take: number;
  kindCounts: Record<AuditKind, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  mustChangePassword: boolean;
  disabledAt: string | null;
  /** Present for typing; soft-deleted rows are not returned by the list API. */
  deletedAt?: string | null;
  createdAt: string;
  organization: {
    id: string;
    companyName: string;
    verificationStatus: VerificationStatus;
  } | null;
};

export type AdminUsersResponse = {
  items: AdminUser[];
  total: number;
  skip: number;
  take: number;
  roleCounts: Record<UserRole, number>;
  activeAdmins: number;
};

export type AdminLead = {
  id: string;
  status: LeadStatus;
  intent: EnquiryIntent;
  partnerNote: string | null;
  contactedAt: string | null;
  createdAt: string;
  organization: { id: string; companyName: string };
  enquiry: { id: string; name: string; email: string; subject: string; intent: EnquiryIntent };
  listing: { id: string; name: string } | null;
};

export type AdminLeadsResponse = {
  items: AdminLead[];
  total: number;
  skip: number;
  take: number;
  statusCounts: Record<LeadStatus, number>;
};

export const getAdminOverview = () =>
  apiRequest<AdminOverview>('/admin/overview', { auth: true });

export const listAuditLog = (filters: AuditFilters) =>
  apiRequest<AuditLogResponse>(`/admin/audit-log?${buildAuditQuery(filters)}`, {
    auth: true,
  });

export const listAdminUsers = (params: {
  role?: UserRole;
  status?: 'active' | 'disabled';
  search?: string;
  skip?: number;
  take?: number;
}) => {
  const q = new URLSearchParams();
  if (params.role) q.set('role', params.role);
  if (params.status) q.set('status', params.status);
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.skip) q.set('skip', String(params.skip));
  if (params.take) q.set('take', String(params.take));
  const qs = q.toString();
  return apiRequest<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ''}`, {
    auth: true,
  });
};

export const createAdminUser = (email: string) =>
  apiRequest<{ user: AdminUser; temporaryPassword: string }>('/admin/users', {
    method: 'POST',
    auth: true,
    body: { email },
  });

export const updateUserRole = (
  id: string,
  body: { role: UserRole; accountType?: AccountType },
) =>
  apiRequest<{ user: AdminUser }>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const resetUserPassword = (id: string) =>
  apiRequest<{ user: AdminUser; temporaryPassword: string }>(
    `/admin/users/${id}/reset-password`,
    { method: 'POST', auth: true },
  );

export const setUserDisabled = (id: string, disabled: boolean) =>
  apiRequest<{ user: AdminUser }>(`/admin/users/${id}/disabled`, {
    method: 'PATCH',
    auth: true,
    body: { disabled },
  });

/** Soft-delete: anonymize credentials, revoke sessions; user disappears from this list. */
export const deleteAdminUser = (id: string) =>
  apiRequest<{ ok: true }>(`/admin/users/${id}`, {
    method: 'DELETE',
    auth: true,
  });

export const listAdminLeads = (params: {
  status?: LeadStatus;
  stale?: boolean;
  skip?: number;
  take?: number;
}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.stale) q.set('stale', 'true');
  if (params.skip) q.set('skip', String(params.skip));
  q.set('take', String(params.take ?? 25));
  return apiRequest<AdminLeadsResponse>(`/admin/leads?${q.toString()}`, {
    auth: true,
  });
};

export function updateAdminLead(
  id: string,
  body: { status?: LeadStatus; partnerNote?: string; organizationId?: string },
) {
  return apiRequest<AdminLead>(`/admin/leads/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export type CommerceAnalytics = {
  days: number;
  from: string;
  to: string;
  gmv: {
    totalInr: number;
    paidInr: number;
    pendingInr: number;
    previousPeriodInr: number;
    changePct: number | null;
    orders: number;
    previousOrders: number;
    ordersChangePct: number | null;
    avgOrderValueInr: number;
    cancelledOrders: number;
    cancellationRatePct: number;
  };
  trend: {
    bucketDays: number;
    points: { date: string; orders: number; gmvInr: number; paidGmvInr: number }[];
  };
  paymentBreakdown: Record<string, { orders: number; gmvInr: number }>;
  fulfillmentBreakdown: Record<string, number>;
  sourceSplit: {
    rfq: { orders: number; gmvInr: number };
    direct: { orders: number; gmvInr: number };
    rfqSharePct: number;
  };
  topVendors: {
    organizationId: string;
    companyName: string;
    orders: number;
    gmvInr: number;
    sharePct: number;
  }[];
  rfq: {
    created: number;
    previousCreated: number;
    createdChangePct: number | null;
    byStatus: Record<string, number>;
    funnel: { key: string; label: string; count: number; ratePct: number }[];
    invites: {
      total: number;
      quoted: number;
      declined: number;
      responseRatePct: number;
      quoteRatePct: number;
    };
    quotations: {
      total: number;
      accepted: number;
      avgPerRfq: number;
      acceptanceRatePct: number;
    };
    ordersFromRfq: { orders: number; gmvInr: number };
  };
  truncated: boolean;
};

export const getCommerceAnalytics = (days = 30) =>
  apiRequest<CommerceAnalytics>(`/admin/analytics?days=${days}`, { auth: true });
