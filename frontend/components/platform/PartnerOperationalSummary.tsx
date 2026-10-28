'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import type {
  ListingReviewStatus,
  PartnerOrderListItem,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type RfqInviteRow = {
  id: string;
  status: string;
  rfq: { id: string; status: string };
};

type CatalogRow = {
  id: string;
  reviewStatus: ListingReviewStatus;
};

type SummaryState = {
  openRfqs: number;
  ordersToFulfill: number;
  catalogDrafts: number;
  catalogPending: number;
  catalogRejected: number;
};

function countCatalogByStatus(
  listings: CatalogRow[],
  status: ListingReviewStatus,
) {
  return listings.filter((l) => l.reviewStatus === status).length;
}

export function PartnerOperationalSummary() {
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<RfqInviteRow[]>('/partner/rfqs', { auth: true }),
      apiRequest<PartnerOrderListItem[]>('/partner/orders', { auth: true }),
      apiRequest<CatalogRow[]>('/partner/catalog/listings', { auth: true }),
    ])
      .then(([rfqs, orders, listings]) => {
        const openRfqs = rfqs.filter((r) => r.rfq.status === 'OPEN').length;
        const ordersToFulfill = orders.filter(
          (o) =>
            o.fulfillmentStatus === 'PENDING' ||
            o.fulfillmentStatus === 'PROCESSING',
        ).length;
        setSummary({
          openRfqs,
          ordersToFulfill,
          catalogDrafts: countCatalogByStatus(listings, 'DRAFT'),
          catalogPending: countCatalogByStatus(listings, 'PENDING_REVIEW'),
          catalogRejected: countCatalogByStatus(listings, 'REJECTED'),
        });
      })
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

  const items = [
    {
      label: 'Open RFQ invites',
      value: summary.openRfqs,
      href: '/partner/rfqs',
    },
    {
      label: 'Orders to fulfill',
      value: summary.ordersToFulfill,
      href: '/partner/orders',
    },
    {
      label: 'Catalog drafts',
      value: summary.catalogDrafts,
      href: '/partner/catalog',
    },
    {
      label: 'Pending review',
      value: summary.catalogPending,
      href: '/partner/catalog',
    },
    {
      label: 'Needs fixes',
      value: summary.catalogRejected,
      href: '/partner/catalog',
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
          RFQs, orders, and catalog moderation status.
        </p>
      </div>
      <ul className="platform-partner-ops-grid">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="platform-partner-ops-stat">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
