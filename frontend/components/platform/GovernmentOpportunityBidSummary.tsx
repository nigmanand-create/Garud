'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import { getMyGovBid } from '@/lib/api/gov';
import { formatInrCompact } from '@/lib/platform/verticals';

/** Prominent sealed-bid status on tender detail (above the bid form). */
export function GovernmentOpportunityBidSummary({ opportunityId }: { opportunityId: string }) {
  const { user } = useAuth();
  const [bid, setBid] = useState<{
    amountInr: string | number;
    hasDocument: boolean;
    submittedAt: string;
  } | null>(null);
  const [unknown, setUnknown] = useState(true);

  const canBid = user && (user.role === 'BUYER' || user.role === 'GOVERNMENT');

  useEffect(() => {
    if (!canBid) {
      setUnknown(false);
      return;
    }
    getMyGovBid(opportunityId)
      .then((res) => {
        setBid(res.bid ?? null);
        setUnknown(false);
      })
      .catch(() => setUnknown(false));
  }, [canBid, opportunityId]);

  if (!canBid || unknown) return null;
  if (!bid) return null;

  return (
    <div className="platform-card platform-notice" style={{ marginBottom: '1rem' }}>
      <p style={{ margin: 0 }}>
        <strong>Your sealed bid:</strong> {formatInrCompact(bid.amountInr)}
        {bid.hasDocument ? ' · Proposal on file' : ''}
        <span className="platform-muted">
          {' '}
          · Last updated {new Date(bid.submittedAt).toLocaleString('en-IN')}
        </span>
      </p>
      <p className="platform-text-sm platform-muted" style={{ margin: '0.5rem 0 0' }}>
        You can update your bid below until the closing date.
      </p>
    </div>
  );
}
