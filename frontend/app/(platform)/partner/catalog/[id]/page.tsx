'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingReviewStatus, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import {
  formatGalleryImageUrls,
  parseGalleryImageUrls,
} from '@/lib/platform/listing-media';
import { ListingImageFields } from '@/components/platform/ListingImageFields';

type Listing = {
  id: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  primaryImageUrl?: string | null;
  galleryImageUrls?: string[];
  listingType: ListingType;
  category: CatalogCategory;
  description?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  isPublished: boolean;
  reviewStatus: ListingReviewStatus;
  rejectionReason?: string | null;
};

type ListingForm = Listing & { galleryImageUrlsText: string };

export default function EditListingPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <EditListingInner />
    </RequireAuth>
  );
}

function EditListingInner() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState<ListingForm | null>(null);
  const [canListProducts, setCanListProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    Promise.all([
      apiRequest<Listing>(`/partner/catalog/listings/${id}`, { auth: true }),
      apiRequest<{ canListProducts: boolean }>('/partner/me', { auth: true }),
    ])
      .then(([listing, me]) => {
        setForm({
          ...listing,
          galleryImageUrlsText: formatGalleryImageUrls(listing.galleryImageUrls),
        });
        setCanListProducts(me.canListProducts);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Not found'),
      );
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const updated = await apiRequest<Listing>(`/partner/catalog/listings/${id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          name: form.name,
          brand: form.brand || undefined,
          sku: form.sku || undefined,
          primaryImageUrl: form.primaryImageUrl || undefined,
          galleryImageUrls: parseGalleryImageUrls(form.galleryImageUrlsText),
          category: form.category,
          description: form.description || undefined,
          priceOnRequest: form.priceOnRequest,
          priceInr: form.priceOnRequest
            ? undefined
            : form.priceInr != null
              ? Number(form.priceInr)
              : undefined,
        },
      });
      setForm((f) => (f ? {
        ...f,
        ...updated,
        galleryImageUrlsText: formatGalleryImageUrls(updated.galleryImageUrls),
      } : f));
      setMessage(
        updated.reviewStatus === 'DRAFT' && form.reviewStatus === 'APPROVED'
          ? 'Changes saved. Because details were updated, the listing is back in Draft and must be submitted for review again.'
          : 'Saved successfully.'
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const updated = await apiRequest<Listing>(`/partner/catalog/listings/${id}/submit-for-review`, {
        method: 'POST',
        auth: true,
      });
      setForm((f) => (f ? {
        ...f,
        ...updated,
        galleryImageUrlsText: formatGalleryImageUrls(updated.galleryImageUrls),
      } : f));
      setMessage('Listing submitted for admin review.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Delete this listing?',
      message: 'This removes the catalog item permanently. It will no longer appear in your catalog or on the marketplace.',
      confirmLabel: 'Delete listing',
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiRequest(`/partner/catalog/listings/${id}`, {
        method: 'DELETE',
        auth: true,
      });
      router.push('/partner/catalog');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  if (!form && !error) {
    return (
      <PartnerPageShell>
        <PlatformPageHeader
          breadcrumbs={[
            { label: 'Catalog', href: '/partner/catalog' },
            { label: 'Loading…' },
          ]}
          title="Edit listing"
          subtitle="Loading catalog item…"
        />
        <PlatformLoading label="Loading listing…" />
      </PartnerPageShell>
    );
  }

  return (
    <PartnerPageShell>
      {confirmDialog}
      <div
        className="platform-partner-form-page platform-partner-form-page--sticky-actions"
      >
        {!form && error && (
          <PlatformPageHeader
            breadcrumbs={[{ label: 'Catalog', href: '/partner/catalog' }]}
            title="Listing not found"
            subtitle="This catalog item may have been removed."
          />
        )}
        {form && (
          <PlatformPageHeader
            breadcrumbs={[
              { label: 'Catalog', href: '/partner/catalog' },
              { label: form.name },
            ]}
            title={form.name}
            subtitle={`${LISTING_TYPE_LABELS[form.listingType]} · ${CATEGORY_LABELS[form.category]}`}
            badge={<StatusBadge status={form.reviewStatus} />}
          />
        )}
        <div className="platform-form-layout">
          {error && <div className="platform-card platform-error">{error}</div>}
          {message && (
            <div className="platform-card platform-success">{message}</div>
          )}
          {form?.reviewStatus === 'REJECTED' && form.rejectionReason && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '1.25rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 8px -2px rgba(185, 28, 28, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <strong style={{ color: '#991b1b', fontSize: '0.95rem' }}>
                  Changes requested by Admin
                </strong>
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  ACTION REQUIRED
                </span>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #fed7d7',
                  borderLeft: '4px solid #b91c1c',
                  padding: '0.75rem 1rem',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  color: '#7f1d1d',
                  margin: '0.5rem 0',
                }}
              >
                &quot;{form.rejectionReason}&quot;
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#991b1b' }}>
                  Please update the required information below and re-submit for review.
                </p>
                <button
                  type="button"
                  className="platform-btn platform-btn-primary"
                  onClick={submitForReview}
                  disabled={saving || !canListProducts}
                  style={{ fontSize: '0.85rem' }}
                >
                  Submit for review now
                </button>
              </div>
            </div>
          )}

          {form?.reviewStatus === 'PENDING_REVIEW' && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 10,
                padding: '1.15rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⏳</span>
              <div>
                <strong style={{ color: '#0369a1', fontSize: '0.95rem', display: 'block' }}>
                  Listing is under moderation review
                </strong>
                <p style={{ margin: '0.2rem 0 0', color: '#0284c7', fontSize: '0.85rem' }}>
                  Submitted to Garud admin team. Typical review turnaround is 24 business hours. Edits are temporarily locked during inspection.
                </p>
              </div>
            </div>
          )}

          {form?.reviewStatus === 'APPROVED' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '1.15rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✓</span>
                <div>
                  <strong style={{ color: '#15803d', fontSize: '0.95rem', display: 'block' }}>
                    Approved & Active on Marketplace
                  </strong>
                  <p style={{ margin: '0.2rem 0 0', color: '#16a34a', fontSize: '0.85rem' }}>
                    This listing is live for discovery, RFQ inquiries, and direct buyer orders.
                  </p>
                </div>
              </div>
              {form.isPublished && (
                <Link
                  href={`/marketplace/listings/${form.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    textDecoration: 'none',
                  }}
                >
                  View on marketplace ↗
                </Link>
              )}
            </div>
          )}
          {form && (
            <form
              className="platform-card platform-form platform-form-card"
              onSubmit={save}
            >
          <fieldset className="platform-form-section">
            <legend className="platform-form-section-title">Listing details</legend>
            <p className="platform-form-section-desc">
              {LISTING_TYPE_LABELS[form.listingType]} — type cannot be changed here.
            </p>
            <div className="platform-field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, category: e.target.value as CatalogCategory } : f,
                  )
                }
              >
                {(Object.keys(CATEGORY_LABELS) as CatalogCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="platform-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, name: e.target.value } : f))
                }
              />
            </div>
            <div className="platform-field">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                value={form.brand ?? ''}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, brand: e.target.value } : f))
                }
              />
            </div>
            <div className="platform-field">
              <label htmlFor="sku">SKU / model code (optional)</label>
              <input
                id="sku"
                value={form.sku ?? ''}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, sku: e.target.value } : f))
                }
              />
            </div>
            <div className="platform-field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, description: e.target.value } : f,
                  )
                }
              />
            </div>
          </fieldset>

          <fieldset className="platform-form-section">
            <legend className="platform-form-section-title">Images</legend>
            <p className="platform-form-section-desc">
              Upload images or paste HTTPS URLs for marketplace cards and detail
              pages.
            </p>
            <ListingImageFields
              primaryImageUrl={form.primaryImageUrl ?? ''}
              galleryImageUrlsText={form.galleryImageUrlsText}
              onPrimaryChange={(url) =>
                setForm((f) => (f ? { ...f, primaryImageUrl: url } : f))
              }
              onGalleryTextChange={(text) =>
                setForm((f) => (f ? { ...f, galleryImageUrlsText: text } : f))
              }
            />
          </fieldset>

          <fieldset className="platform-form-section">
            <legend className="platform-form-section-title">Pricing</legend>
            <label className="platform-checkbox-row">
              <input
                type="checkbox"
                checked={form.priceOnRequest}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, priceOnRequest: e.target.checked } : f,
                  )
                }
              />
              <span>Price on request</span>
            </label>
            {!form.priceOnRequest && (
              <div className="platform-field">
                <label htmlFor="priceInr">Price (INR)</label>
                <input
                  id="priceInr"
                  type="number"
                  min={0}
                  value={form.priceInr ?? ''}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, priceInr: e.target.value } : f,
                    )
                  }
                />
              </div>
            )}
          </fieldset>

          <fieldset className="platform-form-section">
            <legend className="platform-form-section-title">Moderation & Publish Status</legend>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>Status:</strong>
                  <StatusBadge status={form.reviewStatus} />
                  {form.isPublished && (
                    <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      LIVE ON MARKETPLACE
                    </span>
                  )}
                </div>
                <p className="platform-form-section-desc" style={{ marginTop: '0.25rem' }}>
                  {form.reviewStatus === 'DRAFT' && 'Ready to go live? Submit your listing for platform admin review.'}
                  {form.reviewStatus === 'PENDING_REVIEW' && 'Submitted and waiting for admin review.'}
                  {form.reviewStatus === 'APPROVED' && 'Your listing is active on the marketplace.'}
                  {form.reviewStatus === 'REJECTED' && 'Fix any issues noted above and re-submit for review.'}
                  {form.reviewStatus === 'UNPUBLISHED' && 'This listing was taken down. Submit again to request reactivation.'}
                </p>
              </div>

              {(form.reviewStatus === 'DRAFT' || form.reviewStatus === 'REJECTED' || form.reviewStatus === 'UNPUBLISHED') && (
                <button
                  type="button"
                  className="platform-btn platform-btn-primary"
                  onClick={submitForReview}
                  disabled={saving || !canListProducts}
                >
                  Submit for review
                </button>
              )}
            </div>
          </fieldset>

              <div className="platform-form-sticky-footer">
                <button
                  type="submit"
                  className="platform-btn platform-btn-cta"
                  disabled={saving || form.reviewStatus === 'PENDING_REVIEW'}
                  aria-busy={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="platform-btn platform-btn-danger"
                  onClick={remove}
                  disabled={saving || form.reviewStatus === 'PENDING_REVIEW'}
                >
                  Delete listing
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
