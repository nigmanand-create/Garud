'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { StatusBadge } from '@/components/platform/StatusBadge';
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

function ListingDetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Decision inputs
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
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="platform-muted">Loading listing inspection data…</p>
      </div>
    );
  }

  const allImages = [
    ...(listing?.primaryImageUrl ? [listing.primaryImageUrl] : []),
    ...(listing?.galleryImageUrls || []),
  ];

  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/admin/listings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--platform-accent, #2f5233)',
          }}
        >
          ← Back to Moderation Queue
        </Link>

        {listing?.isPublished && (
          <Link
            href={`/marketplace/listings/${listing.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--platform-accent, #2f5233)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            View live on marketplace ↗
          </Link>
        )}
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {listing && (
        <>
          {/* Header Hero Banner */}
          <div className="mod-detail-hero">
            <div className="mod-detail-header-row">
              <div className="mod-detail-title-cluster">
                <h1>{listing.name}</h1>
                <p>
                  {listing.brand && <strong>{listing.brand} · </strong>}
                  <span>{CATEGORY_LABELS[listing.category] || listing.category}</span>
                  {listing.sku && <span> · Model/SKU: {listing.sku}</span>}
                  <span> · {listing.listingType === 'PRODUCT' ? 'Hardware / Drone' : 'Service Offering'}</span>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={listing.reviewStatus} />
                {listing.isPublished && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    LIVE ON MARKETPLACE
                  </span>
                )}
              </div>
            </div>

            {/* Quick Specs Highlight Bar */}
            <div className="mod-spec-grid">
              <div className="mod-spec-item">
                <div className="mod-spec-label">Pricing</div>
                <div className="mod-spec-val">
                  {formatPrice(listing.priceOnRequest, listing.priceInr)}
                </div>
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
                  {[listing.organization.city, listing.organization.state]
                    .filter(Boolean)
                    .join(', ') || listing.organization.country}
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Inspection Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.75fr) minmax(0, 1.25fr)',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Visual Gallery, Specifications, Description */}
            <div>
              <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '1rem' }}>
                  Visual Inspection & Media
                </h2>

                {/* Main Selected Image Viewport */}
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={listing.name}
                    className="mod-gallery-main"
                  />
                ) : (
                  <div
                    style={{
                      height: 280,
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>📷</div>
                    <div>No images submitted with this listing</div>
                  </div>
                )}

                {/* Thumbnails strip switcher */}
                {allImages.length > 1 && (
                  <div>
                    <div className="platform-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>
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

              {/* Technical Specifications & Description Card */}
              <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '1rem' }}>
                  Listing Details & Technical Specs
                </h2>

                {listing.description && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="platform-muted" style={{ fontWeight: 600, fontSize: '0.825rem', textTransform: 'uppercase' }}>
                      Product Overview / Description
                    </label>
                    <p style={{ marginTop: '0.35rem', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line' }}>
                      {listing.description}
                    </p>
                  </div>
                )}

                {listing.technicalSpecs ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="platform-muted" style={{ fontWeight: 600, fontSize: '0.825rem', textTransform: 'uppercase' }}>
                      Technical Specifications & Parameters
                    </label>
                    <pre
                      style={{
                        marginTop: '0.35rem',
                        padding: '1.15rem',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        color: '#0f172a',
                      }}
                    >
                      {listing.technicalSpecs}
                    </pre>
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="platform-muted" style={{ fontWeight: 600, fontSize: '0.825rem', textTransform: 'uppercase' }}>
                      Technical Specifications
                    </label>
                    <p className="platform-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      No technical specifications entered.
                    </p>
                  </div>
                )}

                {listing.applications && listing.applications.length > 0 && (
                  <div>
                    <label className="platform-muted" style={{ fontWeight: 600, fontSize: '0.825rem', textTransform: 'uppercase' }}>
                      Target Industrial Applications
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      {listing.applications.map((app, i) => (
                        <span
                          key={i}
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Moderation History Visual Timeline */}
              <div className="platform-card">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '1.25rem' }}>
                  Moderation Audit History
                </h2>
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
                          <strong style={{ color: log.toStatus === 'APPROVED' ? '#15803d' : log.toStatus === 'REJECTED' ? '#b91c1c' : '#0284c7' }}>
                            {formatEnumLabel(log.toStatus)}
                          </strong>
                        </p>
                        {log.note && (
                          <div
                            style={{
                              marginTop: 4,
                              background: '#f8fafc',
                              padding: '6px 10px',
                              borderRadius: 6,
                              fontSize: '0.825rem',
                              color: '#475569',
                              borderLeft: '3px solid #cbd5e1',
                            }}
                          >
                            &quot;{log.note}&quot;
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="platform-muted">No review history recorded yet.</p>
                )}
              </div>
            </div>

            {/* Right Column: Seller Passport & Decision Hub */}
            <div>
              {/* Seller Trust Passport */}
              <div className="mod-passport-card">
                <div className="mod-passport-header">
                  <div className="mod-passport-avatar">
                    {listing.organization.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="mod-passport-company">{listing.organization.companyName}</div>
                    <div className="mod-passport-account-type">
                      {ACCOUNT_TYPE_LABELS[listing.organization.owner.accountType] || listing.organization.owner.accountType}
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

                <Link
                  href={`/admin/applications/${listing.organization.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem',
                    borderRadius: 6,
                    background: '#f1f5f9',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--platform-accent, #2f5233)',
                    textDecoration: 'none',
                  }}
                >
                  Inspect Partner KYC Application →
                </Link>
              </div>

              {/* Active Rejection Callout */}
              {listing.rejectionReason && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <strong style={{ color: '#991b1b', fontSize: '0.875rem' }}>
                    Current Rejection Feedback:
                  </strong>
                  <p style={{ margin: '0.35rem 0 0', color: '#7f1d1d', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {listing.rejectionReason}
                  </p>
                </div>
              )}

              {/* Moderation Decision Console */}
              <div className="mod-decision-box">
                <div className="mod-decision-header">
                  <span>⚖</span>
                  <span>Moderation Actions</span>
                </div>

                {/* Approve Action */}
                {listing.reviewStatus !== 'APPROVED' && (
                  <div className="mod-decision-section">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label htmlFor="approve-note" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                        Approval verification note (optional)
                      </label>
                      <input
                        id="approve-note"
                        type="text"
                        placeholder="e.g. Verified DGCA compliance & specs"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        style={{ width: '100%', marginTop: '0.25rem', height: 38 }}
                      />
                    </div>
                    <button
                      type="button"
                      className="platform-btn platform-btn--primary"
                      onClick={handleApprove}
                      disabled={busy}
                      style={{
                        width: '100%',
                        padding: '0.65rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {busy ? 'Processing…' : '✓ Approve & Publish to Marketplace'}
                    </button>
                  </div>
                )}

                {/* Reject Action with Quick Presets */}
                {listing.reviewStatus !== 'REJECTED' && (
                  <div className="mod-decision-section">
                    <form onSubmit={handleReject}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label htmlFor="reject-reason" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                          Rejection Reason (Required)
                        </label>
                        <span className="platform-muted" style={{ fontSize: '0.75rem' }}>
                          Shared with seller
                        </span>
                      </div>

                      {/* Presets Chips */}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                        Quick presets:
                      </div>
                      <div className="mod-preset-chips">
                        {rejectionPresets.map((preset, idx) => (
                          <button
                            key={idx}
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

                      <textarea
                        id="reject-reason"
                        rows={3}
                        placeholder="Specify exactly what the seller must adjust or upload…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{ width: '100%', marginTop: '0.25rem' }}
                      />

                      <button
                        type="submit"
                        className="platform-btn platform-btn--danger"
                        disabled={busy || !rejectReason.trim()}
                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem 1rem' }}
                      >
                        {busy ? 'Processing…' : '✕ Reject Listing & Request Changes'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Unpublish Takedown Action (only if published) */}
                {listing.isPublished && (
                  <div className="mod-decision-section">
                    <form onSubmit={handleUnpublish}>
                      <label htmlFor="unpublish-reason" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                        Marketplace Takedown Reason
                      </label>
                      <textarea
                        id="unpublish-reason"
                        rows={2}
                        placeholder="Reason for pulling this listing offline…"
                        value={unpublishReason}
                        onChange={(e) => setUnpublishReason(e.target.value)}
                        style={{ width: '100%', marginTop: '0.25rem' }}
                      />
                      <button
                        type="submit"
                        className="platform-btn platform-btn--secondary"
                        disabled={busy || !unpublishReason.trim()}
                        style={{
                          width: '100%',
                          marginTop: '0.5rem',
                          color: '#b91c1c',
                          borderColor: '#fca5a5',
                        }}
                      >
                        {busy ? 'Processing…' : 'Takedown / Unpublish Listing'}
                      </button>
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
