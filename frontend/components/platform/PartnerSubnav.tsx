'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/partner', label: 'Overview', exact: true },
  { href: '/partner/application', label: 'Application' },
  { href: '/partner/documents', label: 'Documents' },
  { href: '/partner/catalog', label: 'Catalog' },
  { href: '/partner/orders', label: 'Orders' },
  { href: '/partner/rfqs', label: 'RFQs' },
];

export function PartnerSubnav() {
  const pathname = usePathname();
  return (
    <nav className="platform-partner-subnav" aria-label="Partner sections">
      <div className="platform-section-tabs platform-partner-subnav-tabs">
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`platform-section-tab${active ? ' platform-section-tab--active' : ''}`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
