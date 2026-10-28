'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { Button } from '@/components/platform/Button';
import { FormField } from '@/components/platform/FormField';
import {
  ACCOUNT_TYPE_LABELS,
  CATEGORY_LABELS,
  formatEnumLabel,
  formatPrice,
} from '@/lib/platform/labels';
import type { AdminListingDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function AdminListingDetailPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <ListingDetailInner />
    </RequireAuth>
  );
}

function timelineStatusClass(status: string): string {
  if (status === 'APPROVED') return 'platform-text-success';
  if (status === 'REJECTED') return 'platform-text-danger';
  return 'platform-text-info';
}

function ListingDetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [unpublishReason, setUnpublishReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const rejectionPresets = [
    'Missing technical specifications & payload data',
    'Imagery does not meet quality or compliance standards',
    'Pricing or Price-on-Request justification missing',
    'Uncertified equipment or missing DGCA type certificate',
    'Incomplete warranty and minimum order terms',
  ];

  function load() {
    setLoading(true);
    apiRequest<AdminListingDetail>(`/admin/listings/${id}`, { auth: true })
      .then((res) => {
        setListing(res);
        setActiveImage(res.primaryImageUrl || res.galleryImageUrls?.[0] || null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Listing not found');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleApprove() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await apiRequest(`/admin/listings/${id}/approve`, {
        method: 'POST',
        auth: true,
        body: approvalNote.trim() ? { note: approvalNote.trim() } : {},
      });
      setMessage('Listing approved and published to the public marketplace.');
      setApprovalNote('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approval failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejecting the listing.');
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await apiRequest(`/admin/listings/${id}/reject`, {
        method: 'POST',
        auth: true,
        body: { reason: rejectReason.trim() },
      });
      setMessage('Listing marked as Rejected. Feedback stored for the seller to resolve.');
      setRejectReason('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rejection failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish(e: FormEvent) {
    e.preventDefault();
    if (!unpublishReason.trim()) {
      setError('Please provide a reason for taking down the listing.');
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await apiRequest(`/admin/listings/${id}/unpublish`, {
        method: 'POST',
        auth: true,
        body: { reason: unpublishReason.trim() },
      });
      setMessage('Listing unpublished from marketplace.');
      setUnpublishReason('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unpublish failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !listing) {
    return (
      <>
        <PlatformPageHeader title="Listing review" subtitle="Loading listing inspection data…" />
        <AdminSubnav />
        <p className="platform-muted platform-loading-center">Loading listing inspection data…</p>
      </>
    );
  }

  const allImages = [
    ...(listing?.primaryImageUrl ? [listing.primaryImageUrl] : []),
    ...(listing?.galleryImageUrls || []),
  ];

  return (
    <>
      {listing && (
        <PlatformPageHeader
          title={listing.name}
          subtitle={
            <>
              {listing.brand && <strong>{listing.brand} · </strong>}
              <span>{CATEGORY_LABELS[listing.category] || listing.category}</span>
              {listing.sku && <span> · Model/SKU: {listing.sku}</span>}
              <span> · {listing.listingType === 'PRODUCT' ? 'Hardware / Drone' : 'Service Offering'}</span>
            </>
          }
          backHref="/admin/listings"
          backLabel="Moderation queue"
          actions={
            listing.isPublished ? (
              <Link
                href={`/marketplace/listings/${listing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-inline-link"
              >
                View live on marketplace ↗
              </Link>
            ) : undefined
          }
          badge={
            <span className="platform-status-row--wrap">
              <StatusBadge status={listing.reviewStatus} />
              {listing.isPublished && <span className="platform-badge-live">LIVE ON MARKETPLACE</span>}
            </span>
          }
        />
      )}
      {!listing && !loading && (
        <PlatformPageHeader title="Listing review" backHref="/admin/listings" backLabel="Moderation queue" />
      )}
      <AdminSubnav />

      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {listing && (
        <>
          <div className="mod-spec-grid platform-card--lg">
            <div className="mod-spec-item">
              <div className="mod-spec-label">Pricing</div>
              <div className="mod-spec-val">{formatPrice(listing.priceOnRequest, listing.priceInr)}</div>
            </div>
            <div className="mod-spec-item">
              <div className="mod-spec-label">Min Order (MOQ)</div>
              <div className="mod-spec-val">{listing.minOrderQuantity ?? 1} units</div>
            </div>
            <div className="mod-spec-item">
              <div className="mod-spec-label">Warranty</div>
              <div className="mod-spec-val">{listing.warranty || 'Standard / None'}</div>
            </div>
            <div className="mod-spec-item">
              <div className="mod-spec-label">Origin / Base</div>
              <div className="mod-spec-val">
                {[listing.organization.city, listing.organization.state].filter(Boolean).join(', ') ||
                  listing.organization.country}
              </div>
            </div>
          </div>

          <div className="platform-admin-detail">
            <div className="platform-stack platform-stack--lg">
              <div className="platform-card platform-card--lg">
                <h2 className="platform-section-heading">Visual Inspection & Media</h2>

                {activeImage ? (
                  <img src={activeImage} alt={listing.name} className="mod-gallery-main" />
                ) : (
                  <div className="platform-gallery-empty">
                    <div className="platform-gallery-empty__icon" aria-hidden>
                      📷
                    </div>
                    <div>No images submitted with this listing</div>
                  </div>
                )}

                {allImages.length > 1 && (
                  <div>
                    <div className="platform-muted platform-gallery-assets-label">
                      Submitted Assets ({allImages.length} photos) — click to inspect:
                    </div>
                    <div className="mod-gallery-thumbs">
                      {allImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`mod-gallery-thumb-btn ${activeImage === url ? 'mod-gallery-thumb-btn--active' : ''}`}
                          onClick={() => setActiveImage(url)}
                          title={`Asset #${idx + 1}`}
                        >
                          <img src={url} alt={`Asset ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="platform-card platform-card--lg">
                <h2 className="platform-section-heading">Listing Details & Technical Specs</h2>

                {listing.description && (
                  <div className="platform-card--spaced-top">
                    <label className="platform-muted platform-field-label-upper">Product Overview / Description</label>
                    <p className="platform-description-body">{listing.description}</p>
                  </div>
                )}

                {listing.technicalSpecs ? (
                  <div className="platform-card--spaced-top">
                    <label className="platform-muted platform-field-label-upper">
                      Technical Specifications & Parameters
                    </label>
                    <pre className="platform-spec-pre">{listing.technicalSpecs}</pre>
                  </div>
                ) : (
                  <div className="platform-card--spaced-top">
                    <label className="platform-muted platform-field-label-upper">Technical Specifications</label>
                    <p className="platform-muted platform-text-sm">No technical specifications entered.</p>
                  </div>
                )}

                {listing.applications && listing.applications.length > 0 && (
                  <div>
                    <label className="platform-muted platform-field-label-upper">Target Industrial Applications</label>
                    <div className="platform-app-tags">
                      {listing.applications.map((app) => (
                        <span key={app} className="platform-app-tag">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="platform-card">
                <h2 className="platform-section-heading">Moderation Audit History</h2>
                {listing.moderationLogs && listing.moderationLogs.length > 0 ? (
                  <ul className="mod-timeline">
                    {listing.moderationLogs.map((log) => (
                      <li key={log.id} className="mod-timeline-item">
                        <div className="mod-timeline-dot" />
                        <div className="mod-timeline-date">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        <p className="mod-timeline-desc">
                          Transitioned from <strong>{formatEnumLabel(log.fromStatus)}</strong> to{' '}
                          <strong className={timelineStatusClass(log.toStatus)}>
                            {formatEnumLabel(log.toStatus)}
                          </strong>
                        </p>
                        {log.note && <div className="platform-timeline-note">&quot;{log.note}&quot;</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="platform-muted">No review history recorded yet.</p>
                )}
              </div>
            </div>

            <div className="platform-admin-detail__sidebar">
              <div className="mod-passport-card">
                <div className="mod-passport-header">
                  <div className="mod-passport-avatar">
                    {listing.organization.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="mod-passport-company">{listing.organization.companyName}</div>
                    <div className="mod-passport-account-type">
                      {ACCOUNT_TYPE_LABELS[listing.organization.owner.accountType] ||
                        listing.organization.owner.accountType}
                    </div>
                  </div>
                </div>

                <div className="mod-passport-grid">
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Verification:</span>
                    <span className="mod-passport-row-val">
                      <StatusBadge status={listing.organization.verificationStatus} />
                    </span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Contact Person:</span>
                    <span className="mod-passport-row-val">{listing.organization.contactPersonName}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Email:</span>
                    <span className="mod-passport-row-val">{listing.organization.contactEmail}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Phone:</span>
                    <span className="mod-passport-row-val">{listing.organization.contactMobile}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Location:</span>
                    <span className="mod-passport-row-val">
                      {[listing.organization.city, listing.organization.state, listing.organization.country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </div>

                <Link href={`/admin/applications/${listing.organization.id}`} className="platform-passport-link">
                  Inspect Partner KYC Application →
                </Link>
              </div>

              {listing.rejectionReason && (
                <div className="platform-callout-rejection">
                  <strong>Current Rejection Feedback:</strong>
                  <p>{listing.rejectionReason}</p>
                </div>
              )}

              <div className="mod-decision-box">
                <div className="mod-decision-header">
                  <span>⚖</span>
                  <span>Moderation Actions</span>
                </div>

                {listing.reviewStatus !== 'APPROVED' && (
                  <div className="mod-decision-section">
                    <FormField label="Approval verification note (optional)" htmlFor="approve-note">
                      <input
                        id="approve-note"
                        type="text"
                        placeholder="e.g. Verified DGCA compliance & specs"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                      />
                    </FormField>
                    <Button type="button" fullWidth onClick={handleApprove} disabled={busy}>
                      {busy ? 'Processing…' : '✓ Approve & Publish to Marketplace'}
                    </Button>
                  </div>
                )}

                {listing.reviewStatus !== 'REJECTED' && (
                  <div className="mod-decision-section">
                    <form className="platform-form" onSubmit={handleReject}>
                      <FormField
                        label="Rejection Reason (Required)"
                        htmlFor="reject-reason"
                        hint="Shared with seller"
                      >
                        <textarea
                          id="reject-reason"
                          rows={3}
                          placeholder="Specify exactly what the seller must adjust or upload…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </FormField>

                      <p className="platform-muted platform-text-sm">Quick presets:</p>
                      <div className="mod-preset-chips">
                        {rejectionPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="mod-preset-chip"
                            onClick={() => {
                              setRejectReason((prev) => (prev ? `${prev}. ${preset}` : preset));
                            }}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>

                      <Button type="submit" variant="danger" fullWidth disabled={busy || !rejectReason.trim()}>
                        {busy ? 'Processing…' : '✕ Reject Listing & Request Changes'}
                      </Button>
                    </form>
                  </div>
                )}

                {listing.isPublished && (
                  <div className="mod-decision-section">
                    <form className="platform-form" onSubmit={handleUnpublish}>
                      <FormField label="Marketplace Takedown Reason" htmlFor="unpublish-reason">
                        <textarea
                          id="unpublish-reason"
                          rows={2}
                          placeholder="Reason for pulling this listing offline…"
                          value={unpublishReason}
                          onChange={(e) => setUnpublishReason(e.target.value)}
                        />
                      </FormField>
                      <Button
                        type="submit"
                        variant="secondary"
                        fullWidth
                        className="platform-btn-danger-outline"
                        disabled={busy || !unpublishReason.trim()}
                      >
                        {busy ? 'Processing…' : 'Takedown / Unpublish Listing'}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
