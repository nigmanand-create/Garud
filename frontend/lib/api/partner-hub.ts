import { apiRequest } from './client';
import type {
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  VerificationStatus,
} from './types';

export type PartnerOverview = {
  companyName: string;
  verificationStatus: VerificationStatus;
  rfq: { awaitingQuote: number; quoted: number };
  ordersToFulfill: number;
  catalog: Record<ListingReviewStatus, number>;
  newLeads: number;
  newEnquiries: number;
  unreadMessages: number;
  pendingPartnerships: number;
  views30d: number;
};

export type PartnerAnalytics = {
  periodDays: number;
  since: string;
  views: {
    total: number;
    byDay: { date: string; count: number }[];
    topListings: {
      listingId: string;
      name: string;
      listingType: ListingType | null;
      views: number;
    }[];
  };
  enquiries: { total: number; byStatus: Record<'NEW' | 'READ' | 'CLOSED', number> };
  leads: {
    newInPeriod: number;
    allTime: number;
    byStatus: Record<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST', number>;
    winRate: number | null;
  };
  rfq: {
    invites: Record<'INVITED' | 'QUOTED' | 'DECLINED', number>;
    invitesTotal: number;
    quotations: Record<'SUBMITTED' | 'WITHDRAWN' | 'ACCEPTED' | 'REJECTED', number>;
    responseRate: number | null;
    acceptanceRate: number | null;
  };
  orders: { count: number; gmvInr: number };
};

export type PartnerServiceItem = {
  id: string;
  name: string;
  category: CatalogCategory;
  reviewStatus: ListingReviewStatus;
  isPublished: boolean;
  rejectionReason?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  city?: string | null;
  state?: string | null;
  updatedAt: string;
  views30d: number;
  leadCount: number;
};

export type PartnerServicesHub = {
  total: number;
  live: number;
  summary: Record<ListingReviewStatus, number>;
  categories: CatalogCategory[];
  items: PartnerServiceItem[];
  serviceLeads: { total: number; new: number };
  recentLeads: {
    id: string;
    status: string;
    createdAt: string;
    enquiry: { subject: string; name: string; serviceKey?: string | null };
    listing?: { id: string; name: string } | null;
  }[];
};

export type PartnerSubscription = {
  billingEnabled: boolean;
  plan: {
    key: string;
    name: string;
    priceInr: number;
    status: string;
    description: string;
  };
  entitlements: string[];
  usage: { listings: number; listingLimit: number | null };
  roadmap: string[];
};

export type PartnerAuditEvent = {
  id: string;
  kind: 'KYC' | 'LISTING';
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  createdAt: string;
  listingId?: string | null;
  listingName?: string | null;
};

export const getPartnerOverview = () =>
  apiRequest<PartnerOverview>('/partner/overview', { auth: true });

export const getPartnerAnalytics = (days = 30) =>
  apiRequest<PartnerAnalytics>(`/partner/analytics?days=${days}`, { auth: true });

export const getPartnerServicesHub = () =>
  apiRequest<PartnerServicesHub>('/partner/services', { auth: true });

export const getPartnerSubscription = () =>
  apiRequest<PartnerSubscription>('/partner/subscription', { auth: true });

export const getPartnerAuditLog = (take = 50) =>
  apiRequest<{ items: PartnerAuditEvent[] }>(`/partner/audit-log?take=${take}`, {
    auth: true,
  });
