import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_LINKS,
  AUDIT_KINDS,
  AUDIT_KIND_LABELS,
  auditActorLabel,
  auditPageCount,
  auditSubjectHref,
  availableUserActions,
  buildAuditQuery,
  buildOpsCards,
  isAdminNavActive,
  roleForAccountType,
  type AdminOverviewQueues,
} from '../platform/admin-ops';
import { getAccountNavLinks } from '../platform/header-nav';

const queues: AdminOverviewQueues = {
  kyc: { pending: 3, submitted: 2, underReview: 1 },
  listings: { pendingReview: 0 },
  enquiries: { new: 5, newUnrouted: 2, total: 20 },
  leads: { new: 4, stale: 1, staleAfterDays: 3, total: 9 },
  partnerships: { pending: 0, submitted: 0, underReview: 0 },
  orders: { paymentPending: 7 },
  admins: { active: 2 },
};

describe('admin nav', () => {
  it('links every ops surface with unique hrefs, ops home first', () => {
    const hrefs = ADMIN_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs[0]).toBe('/admin');
    for (const h of [
      '/admin/applications',
      '/admin/enquiries',
      '/admin/leads',
      '/admin/partnerships',
      '/admin/listings',
      '/admin/orders',
      '/admin/users',
      '/admin/audit-log',
    ]) {
      expect(hrefs).toContain(h);
    }
  });

  it('only highlights ops home on the exact path', () => {
    const [home, apps] = ADMIN_NAV_LINKS;
    expect(isAdminNavActive(home, '/admin')).toBe(true);
    expect(isAdminNavActive(home, '/admin/enquiries')).toBe(false);
    expect(isAdminNavActive(apps, '/admin/applications/abc')).toBe(true);
  });

  it('header admin entry still lands on ops home', () => {
    expect(getAccountNavLinks('PLATFORM_ADMIN')[0].href).toBe('/admin');
  });
});

describe('audit helpers', () => {
  it('labels every audit kind', () => {
    expect(Object.keys(AUDIT_KIND_LABELS).sort()).toEqual([...AUDIT_KINDS].sort());
  });

  it('deep-links subjects to their record', () => {
    expect(auditSubjectHref({ kind: 'KYC', subject: { id: 'o1', label: 'Acme' } })).toBe(
      '/admin/applications/o1',
    );
    expect(auditSubjectHref({ kind: 'LISTING', subject: { id: 'l1', label: 'X' } })).toBe(
      '/admin/listings/l1',
    );
    expect(
      auditSubjectHref({ kind: 'USER', subject: { id: 'u1', label: 'a+b@x.com' } }),
    ).toBe('/admin/users?search=a%2Bb%40x.com');
    expect(auditSubjectHref({ kind: 'PARTNERSHIP', subject: { id: 'p', label: 'P' } })).toBe(
      '/admin/partnerships',
    );
  });

  it('builds a minimal query string with paging', () => {
    expect(buildAuditQuery({})).toBe('take=25');
    const q = new URLSearchParams(
      buildAuditQuery({
        kinds: ['KYC', 'LISTING'],
        search: ' acme ',
        from: '2026-11-01',
        to: '2026-11-04',
        page: 2,
      }),
    );
    expect(q.get('kind')).toBe('KYC,LISTING');
    expect(q.get('search')).toBe('acme');
    expect(q.get('from')).toBe('2026-11-01');
    expect(q.get('skip')).toBe('50');
    expect(q.get('take')).toBe('25');
  });

  it('computes page counts and actor labels', () => {
    expect(auditPageCount(0)).toBe(1);
    expect(auditPageCount(26)).toBe(2);
    expect(auditActorLabel(null)).toBe('System');
    expect(auditActorLabel({ id: 'abcdef123456', email: null })).toBe('User abcdef12');
    expect(auditActorLabel({ id: 'x', email: 'a@b.com' })).toBe('a@b.com');
  });
});

describe('ops cards', () => {
  it('flags queues with pending work and links to the right pages', () => {
    const cards = buildOpsCards(queues);
    const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
    expect(byKey.kyc).toMatchObject({ value: 3, alert: true, href: '/admin/applications' });
    expect(byKey.enquiries).toMatchObject({ value: 5, alert: true });
    expect(byKey.leads.href).toBe('/admin/leads?stale=true');
    expect(byKey.partnerships.alert).toBe(false);
    expect(byKey.listings.alert).toBe(false);
    expect(byKey.orders.alert).toBe(false);
  });
});

describe('user management actions', () => {
  const base = {
    role: 'PARTNER',
    accountType: 'MANUFACTURER',
    disabledAt: null,
    organization: { id: 'o' },
  };

  it('offers nothing on your own row', () => {
    expect(availableUserActions({ ...base, id: 'me' }, 'me')).toEqual([]);
  });

  it('offers promote/reset/disable for customers', () => {
    expect(availableUserActions({ ...base, id: 'u' }, 'me')).toEqual([
      'promote',
      'reset',
      'disable',
    ]);
  });

  it('offers demote only for admins that own an organization', () => {
    const admin = { ...base, id: 'a', role: 'PLATFORM_ADMIN' };
    expect(availableUserActions(admin, 'me')).toContain('demote');
    expect(
      availableUserActions({ ...admin, organization: null }, 'me'),
    ).not.toContain('demote');
  });

  it('offers enable for disabled users', () => {
    expect(
      availableUserActions({ ...base, id: 'u', disabledAt: '2026-11-01' }, 'me'),
    ).toContain('enable');
  });

  it('maps account types to the matching role', () => {
    expect(roleForAccountType('BUYER_ENTERPRISE')).toBe('BUYER');
    expect(roleForAccountType('GOVERNMENT_PSU')).toBe('GOVERNMENT');
    expect(roleForAccountType('TECHNOLOGY_COMPANY')).toBe('PARTNER');
  });
});
