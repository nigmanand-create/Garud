'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { DataTable } from '@/components/platform/DataTable';
import { Button } from '@/components/platform/Button';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingReviewStatus, ListingType, VerificationStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type Listing = {
  id: string;
  name: string;
  listingType: ListingType;
  category: CatalogCategory;
  isPublished: boolean;
  reviewStatus: ListingReviewStatus;
  rejectionReason?: string | null;
  primaryImageUrl?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
};

type PartnerMe = {
  canListProducts: boolean;
  verificationStatus: VerificationStatus;
};

export default function PartnerCatalogPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <CatalogInner />
    </RequireAuth>
  );
}

function CatalogTableSkeleton() {
  const rows = [0, 1, 2, 3];
  return (
    <div className="platform-card" aria-busy="true" aria-label="Loading catalog">
      <div className="platform-table-wrap">
        <table className="platform-table platform-table--catalog">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i} className="platform-table-skeleton-row">
                <td>
                  <div className="platform-catalog-name-cell">
                    <div className="platform-catalog-thumb platform-skeleton" aria-hidden />
                    <div className="platform-skeleton platform-skeleton-bar--sm" style={{ width: '8rem' }} />
                  </div>
                </td>
                <td>
                  <div className="platform-skeleton" style={{ width: '5rem' }} />
                </td>
                <td>
                  <div className="platform-skeleton" style={{ width: '6rem' }} />
                </td>
                <td>
                  <div className="platform-skeleton" style={{ width: '4rem' }} />
                </td>
                <td>
                  <div className="platform-skeleton" style={{ width: '7rem' }} />
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogInner() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [partner, setPartner] = useState<PartnerMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  function loadListings() {
    Promise.all([
      apiRequest<Listing[]>('/partner/catalog/listings', { auth: true }),
      apiRequest<PartnerMe>('/partner/me', { auth: true }),
    ])
      .then(([l, p]) => {
        setListings(l);
        setPartner(p);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load listings'),
      );
  }

  useEffect(() => {
    loadListings();
  }, []);

  async function handleSubmitForReview(id: string) {
    setSubmittingId(id);
    setError(null);
    try {
      await apiRequest(`/partner/catalog/listings/${id}/submit-for-review`, {
        method: 'POST',
        auth: true,
      });
      loadListings();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Submission failed');
    } finally {
      setSubmittingId(null);
    }
  }

  const canCreate = partner?.canListProducts ?? false;

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Catalog"
          subtitle="Manage items visible on the public marketplace once approved by platform admin."
          actions={
            canCreate ? (
              <Link
                href="/partner/catalog/new"
                className="platform-btn platform-btn-cta"
              >
                New listing
              </Link>
            ) : (
              <span className="platform-muted platform-page-header-actions-hint">
                Verify to publish
              </span>
            )
          }
          badge={
            partner ? (
              <StatusBadge status={partner.verificationStatus} />
            ) : undefined
          }
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!partner?.canListProducts && partner && (
            <div className="platform-callout platform-callout--partner">
              Marketplace publishing unlocks after Garud approves your partner
              application. You can still prepare draft listings once verified.
            </div>
          )}
          {listings === null && !error && <CatalogTableSkeleton />}
          {listings && listings.length > 0 && (
            <DataTable className="platform-card" tableClassName="platform-table platform-table--catalog">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="platform-catalog-name-cell">
                        {l.primaryImageUrl ? (
                          <img
                            src={l.primaryImageUrl}
                            alt=""
                            className="platform-catalog-thumb-img"
                          />
                        ) : (
                          <div className="platform-catalog-thumb" aria-hidden>
                            <span>✦</span>
                          </div>
                        )}
                        <div>
                          <strong className="platform-text-sm">{l.name}</strong>
                          {l.reviewStatus === 'REJECTED' && l.rejectionReason && (
                            <div className="platform-rejection-inline">
                              <strong>Issue:</strong> {l.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{LISTING_TYPE_LABELS[l.listingType]}</td>
                    <td>{CATEGORY_LABELS[l.category]}</td>
                    <td>{formatPrice(l.priceOnRequest, l.priceInr)}</td>
                    <td>
                      <StatusBadge status={l.reviewStatus} />
                    </td>
                    <td className="platform-table-actions-row">
                      <Link
                        href={`/partner/catalog/${l.id}`}
                        className="platform-action-chip platform-action-chip--neutral"
                      >
                        Edit
                      </Link>

                      {(l.reviewStatus === 'DRAFT' || l.reviewStatus === 'REJECTED') && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSubmitForReview(l.id)}
                          disabled={submittingId === l.id}
                        >
                          {submittingId === l.id ? 'Submitting…' : 'Submit for review'}
                        </Button>
                      )}

                      {l.isPublished && l.reviewStatus === 'APPROVED' && (
                        <Link
                          href={`/marketplace/listings/${l.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="platform-action-chip platform-action-chip--success"
                        >
                          View live ↗
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
      )}
          {listings && listings.length === 0 && !error && (
            <EmptyState
              title="No listings yet"
              description={
                canCreate
                  ? 'Create your first product or service listing to appear in marketplace search and RFQ matching.'
                  : 'Complete partner verification to publish on the marketplace. Draft your catalog after approval.'
              }
              primaryAction={
                canCreate
                  ? { label: 'Create listing', href: '/partner/catalog/new' }
                  : { label: 'View onboarding', href: '/partner' }
              }
              secondaryAction={{
                label: 'Partner application',
                href: '/partner/application',
              }}
              icon="📦"
            />
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
