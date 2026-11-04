import { apiRequest } from './client';
import type {
  AdminEnquiriesResponse,
  CreateEnquiryPayload,
  EnquiryIntent,
  EnquiryRecord,
  EnquiryStatus,
  LeadStatus,
  PartnerEnquiriesResponse,
  PartnerLead,
  PartnerLeadsResponse,
} from './types';

export function submitEnquiry(body: CreateEnquiryPayload) {
  return apiRequest<EnquiryRecord>('/enquiries', {
    method: 'POST',
    body,
  });
}

export type AdminEnquiryFilters = {
  status?: EnquiryStatus;
  intent?: EnquiryIntent;
  routing?: 'ROUTED' | 'UNROUTED';
  skip?: number;
  take?: number;
};

export function listAdminEnquiries(params?: AdminEnquiryFilters) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.intent) search.set('intent', params.intent);
  if (params?.routing) search.set('routing', params.routing);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<AdminEnquiriesResponse>(
    `/admin/enquiries${q ? `?${q}` : ''}`,
    { auth: true },
  );
}

export function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  return apiRequest<EnquiryRecord>(`/admin/enquiries/${id}`, {
    method: 'PATCH',
    auth: true,
    body: { status },
  });
}

export function bulkUpdateEnquiryStatus(ids: string[], status: EnquiryStatus) {
  return apiRequest<{ updated: number }>('/admin/enquiries/bulk-status', {
    method: 'POST',
    auth: true,
    body: { ids, status },
  });
}

export function assignEnquiry(id: string, organizationId: string | null) {
  return apiRequest<EnquiryRecord>(`/admin/enquiries/${id}/assign`, {
    method: 'PATCH',
    auth: true,
    body: { organizationId },
  });
}

export function listPartnerLeads(params?: {
  status?: LeadStatus;
  intent?: EnquiryIntent;
  q?: string;
  skip?: number;
  take?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.intent) search.set('intent', params.intent);
  if (params?.q) search.set('q', params.q);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<PartnerLeadsResponse>(
    `/partner/leads${q ? `?${q}` : ''}`,
    { auth: true },
  );
}

export function updatePartnerLead(
  id: string,
  body: { status?: LeadStatus; partnerNote?: string },
) {
  return apiRequest<PartnerLead>(`/partner/leads/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function listPartnerEnquiries(params?: {
  status?: EnquiryStatus;
  q?: string;
  skip?: number;
  take?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.q) search.set('q', params.q);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<PartnerEnquiriesResponse>(
    `/partner/enquiries${q ? `?${q}` : ''}`,
    { auth: true },
  );
}

export function updatePartnerEnquiryStatus(id: string, status: EnquiryStatus) {
  return apiRequest<EnquiryRecord>(`/partner/enquiries/${id}`, {
    method: 'PATCH',
    auth: true,
    body: { status },
  });
}
