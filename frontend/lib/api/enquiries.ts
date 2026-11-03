import { apiRequest } from './client';
import type {
  AdminEnquiriesResponse,
  CreateEnquiryPayload,
  EnquiryRecord,
  EnquiryStatus,
} from './types';

export function submitEnquiry(body: CreateEnquiryPayload) {
  return apiRequest<EnquiryRecord>('/enquiries', {
    method: 'POST',
    body,
  });
}

export function listAdminEnquiries(params?: {
  status?: EnquiryStatus;
  skip?: number;
  take?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
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
