'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { govTenderListingEnquiryHref } from '@/lib/platform/verticals';

type NavItem = { href: string; label: string; exact?: boolean; icon: string };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Government',
    items: [
      {
        href: '/government/dashboard',
        label: 'My work',
        exact: true,
        icon: 'bi-speedometer2',
      },
      { href: '/government', label: 'Browse opportunities', icon: 'bi-building' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { href: '/buyer/rfqs', label: 'My RFQs', icon: 'bi-file-earmark-text' },
      { href: '/buyer/orders', label: 'My orders', icon: 'bi-box-seam' },
      { href: '/buyer/cart', label: 'Cart', icon: 'bi-cart3' },
    ],
  },
  {
    title: 'GarudHub',
    items: [
      {
        href: '/services#government',
        label: 'Services overview',
        icon: 'bi-grid',
      },
      {
        href: '/enquiry?service=tender&intent=TENDER&subject=' + encodeURIComponent('Government drone programme enquiry'),
        label: 'Programme enquiry',
        icon: 'bi-chat-dots',
      },
      {
        href: govTenderListingEnquiryHref(),
        label: 'Submit tender for listing',
        icon: 'bi-send',
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href.startsWith('/enquiry')) return false;
  if (item.href.startsWith('/services#')) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function GovernmentSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="platform-partner-app-nav" aria-label="Government hub">
      {groups.map((group) => (
        <div key={group.title} className="platform-partner-app-nav-group">
          <p className="platform-partner-app-nav-group-title">{group.title}</p>
          <ul className="platform-partner-app-nav-list">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={`${group.title}-${item.href}-${item.label}`}>
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
