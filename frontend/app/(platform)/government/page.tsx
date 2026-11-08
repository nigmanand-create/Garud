'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import {
  GovernmentListingCta,
  governmentListingCta,
} from '@/components/platform/GovernmentListingCta';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { listGovOpportunities, type GovOpportunity } from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import {
  closingLabel,
  formatInrCompact,
  GOV_TYPE_LABELS,
  INDIAN_STATES,
  type GovOpportunityType,
} from '@/lib/platform/verticals';

export default function GovernmentOpportunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const [type, setType] = useState<GovOpportunityType | ''>('');
  const [state, setState] = useState('');
  const [q, setQ] = useState('');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [items, setItems] = useState<GovOpportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    const t = setTimeout(() => {
      listGovOpportunities({
        type: type || undefined,
        state: state || undefined,
        q: q.trim() || undefined,
        includeExpired,
      })
        .then((r) => setItems(r.items))
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load opportunities'));
    }, 250);
    return () => clearTimeout(t);
  }, [type, state, q, includeExpired]);

  const emptyStatePrimary = useMemo(
    () => governmentListingCta(user, authLoading),
    [user, authLoading],
  );

  return (
    <>
      <PlatformPageHeader
        title="Government tenders, schemes & subsidies"
        subtitle="Drone-related tenders, procurement schemes and subsidies curated by GarudHub. Express interest and our team connects you with the right partners."
        breadcrumbs={[{ label: 'Services', href: '/services' }, { label: 'Government' }]}
        actions={<GovernmentListingCta />}
      />
      {error && <div className="platform-card platform-error">{error}</div>}

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="gov-q">Search</label>
          <input id="gov-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, issuing body, reference" />
        </div>
        <div>
          <label htmlFor="gov-type">Type</label>
          <select id="gov-type" value={type} onChange={(e) => setType(e.target.value as GovOpportunityType | '')}>
            <option value="">All</option>
            {(Object.keys(GOV_TYPE_LABELS) as GovOpportunityType[]).map((t) => (
              <option key={t} value={t}>
                {GOV_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gov-state">State</label>
          <select id="gov-state" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Any</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gov-expired">
            <input
              id="gov-expired"
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
            />{' '}
            Include closed
          </label>
        </div>
      </div>

      {!items && !error && <PlatformLoading />}
      {items && items.length === 0 && (
        <EmptyState
          title="No open tenders or schemes right now"
          description="New opportunities are added regularly. Tell us about your programme and we will help."
          primaryAction={emptyStatePrimary}
          secondaryAction={{
            label: 'General government programme enquiry',
            href: '/enquiry?service=tender&intent=TENDER&subject=Government%20drone%20programme%20enquiry',
          }}
        />
      )}
      {items && items.length > 0 && (
        <div className="platform-grid">
          {items.map((o) => (
            <article key={o.id} className="platform-card">
              <p>
                <StatusBadge status={o.isExpired ? 'CLOSED' : 'OPEN'} label={GOV_TYPE_LABELS[o.type]} />
              </p>
              <h2 style={{ marginTop: 0 }}>
                <Link href={`/government/${o.id}`}>{o.title}</Link>
              </h2>
              <p className="platform-text-muted">
                {o.issuingBody}
                {o.state ? ` · ${o.state}` : ''}
                {o.referenceNo ? ` · ${o.referenceNo}` : ''}
              </p>
              <p>{o.summary}</p>
              <p>
                <strong>{formatInrCompact(o.estimatedValueInr)}</strong> · {closingLabel(o.closingDate)}
              </p>
              <Link href={`/government/${o.id}`} className="platform-btn platform-btn-secondary platform-btn-sm">
                View &amp; express interest
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
