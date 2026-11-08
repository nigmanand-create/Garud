'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth, useAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { GovernmentListingCta, governmentListingCta } from '@/components/platform/GovernmentListingCta';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { listMyGovBids, type MyGovBidRow } from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import { formatInrCompact, GOV_TYPE_LABELS, govTenderListingEnquiryHref } from '@/lib/platform/verticals';

export default function GovernmentDashboardPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']} loginIntent="buyer">
      <GovernmentDashboardInner />
    </RequireAuth>
  );
}

function GovernmentDashboardInner() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MyGovBidRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyGovBids()
      .then((r) => setRows(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load bids'));
  }, []);

  const listingCta = user ? governmentListingCta(user, authLoading) : null;

  return (
    <>
      <PlatformPageHeader
        title="Government — My work"
        subtitle="Your sealed tender bids, shortcuts to live opportunities, and programme intake."
        breadcrumbs={[
          { label: 'Services', href: '/services' },
          { label: 'Government', href: '/government' },
          { label: 'My work' },
        ]}
        actions={<GovernmentListingCta />}
      />

      <div className="platform-card platform-form" style={{ marginBottom: '1.25rem' }}>
        <h2 className="platform-section-heading" style={{ marginTop: 0 }}>
          Quick links
        </h2>
        <ul className="platform-list">
          <li>
            <Link href="/government">Browse open opportunities</Link>
          </li>
          {listingCta && (
            <li>
              <Link href={listingCta.href}>{listingCta.label}</Link>
            </li>
          )}
          <li>
            <Link href={govTenderListingEnquiryHref()}>Open tender listing enquiry form</Link>
          </li>
          <li>
            <Link
              href="/enquiry?service=tender&intent=TENDER&subject=Government%20drone%20programme%20enquiry"
            >
              General government programme enquiry
            </Link>
          </li>
        </ul>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      {rows === null && !error && <PlatformLoading />}

      {rows && rows.length === 0 && !error && (
        <EmptyState
          title="No sealed bids yet"
          description="Open a published tender and submit your sealed bid (amount and optional proposal) before the closing date."
          primaryAction={{ href: '/government', label: 'Browse opportunities' }}
          secondaryAction={
            listingCta
              ? { href: listingCta.href, label: listingCta.label }
              : { href: '/enquiry?intent=TENDER', label: 'Contact GarudHub' }
          }
        />
      )}

      {rows && rows.length > 0 && (
        <div className="platform-card">
          <h2 className="platform-section-heading" style={{ marginTop: 0 }}>
            My sealed bids
          </h2>
          <p className="platform-muted platform-text-sm">
            Amounts stay private to you until the tender closes; GarudHub ops can review after unseal.
          </p>
          <ul className="platform-list" style={{ listStyle: 'none', padding: 0 }}>
            {rows.map((row) => (
              <li
                key={row.id}
                className="platform-card"
                style={{ marginBottom: '0.75rem', border: '1px solid var(--platform-border, #e2e8f0)' }}
              >
                <p style={{ margin: '0 0 0.35rem' }}>
                  <strong>{GOV_TYPE_LABELS[row.opportunity.type]}</strong>
                  {row.opportunity.referenceNo ? ` · ${row.opportunity.referenceNo}` : ''}
                </p>
                <h3 style={{ margin: '0 0 0.35rem' }}>
                  <Link href={`/government/${row.opportunityId}`}>{row.opportunity.title}</Link>
                </h3>
                <p className="platform-text-muted" style={{ margin: '0 0 0.35rem' }}>
                  {row.opportunity.issuingBody}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>{formatInrCompact(row.amountInr)}</strong>
                  {row.hasDocument ? ' · Proposal attached' : ''}
                  <span className="platform-muted">
                    {' '}
                    · Updated {new Date(row.submittedAt).toLocaleString('en-IN')}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
