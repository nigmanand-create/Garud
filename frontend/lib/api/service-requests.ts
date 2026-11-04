import type {
  ServiceRequestCategory,
  ServiceRequestStatus,
} from '@/lib/platform/verticals';
import { apiRequest } from './client';

export type ServiceRequestUpdate = {
  id: string;
  actor: 'SYSTEM' | 'REQUESTER' | 'PARTNER' | 'ADMIN' | string;
  status?: ServiceRequestStatus | null;
  note?: string | null;
  createdAt: string;
};

export type TrackedServiceRequest = {
  id: string;
  trackingToken: string;
  category: ServiceRequestCategory;
  title: string;
  description: string;
  state?: string | null;
  city?: string | null;
  status: ServiceRequestStatus;
  createdAt: string;
  completedAt?: string | null;
  provider?: string | null;
  updates: ServiceRequestUpdate[];
};

export type CreateServiceRequestPayload = {
  name: string;
  email: string;
  phone?: string;
  category: ServiceRequestCategory;
  title: string;
  description: string;
  state?: string;
  city?: string;
  details?: Record<string, string | number>;
};

export type CreateServiceRequestResult = {
  enquiryId: string;
  request: { id: string; status: ServiceRequestStatus; trackingToken: string };
};

export const submitServiceRequest = (body: CreateServiceRequestPayload) =>
  apiRequest<CreateServiceRequestResult>('/service-requests', {
    method: 'POST',
    // Sends the bearer token when signed in so the request is linked to the buyer.
    auth: true,
    body,
  });

export const trackServiceRequest = (token: string) =>
  apiRequest<TrackedServiceRequest>(
    `/service-requests/track/${encodeURIComponent(token)}`,
  );

export const cancelServiceRequest = (token: string) =>
  apiRequest<TrackedServiceRequest>(
    `/service-requests/track/${encodeURIComponent(token)}/cancel`,
    { method: 'POST' },
  );

export const listMyServiceRequests = () =>
  apiRequest<{ items: TrackedServiceRequest[] }>('/buyer/service-requests', {
    auth: true,
  });

// --- partner ----------------------------------------------------------------

export type PartnerServiceRequestItem = {
  matchId: string;
  matchStatus: 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  offeredAt: string;
  request: {
    id: string;
    category: ServiceRequestCategory;
    title: string;
    description: string;
    state?: string | null;
    city?: string | null;
    details?: Record<string, string | number | boolean> | null;
    status: ServiceRequestStatus;
    createdAt: string;
    requesterName?: string | null;
    requesterEmail?: string | null;
    requesterPhone?: string | null;
    updates: ServiceRequestUpdate[];
  };
};

export type PartnerServiceRequestsResponse = {
  items: PartnerServiceRequestItem[];
  counts: { offered: number; active: number; closed: number };
};

export type ServiceCoverage = {
  categories: ServiceRequestCategory[];
  states: string[];
  homeState?: string | null;
};

export type PartnerServiceTab = 'OFFERED' | 'ACTIVE' | 'CLOSED';

export const listPartnerServiceRequests = (tab?: PartnerServiceTab) =>
  apiRequest<PartnerServiceRequestsResponse>(
    `/partner/service-requests${tab ? `?tab=${tab}` : ''}`,
    { auth: true },
  );

export const acceptServiceRequest = (id: string) =>
  apiRequest<unknown>(`/partner/service-requests/${id}/accept`, {
    method: 'POST',
    auth: true,
  });

export const declineServiceRequest = (id: string) =>
  apiRequest<unknown>(`/partner/service-requests/${id}/decline`, {
    method: 'POST',
    auth: true,
  });

export const updatePartnerServiceRequest = (
  id: string,
  body: { status?: 'COMPLETED'; note?: string },
) =>
  apiRequest<unknown>(`/partner/service-requests/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const getServiceCoverage = () =>
  apiRequest<ServiceCoverage>('/partner/service-requests/coverage', {
    auth: true,
  });

export const saveServiceCoverage = (body: {
  categories: ServiceRequestCategory[];
  states: string[];
}) =>
  apiRequest<ServiceCoverage>('/partner/service-requests/coverage', {
    method: 'PUT',
    auth: true,
    body,
  });

// --- admin ------------------------------------------------------------------

export type AdminServiceRequest = {
  id: string;
  category: ServiceRequestCategory;
  title: string;
  description: string;
  state?: string | null;
  city?: string | null;
  status: ServiceRequestStatus;
  matchScope?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  createdAt: string;
  assignedOrganization?: { id: string; companyName: string } | null;
  matches: {
    status: string;
    organization: { id: string; companyName: string };
  }[];
  updates: ServiceRequestUpdate[];
};

export type AdminServiceRequestsResponse = {
  items: AdminServiceRequest[];
  total: number;
  skip: number;
  take: number;
  statusCounts: Record<ServiceRequestStatus, number>;
};

export const listAdminServiceRequests = (params?: {
  status?: ServiceRequestStatus;
  category?: ServiceRequestCategory;
  q?: string;
}) => {
  const s = new URLSearchParams();
  if (params?.status) s.set('status', params.status);
  if (params?.category) s.set('category', params.category);
  if (params?.q) s.set('q', params.q);
  const q = s.toString();
  return apiRequest<AdminServiceRequestsResponse>(
    `/admin/service-requests${q ? `?${q}` : ''}`,
    { auth: true },
  );
};

export const rematchServiceRequest = (id: string) =>
  apiRequest<unknown>(`/admin/service-requests/${id}/rematch`, {
    method: 'POST',
    auth: true,
  });

export const assignServiceRequest = (id: string, organizationId: string) =>
  apiRequest<unknown>(`/admin/service-requests/${id}/assign`, {
    method: 'PATCH',
    auth: true,
    body: { organizationId },
  });

export const setServiceRequestStatus = (
  id: string,
  status: 'CANCELLED' | 'COMPLETED',
  note?: string,
) =>
  apiRequest<unknown>(`/admin/service-requests/${id}/status`, {
    method: 'PATCH',
    auth: true,
    body: { status, note },
  });
