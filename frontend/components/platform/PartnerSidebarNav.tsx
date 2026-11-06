'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; exact?: boolean; icon: string };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Home',
    items: [{ href: '/partner', label: 'Dashboard', exact: true, icon: 'bi-speedometer2' }],
  },
  {
    title: 'Onboarding',
    items: [
      { href: '/partner/application', label: 'Application', icon: 'bi-file-earmark-person' },
      { href: '/partner/documents', label: 'Documents', icon: 'bi-folder2-open' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/partner/catalog', label: 'Catalog', icon: 'bi-grid' },
      { href: '/partner/orders', label: 'Orders', icon: 'bi-box-seam' },
      { href: '/partner/rfqs', label: 'RFQs', icon: 'bi-file-earmark-text' },
    ],
  },
  {
    title: 'Inbox',
    items: [
      { href: '/partner/leads', label: 'Leads', icon: 'bi-person-lines-fill' },
      { href: '/partner/enquiries', label: 'Enquiries', icon: 'bi-inbox' },
      { href: '/partner/messages', label: 'Messages', icon: 'bi-chat-dots' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/partner/services', label: 'Services', icon: 'bi-tools' },
      { href: '/partner/service-requests', label: 'Service jobs', icon: 'bi-briefcase' },
      { href: '/partner/training', label: 'Training', icon: 'bi-mortarboard' },
      { href: '/partner/partnerships', label: 'Partnerships', icon: 'bi-diagram-3' },
      { href: '/partner/analytics', label: 'Analytics', icon: 'bi-graph-up' },
      { href: '/partner/subscription', label: 'Subscription', icon: 'bi-credit-card' },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PartnerSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="platform-partner-app-nav" aria-label="Partner hub">
      {groups.map((group) => (
        <div key={group.title} className="platform-partner-app-nav-group">
          <p className="platform-partner-app-nav-group-title">{group.title}</p>
          <ul className="platform-partner-app-nav-list">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`platform-partner-app-nav-link${active ? ' platform-partner-app-nav-link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <i className={`bi ${item.icon}`} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
