import { apiRequest } from './client';
import type { BillingMode, BillingPeriod } from '../platform/partner-billing';

export type PlanSummary = {
  id: string;
  key: string;
  name: string;
  description: string;
  priceInr: number;
  billingPeriod: BillingPeriod;
  listingLimit: number | null;
  featuredPlacement: boolean;
  rfqPriority: boolean;
  features: string[];
  entitlements: string[];
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  razorpaySynced: boolean;
};

export type PartnerSubscription = {
  billingMode: BillingMode;
  billingEnabled: boolean;
  plan: PlanSummary & {
    status: string;
    source: 'DEFAULT' | 'SUBSCRIPTION';
    renewsAt: string | null;
    endsAt: string | null;
  };
  entitlements: string[];
  limits: {
    listingLimit: number | null;
    featuredPlacement: boolean;
    rfqPriority: boolean;
  };
  usage: { listings: number; listingLimit: number | null };
  pendingCheckout: { planKey: string | null } | null;
  plans: (PlanSummary & { isCurrent: boolean; requiresPayment: boolean })[];
};

export type CheckoutResult =
  | { mode: 'ACTIVATED'; planKey: string }
  | {
      mode: 'CHECKOUT';
      planKey: string;
      gateway: 'RAZORPAY';
      subscriptionId: string;
      keyId: string;
      shortUrl: string | null;
      sandboxMode: boolean;
      amountInr: number;
      companyName: string;
    };

export const getPartnerSubscription = () =>
  apiRequest<PartnerSubscription>('/partner/subscription', { auth: true });

export const checkoutPartnerPlan = (planKey: string) =>
  apiRequest<CheckoutResult>('/partner/subscription/checkout', {
    method: 'POST',
    auth: true,
    body: { planKey },
  });

export const verifyPartnerSubscription = (body: {
  razorpaySubscriptionId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) =>
  apiRequest<PartnerSubscription>('/partner/subscription/verify', {
    method: 'POST',
    auth: true,
    body,
  });

export const cancelPartnerSubscription = () =>
  apiRequest<PartnerSubscription>('/partner/subscription/cancel', {
    method: 'POST',
    auth: true,
  });

// ---- admin -----------------------------------------------------------------

export type AdminPlan = PlanSummary & {
  subscribers: { active: number; total: number };
};

export type AdminPlansResponse = {
  billingMode: BillingMode;
  mrrInr: number;
  plans: AdminPlan[];
};

export type AdminSubscriptionRow = {
  id: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  plan: { key: string; name: string; priceInr: number };
  organization: { id: string; companyName: string };
  razorpaySubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  assignedByAdmin: boolean;
  updatedAt: string;
};

export const adminListPlans = () =>
  apiRequest<AdminPlansResponse>('/admin/billing/plans', { auth: true });

export const adminCreatePlan = (body: Record<string, unknown>) =>
  apiRequest<PlanSummary>('/admin/billing/plans', {
    method: 'POST',
    auth: true,
    body,
  });

export const adminUpdatePlan = (id: string, body: Record<string, unknown>) =>
  apiRequest<PlanSummary>(`/admin/billing/plans/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const adminSyncRazorpayPlan = (id: string) =>
  apiRequest<{ synced: boolean; razorpayPlanId: string; created: boolean }>(
    `/admin/billing/plans/${id}/sync-razorpay`,
    { method: 'POST', auth: true },
  );

export const adminListSubscriptions = (status?: string) =>
  apiRequest<{ items: AdminSubscriptionRow[] }>(
    `/admin/billing/subscriptions${status ? `?status=${status}` : ''}`,
    { auth: true },
  );

export const adminAssignPlan = (organizationId: string, planKey: string) =>
  apiRequest<{ organization: { id: string; companyName: string }; planKey: string }>(
    '/admin/billing/assign',
    { method: 'POST', auth: true, body: { organizationId, planKey } },
  );
