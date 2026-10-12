import Link from 'next/link';
import type { PartnerOnboardingInput } from '@/lib/platform/partner-onboarding';
import { getPartnerPrimaryCta } from '@/lib/platform/partner-onboarding';

type ShortcutItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  iconClass: string;
  muted?: boolean;
};

function hrefMatchesPrimary(itemHref: string, primaryHref: string): boolean {
  if (itemHref === primaryHref) return true;
  if (
    itemHref === '/partner/catalog' &&
    primaryHref.startsWith('/partner/catalog')
  ) {
    return true;
  }
  return false;
}

export function PartnerShortcuts({ data }: { data: PartnerOnboardingInput }) {
  const primaryCta = getPartnerPrimaryCta(data);
  const onboardingComplete = data.verificationStatus === 'APPROVED';

  const items: ShortcutItem[] = [
    {
      id: 'application',
      href: '/partner/application',
      title: 'Complete application',
      description: 'Company profile and verification details.',
      iconClass: 'ph ph-clipboard-text',
    },
    {
      id: 'documents',
      href: '/partner/documents',
      title: 'Upload documents',
      description: 'GST, registration, and authorization files.',
      iconClass: 'ph ph-upload-simple',
    },
    {
      id: 'catalog',
      href: '/partner/catalog',
      title: 'Manage catalog',
      description: 'Add or edit marketplace listings.',
      iconClass: 'ph ph-package',
    },
    {
      id: 'orders',
      href: '/partner/orders',
      title: 'View orders',
      description: 'Incoming checkout orders from buyers.',
      iconClass: 'ph ph-receipt',
      muted: !onboardingComplete,
    },
    {
      id: 'rfqs',
      href: '/partner/rfqs',
      title: 'RFQ inbox',
      description: 'Respond to buyer quote requests.',
      iconClass: 'ph ph-inbox',
    },
    {
      id: 'marketplace',
      href: '/marketplace',
      title: 'Preview marketplace',
      description: onboardingComplete
        ? 'See how buyers discover your listings.'
        : 'Available after Garud approves your profile.',
      iconClass: 'ph ph-storefront',
      muted: !onboardingComplete,
    },
  ];

  return (
    <section className="platform-partner-shortcuts" aria-labelledby="partner-shortcuts-heading">
      <h2 id="partner-shortcuts-heading" className="platform-partner-shortcuts-heading">
        What do you want to do?
      </h2>
      <p className="platform-muted platform-partner-shortcuts-lead">
        Jump to common partner tasks without hunting through the menu.
      </p>
      <ul className="platform-partner-shortcuts-grid">
        {items.map((item) => {
          const isPrimary =
            primaryCta !== null && hrefMatchesPrimary(item.href, primaryCta.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`platform-partner-shortcut-card${isPrimary ? ' platform-partner-shortcut-card--primary' : ''}${item.muted ? ' platform-partner-shortcut-card--muted' : ''}`}
              >
                <span className="platform-partner-shortcut-icon" aria-hidden>
                  <i className={item.iconClass} />
                </span>
                <span className="platform-partner-shortcut-text">
                  <span className="platform-partner-shortcut-title">{item.title}</span>
                  <span className="platform-partner-shortcut-desc platform-muted">
                    {item.description}
                  </span>
                </span>
                <span className="platform-partner-shortcut-chevron" aria-hidden>
                  <i className="ph ph-caret-right" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
