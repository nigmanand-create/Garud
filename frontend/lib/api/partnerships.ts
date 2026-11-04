import { apiRequest } from './client';

export type PartnershipRequestType =
  | 'DISTRIBUTORSHIP'
  | 'DEALERSHIP'
  | 'OEM_PARTNERSHIP'
  | 'TECHNOLOGY_INTEGRATION'
  | 'SERVICE_PARTNERSHIP'
  | 'TRAINING_PARTNERSHIP'
  | 'OTHER';

export type PartnershipRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'WITHDRAWN';

export type PartnershipRequest = {
  id: string;
  type: PartnershipRequestType;
  title: string;
  message: string;
  regions?: string | null;
  status: PartnershipRequestStatus;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  targetOrganization?: { id: string; companyName: string } | null;
};

export type AdminPartnershipRequest = PartnershipRequest & {
  organization: { id: string; companyName: string; contactEmail: string };
};

export type PartnerPartnershipsResponse = {
  items: PartnershipRequest[];
  incomingApproved: {
    id: string;
    type: PartnershipRequestType;
    title: string;
    reviewedAt?: string | null;
    organization: { id: string; companyName: string };
  }[];
};

export type AdminPartnershipsResponse = {
  items: AdminPartnershipRequest[];
  total: number;
  skip: number;
  take: number;
  statusCounts: Record<PartnershipRequestStatus, number>;
};

export const listPartnerPartnerships = () =>
  apiRequest<PartnerPartnershipsResponse>('/partner/partnerships', { auth: true });

export type PartnershipTargetOrg = {
  id: string;
  companyName: string;
  state?: string | null;
  city?: string | null;
};

export const searchPartnershipTargets = (q: string) =>
  apiRequest<{ items: PartnershipTargetOrg[] }>(
    `/partner/partnerships/targets?q=${encodeURIComponent(q)}`,
    { auth: true },
  );

export const createPartnershipRequest = (body: {
  type: PartnershipRequestType;
  title: string;
  message: string;
  regions?: string;
  targetOrganizationId?: string;
}) =>
  apiRequest<PartnershipRequest>('/partner/partnerships', {
    method: 'POST',
    auth: true,
    body,
  });

export const withdrawPartnershipRequest = (id: string) =>
  apiRequest<PartnershipRequest>(`/partner/partnerships/${id}/withdraw`, {
    method: 'POST',
    auth: true,
  });

export const listAdminPartnerships = (status?: PartnershipRequestStatus) =>
  apiRequest<AdminPartnershipsResponse>(
    `/admin/partnerships${status ? `?status=${status}` : ''}`,
    { auth: true },
  );

export const decidePartnershipRequest = (
  id: string,
  body: { status: 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED'; adminNote?: string },
) =>
  apiRequest<AdminPartnershipRequest>(`/admin/partnerships/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
