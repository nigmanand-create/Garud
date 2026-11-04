'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_NAV_LINKS, isAdminNavActive } from '@/lib/platform/admin-ops';

export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <nav className="platform-partner-subnav" aria-label="Admin sections" style={{ marginBottom: '1.5rem' }}>
      <div className="platform-section-tabs platform-partner-subnav-tabs">
        {ADMIN_NAV_LINKS.map((l) => {
          const active = isAdminNavActive(l, pathname);
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
