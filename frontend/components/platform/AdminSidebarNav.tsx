'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_NAV_LINKS, isAdminNavActive, type AdminNavLink } from '@/lib/platform/admin-ops';

const ICON_BY_HREF: Record<string, string> = {
  '/admin': 'bi-speedometer2',
  '/admin/applications': 'bi-file-earmark-person',
  '/admin/enquiries': 'bi-inbox',
  '/admin/leads': 'bi-person-lines-fill',
  '/admin/service-requests': 'bi-briefcase',
  '/admin/gov-opportunities': 'bi-building',
  '/admin/partnerships': 'bi-diagram-3',
  '/admin/listings': 'bi-grid',
  '/admin/orders': 'bi-box-seam',
  '/admin/analytics': 'bi-graph-up',
  '/admin/billing': 'bi-credit-card',
  '/admin/users': 'bi-people',
  '/admin/audit-log': 'bi-journal-text',
};

const GROUPS: { title: string; hrefs: string[] }[] = [
  {
    title: 'Home',
    hrefs: ['/admin'],
  },
  {
    title: 'Intake & routing',
    hrefs: [
      '/admin/applications',
      '/admin/enquiries',
      '/admin/leads',
      '/admin/service-requests',
    ],
  },
  {
    title: 'Commerce & listings',
    hrefs: [
      '/admin/gov-opportunities',
      '/admin/partnerships',
      '/admin/listings',
      '/admin/orders',
      '/admin/analytics',
    ],
  },
  {
    title: 'Governance',
    hrefs: ['/admin/billing', '/admin/users', '/admin/audit-log'],
  },
];

function linkForHref(href: string): AdminNavLink | undefined {
  return ADMIN_NAV_LINKS.find((l) => l.href === href);
}

export function AdminSidebarNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="platform-admin-app-nav" aria-label="Admin operations">
      {GROUPS.map((group) => {
        const items = group.hrefs
          .map((href) => linkForHref(href))
          .filter((l): l is AdminNavLink => l != null);
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="platform-admin-app-nav-group">
            <p className="platform-admin-app-nav-group-title">{group.title}</p>
            <ul className="platform-admin-app-nav-list">
              {items.map((item) => {
                const active = isAdminNavActive(item, pathname);
                const icon = ICON_BY_HREF[item.href] ?? 'bi-circle';
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`platform-admin-app-nav-link${active ? ' platform-admin-app-nav-link--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <i className={`bi ${icon}`} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
