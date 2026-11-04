'use client';

import Link from 'next/link';
import { COMPARE_MAX, compareHref } from '@/lib/platform/compare';
import { useCompare } from './useCompare';

/** Sticky bar shown once at least one product is selected for comparison. */
export function CompareTray() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;

  const canCompare = ids.length >= 2;

  return (
    <div className="platform-compare-tray" role="region" aria-label="Product comparison">
      <span className="platform-compare-tray__count">
        <strong>{ids.length}</strong> of {COMPARE_MAX} selected
        {!canCompare && <span className="platform-muted"> · pick at least 2</span>}
      </span>
      <div className="platform-compare-tray__actions">
        <button type="button" className="platform-btn platform-btn-secondary platform-btn-sm" onClick={clear}>
          Clear
        </button>
        {canCompare ? (
          <Link href={compareHref(ids)} className="platform-btn platform-btn-cta platform-btn-sm">
            Compare products →
          </Link>
        ) : (
          <button type="button" className="platform-btn platform-btn-cta platform-btn-sm" disabled>
            Compare products →
          </button>
        )}
      </div>
    </div>
  );
}
