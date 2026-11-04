import type {
  GovOpportunityStatus,
  GovOpportunityType,
} from '@/lib/platform/verticals';
import { apiRequest } from './client';

export type GovOpportunity = {
  id: string;
  type: GovOpportunityType;
  title: string;
  summary: string;
  description?: string | null;
  issuingBody: string;
  referenceNo?: string | null;
  state?: string | null;
  sourceUrl?: string | null;
  estimatedValueInr?: string | number | null;
  openDate?: string | null;
  closingDate?: string | null;
  eligibility?: string | null;
  status: GovOpportunityStatus;
  publishedAt?: string | null;
  createdAt: string;
  isExpired: boolean;
};

export type GovOpportunityPayload = {
  type: GovOpportunityType;
  title: string;
  summary: string;
  description?: string;
  issuingBody: string;
  referenceNo?: string;
  state?: string;
  sourceUrl?: string;
  estimatedValueInr?: number;
  openDate?: string;
  closingDate?: string;
  eligibility?: string;
  status?: GovOpportunityStatus;
};

export function listGovOpportunities(params?: {
  type?: GovOpportunityType;
  state?: string;
  q?: string;
  includeExpired?: boolean;
}) {
  const s = new URLSearchParams();
  if (params?.type) s.set('type', params.type);
  if (params?.state) s.set('state', params.state);
  if (params?.q) s.set('q', params.q);
  if (params?.includeExpired) s.set('includeExpired', 'true');
  const q = s.toString();
  return apiRequest<{ items: GovOpportunity[]; total: number }>(
    `/gov/opportunities${q ? `?${q}` : ''}`,
  );
}

export const getGovOpportunity = (id: string) =>
  apiRequest<GovOpportunity>(`/gov/opportunities/${id}`);

export type AdminGovResponse = {
  items: GovOpportunity[];
  total: number;
  statusCounts: Record<GovOpportunityStatus, number>;
};

export const listAdminGovOpportunities = (status?: GovOpportunityStatus) =>
  apiRequest<AdminGovResponse>(
    `/admin/gov-opportunities${status ? `?status=${status}` : ''}`,
    { auth: true },
  );

export const createGovOpportunity = (body: GovOpportunityPayload) =>
  apiRequest<GovOpportunity>('/admin/gov-opportunities', {
    method: 'POST',
    auth: true,
    body,
  });

export const updateGovOpportunity = (
  id: string,
  body: Partial<GovOpportunityPayload>,
) =>
  apiRequest<GovOpportunity>(`/admin/gov-opportunities/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const deleteGovOpportunity = (id: string) =>
  apiRequest<{ deleted: boolean }>(`/admin/gov-opportunities/${id}`, {
    method: 'DELETE',
    auth: true,
  });
