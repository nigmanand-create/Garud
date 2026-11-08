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

export type GovImportRowResult = {
  row: number;
  action: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
  id?: string;
  referenceNo?: string | null;
  title?: string;
};

export type GovImportReport = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: GovImportRowResult[];
};

export function importGovOpportunitiesCsv(options: {
  file?: File;
  csvText?: string;
}) {
  if (options.file) {
    const form = new FormData();
    form.append('file', options.file);
    return apiRequest<GovImportReport>('/admin/gov-opportunities/import', {
      method: 'POST',
      auth: true,
      body: form,
    });
  }
  if (options.csvText?.trim()) {
    return apiRequest<GovImportReport>('/admin/gov-opportunities/import', {
      method: 'POST',
      auth: true,
      body: { csv: options.csvText },
    });
  }
  return Promise.reject(new Error('Choose a CSV file or paste CSV text'));
}

export type GovBidVault = {
  sealed: boolean;
  bidCount: number;
  unsealsAt: string | null;
  items: Array<{
    id: string;
    amountInr: string | number;
    bidderEmail: string;
    bidderRole: string;
    originalFilename?: string | null;
    hasDocument?: boolean;
    submittedAt: string;
    updatedAt: string;
  }>;
};

export type AdminGovOpportunityDetail = GovOpportunity & { bids: GovBidVault };

export const getAdminGovOpportunity = (id: string) =>
  apiRequest<AdminGovOpportunityDetail>(`/admin/gov-opportunities/${id}`, {
    auth: true,
  });

export type GovBidDocumentUpload = {
  storedRelativePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export const uploadGovBidDocument = (opportunityId: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<GovBidDocumentUpload>(
    `/buyer/gov-opportunities/${opportunityId}/bid-document`,
    { method: 'POST', auth: true, body: form },
  );
};

export const submitGovBid = (
  opportunityId: string,
  body: {
    amountInr: number;
    storedRelativePath?: string;
    originalFilename?: string;
    mimeType?: string;
  },
) =>
  apiRequest<{
    id: string;
    amountInr: string | number;
    hasDocument: boolean;
    submittedAt: string;
  }>(`/buyer/gov-opportunities/${opportunityId}/bids`, {
    method: 'POST',
    auth: true,
    body,
  });

export const downloadAdminGovBidDocument = (
  opportunityId: string,
  bidId: string,
  filename: string,
) =>
  import('./client').then(({ apiDownload }) =>
    apiDownload(
      `/admin/gov-opportunities/${opportunityId}/bids/${bidId}/document`,
      filename,
    ),
  );

export const getMyGovBid = (opportunityId: string) =>
  apiRequest<{
    bid: {
      id: string;
      amountInr: string | number;
      hasDocument: boolean;
      submittedAt: string;
    } | null;
  }>(`/buyer/gov-opportunities/${opportunityId}/bids/mine`, { auth: true });

export type MyGovBidRow = {
  id: string;
  opportunityId: string;
  amountInr: string | number;
  hasDocument: boolean;
  submittedAt: string;
  opportunity: GovOpportunity;
};

export const listMyGovBids = () =>
  apiRequest<{ items: MyGovBidRow[] }>('/buyer/gov-opportunities/bids/mine', {
    auth: true,
  });
