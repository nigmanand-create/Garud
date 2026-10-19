'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Partner Applications', exact: true },
  { href: '/admin/listings', label: 'Listing Moderation' },
  { href: '/admin/orders', label: 'Order Oversight' },
];

export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <nav className="platform-partner-subnav" aria-label="Admin sections" style={{ marginBottom: '1.5rem' }}>
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
