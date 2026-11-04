'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPartnerSubscription, type PartnerSubscription } from '@/lib/api/partner-hub';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ApiError } from '@/lib/api/types';

export default function PartnerSubscriptionPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <SubscriptionInner />
    </RequireAuth>
  );
}

function SubscriptionInner() {
  const [data, setData] = useState<PartnerSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPartnerSubscription()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load plan'),
      );
  }, []);

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Subscription"
          subtitle="Your GarudHub plan and usage. Paid plans and self-serve billing are on the roadmap."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!data && !error && <PlatformLoading />}
          {data && (
            <>
              <section className="platform-card" aria-labelledby="plan-heading">
                <h2 id="plan-heading">
                  {data.plan.name} <StatusBadge status={data.plan.status} />
                </h2>
                <p>{data.plan.description}</p>
                <p className="platform-muted">
                  Price: <strong>{data.plan.priceInr === 0 ? 'Free during launch' : `₹${data.plan.priceInr}`}</strong>{' '}
                  · Listings used: <strong>{data.usage.listings}</strong>
                  {data.usage.listingLimit == null ? ' (no limit)' : ` of ${data.usage.listingLimit}`}
                </p>
                <p className="platform-muted platform-text-sm">
                  {data.billingEnabled
                    ? 'Billing is enabled for your account.'
                    : 'No payment method is required and nothing will be charged.'}
                </p>
              </section>

              <div className="platform-form-field-pair">
                <section className="platform-card">
                  <h2>Included</h2>
                  <ul className="platform-list">
                    {data.entitlements.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </section>
                <section className="platform-card">
                  <h2>Coming next</h2>
                  <ul className="platform-list">
                    {data.roadmap.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <p className="platform-muted platform-text-sm">
                Looking for a record of approvals and moderation decisions?{' '}
                <Link href="/partner/activity">View activity log</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
