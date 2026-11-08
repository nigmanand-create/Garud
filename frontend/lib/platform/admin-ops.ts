/**
 * Admin "operations" narrative (PRD Phase 5): one nav, one dashboard, one audit log.
 * Pure helpers live here so they can be unit-tested without React.
 */

export type AdminNavLink = {
  href: string;
  label: string;
  /** Match the pathname exactly (used for the ops home). */
  exact?: boolean;
};

/** Ordered as the ops flow: intake → review → commerce → governance. */
export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { href: '/admin', label: 'Ops Home', exact: true },
  { href: '/admin/applications', label: 'Partner Applications' },
  { href: '/admin/enquiries', label: 'Enquiry Queue' },
  { href: '/admin/leads', label: 'Partner Leads' },
  { href: '/admin/service-requests', label: 'Service Requests' },
  { href: '/admin/gov-opportunities', label: 'Gov & Tenders' },
  { href: '/admin/partnerships', label: 'Partnerships' },
  { href: '/admin/listings', label: 'Listing Moderation' },
  { href: '/admin/orders', label: 'Order Oversight' },
  { href: '/admin/analytics', label: 'Commerce Analytics' },
  { href: '/admin/billing', label: 'Partner Billing' },
  { href: '/admin/users', label: 'Users & Roles' },
  { href: '/admin/audit-log', label: 'Audit Log' },
];

