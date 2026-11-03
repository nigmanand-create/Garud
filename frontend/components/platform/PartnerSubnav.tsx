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

/** Spec sidebar modules not yet shipped — shown for roadmap clarity (no dead routes). */
const ROADMAP_MODULES = [
  'Leads',
  'Enquiries',
  'Messages',
  'Analytics',
  'Subscription',
] as const;

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
        {ROADMAP_MODULES.map((label) => (
          <span
            key={label}
            className="platform-section-tab platform-section-tab--roadmap"
            title="On the GarudHub roadmap — use RFQs and Orders for commercial leads today."
          >
            {label}
            <span className="platform-section-tab-soon">Soon</span>
          </span>
        ))}
      </div>
      <p className="platform-partner-subnav-note platform-muted platform-text-sm">
        RFQs and orders cover buyer quote requests and checkout today. Leads, enquiries inbox, and
        analytics are coming next.
      </p>
    </nav>
  );
}
