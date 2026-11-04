'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPartnerOverview, type PartnerOverview } from '@/lib/api/partner-hub';
import { ApiError } from '@/lib/api/types';

export function PartnerOperationalSummary() {
  const [summary, setSummary] = useState<PartnerOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPartnerOverview()
      .then(setSummary)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load summary'),
      );
  }, []);

  if (error) {
    return (
      <div className="platform-card platform-error platform-text-sm">{error}</div>
    );
  }

  if (!summary) {
    return (
      <div className="platform-card platform-partner-ops-summary" aria-busy="true">
        <h2 className="platform-partner-ops-summary-title">Operations</h2>
        <p className="platform-muted">Loading activity…</p>
      </div>
    );
  }

  const groups: {
    title: string;
    items: { label: string; value: number; href: string; highlight?: boolean }[];
  }[] = [
    {
      title: 'Needs your attention',
      items: [
        { label: 'RFQs awaiting your quote', value: summary.rfq.awaitingQuote, href: '/partner/rfqs', highlight: true },
        { label: 'Orders to fulfill', value: summary.ordersToFulfill, href: '/partner/orders', highlight: true },
        { label: 'New leads', value: summary.newLeads, href: '/partner/leads', highlight: true },
        { label: 'Unread enquiries', value: summary.newEnquiries, href: '/partner/enquiries', highlight: true },
        { label: 'Unread messages', value: summary.unreadMessages, href: '/partner/messages', highlight: true },
      ],
    },
    {
      title: 'Catalog & growth',
      items: [
        { label: 'Live listings', value: summary.catalog.APPROVED, href: '/partner/catalog' },
        { label: 'Drafts', value: summary.catalog.DRAFT, href: '/partner/catalog' },
        { label: 'Pending review', value: summary.catalog.PENDING_REVIEW, href: '/partner/catalog' },
        { label: 'Needs fixes', value: summary.catalog.REJECTED, href: '/partner/catalog' },
        { label: 'Listing views (30d)', value: summary.views30d, href: '/partner/analytics' },
        { label: 'Open partnership requests', value: summary.pendingPartnerships, href: '/partner/partnerships' },
      ],
    },
  ];

  return (
    <section
      className="platform-card platform-partner-ops-summary"
      aria-labelledby="partner-ops-heading"
    >
      <div className="platform-partner-ops-summary-head">
        <h2 id="partner-ops-heading" className="platform-partner-ops-summary-title">
          Operations at a glance
        </h2>
        <p className="platform-muted platform-text-sm">
          Live counts across RFQs, orders, leads, messages, and catalog moderation.
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="platform-text-sm platform-muted">{g.title}</h3>
          <ul className="platform-partner-ops-grid">
            {g.items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`platform-partner-ops-stat${item.highlight && item.value > 0 ? ' platform-partner-ops-stat--alert' : ''}`}
                >
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="platform-text-sm platform-muted">
        <Link href="/partner/activity">Activity log</Link> · <Link href="/partner/analytics">Analytics</Link>
      </p>
    </section>
  );
}