export function isAdminNavActive(link: AdminNavLink, pathname: string): boolean {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

export type AuditKind = 'KYC' | 'LISTING' | 'PARTNERSHIP' | 'ENQUIRY' | 'USER';

export const AUDIT_KINDS: AuditKind[] = [
  'KYC',
  'LISTING',
  'PARTNERSHIP',
  'ENQUIRY',
  'USER',
];

export const AUDIT_KIND_LABELS: Record<AuditKind, string> = {
  KYC: 'KYC decision',
  LISTING: 'Listing moderation',
  PARTNERSHIP: 'Partnership decision',
  ENQUIRY: 'Enquiry routing',
  USER: 'User & role',
};

export type AuditEventLike = {
  kind: AuditKind;
  subject: { id: string; label: string };
};

/** Deep link to the record an audit event is about. */
export function auditSubjectHref(event: AuditEventLike): string {
  switch (event.kind) {
    case 'KYC':
      return `/admin/applications/${event.subject.id}`;
    case 'LISTING':
      return `/admin/listings/${event.subject.id}`;
    case 'PARTNERSHIP':
      return '/admin/partnerships';
    case 'ENQUIRY':
      return '/admin/enquiries';
    case 'USER':
      return `/admin/users?search=${encodeURIComponent(event.subject.label)}`;
  }
}

export type AuditFilters = {
  kinds?: AuditKind[];
  search?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export const AUDIT_PAGE_SIZE = 25;

/** Query string for `GET /admin/audit-log` (empty values omitted). */
export function buildAuditQuery(f: AuditFilters): string {
  const pageSize = f.pageSize ?? AUDIT_PAGE_SIZE;
  const page = Math.max(f.page ?? 0, 0);
  const params = new URLSearchParams();
  if (f.kinds?.length) params.set('kind', f.kinds.join(','));
  if (f.search?.trim()) params.set('search', f.search.trim());
  if (f.actorUserId) params.set('actorUserId', f.actorUserId);
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  params.set('take', String(pageSize));
  if (page > 0) params.set('skip', String(page * pageSize));
  return params.toString();
}

/** Path for CSV export (same filters as the audit log page, no pagination). */
export function buildAuditExportPath(f: Omit<AuditFilters, 'page' | 'pageSize'>): string {
  const params = new URLSearchParams();
  if (f.kinds?.length) params.set('kind', f.kinds.join(','));
  if (f.search?.trim()) params.set('search', f.search.trim());
  if (f.actorUserId) params.set('actorUserId', f.actorUserId);
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  const q = params.toString();
  return `/admin/audit-log/export.csv${q ? `?${q}` : ''}`;
}

export function auditPageCount(total: number, pageSize = AUDIT_PAGE_SIZE): number {
  return Math.max(Math.ceil(total / pageSize), 1);
}

export type AdminOverviewQueues = {
  kyc: { pending: number; submitted: number; underReview: number };
  listings: { pendingReview: number };
  enquiries: { new: number; newUnrouted: number; total: number };
  leads: { new: number; stale: number; staleAfterDays: number; total: number };
  partnerships: { pending: number; submitted: number; underReview: number };
  orders: { paymentPending: number };
  admins: { active: number };
};

export type OpsCard = {
  key: string;
  label: string;
  value: number;
  href: string;
  /** Highlight when there is work waiting. */
  alert: boolean;
  hint?: string;
};

/** Dashboard tiles in triage order; `alert` drives the highlighted style. */
export function buildOpsCards(q: AdminOverviewQueues): OpsCard[] {
  return [
    {
      key: 'kyc',
      label: 'Partner applications to review',
      value: q.kyc.pending,
      href: '/admin/applications',
      alert: q.kyc.pending > 0,
      hint: `${q.kyc.submitted} submitted · ${q.kyc.underReview} under review`,
    },
    {
      key: 'enquiries',
      label: 'New enquiries',
      value: q.enquiries.new,
      href: '/admin/enquiries',
      alert: q.enquiries.new > 0,
      hint: `${q.enquiries.newUnrouted} not yet routed to a partner`,
    },
    {
      key: 'leads',
      label: 'Stale partner leads',
      value: q.leads.stale,
      href: '/admin/leads?stale=true',
      alert: q.leads.stale > 0,
      hint: `${q.leads.new} new of ${q.leads.total} · stale = untouched ${q.leads.staleAfterDays}+ days`,
    },
    {
      key: 'partnerships',
      label: 'Partnership requests pending',
      value: q.partnerships.pending,
      href: '/admin/partnerships',
      alert: q.partnerships.pending > 0,
      hint: `${q.partnerships.submitted} submitted · ${q.partnerships.underReview} under review`,
    },
    {
      key: 'listings',
      label: 'Listings awaiting moderation',
      value: q.listings.pendingReview,
      href: '/admin/listings',
      alert: q.listings.pendingReview > 0,
    },
    {
      key: 'orders',
      label: 'Orders with payment pending',
      value: q.orders.paymentPending,
      href: '/admin/orders',
      alert: false,
    },
  ];
}

/** Friendly "who did it" label for an audit actor. */
export function auditActorLabel(
  actor: { id: string; email: string | null } | null,
): string {
  if (!actor) return 'System';
  return actor.email ?? `User ${actor.id.slice(0, 8)}`;
}

/** Copy shown once after an admin issues a temporary password. */
export function temporaryPasswordNotice(email: string): string {
  return `Share this temporary password with ${email} over a secure channel. It is shown only once; they must change it on first sign-in.`;
}

/** Mirrors backend `roleForAccountType` so demotion keeps role/account type consistent. */
export function roleForAccountType(
  accountType: string,
): 'BUYER' | 'GOVERNMENT' | 'PARTNER' {
  if (accountType === 'BUYER_ENTERPRISE') return 'BUYER';
  if (accountType === 'GOVERNMENT_PSU') return 'GOVERNMENT';
  return 'PARTNER';
}

export type ManagedUser = {
  id: string;
  role: string;
  accountType: string;
  disabledAt: string | null;
  organization: { id: string } | null;
};

export type UserAction =
  | 'promote'
  | 'demote'
  | 'reset'
  | 'disable'
  | 'enable'
  | 'delete';

/**
 * Actions the UI offers for a row. The backend enforces the same guards
 * (self-protection, last active admin, admin-only demotion) regardless.
 */
export function availableUserActions(
  user: ManagedUser,
  currentUserId: string | undefined,
): UserAction[] {
  if (user.id === currentUserId) return [];
  const actions: UserAction[] = [];
  const isAdmin = user.role === 'PLATFORM_ADMIN';
  if (!isAdmin) actions.push('promote');
  if (isAdmin && user.organization) actions.push('demote');
  actions.push('reset');
  actions.push(user.disabledAt ? 'enable' : 'disable');
  actions.push('delete');
  return actions;
}
