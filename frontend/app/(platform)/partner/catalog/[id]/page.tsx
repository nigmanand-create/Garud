'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
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
import {
  CatalogListingForm,
  CatalogListingModerationCard,
  CatalogListingPreviewPanel,
  CatalogListingReviewBanners,
} from '@/components/platform/CatalogListingEditor';
import {
  emptyCatalogListingForm,
  type CatalogListingFormValues,
} from '@/lib/platform/catalog-listing-form';
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
  technicalSpecs?: string | null;
  applications?: string[];
  minOrderQuantity?: number | null;
  warranty?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  isPublished: boolean;
  reviewStatus: ListingReviewStatus;
  rejectionReason?: string | null;
};

function listingToForm(listing: Listing): CatalogListingFormValues {
  return emptyCatalogListingForm({
    listingType: listing.listingType,
    category: listing.category,
    name: listing.name,
    brand: listing.brand ?? '',
    sku: listing.sku ?? '',
    primaryImageUrl: listing.primaryImageUrl ?? '',
    galleryImageUrlsText: formatGalleryImageUrls(listing.galleryImageUrls),
    description: listing.description ?? '',
    technicalSpecs: listing.technicalSpecs ?? '',
    applications: listing.applications ?? [],
    minOrderQuantity: listing.minOrderQuantity ?? 1,
    warranty: listing.warranty ?? '',
    priceOnRequest: listing.priceOnRequest,
    priceInr: listing.priceInr ?? '',
  });
}

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
  const [form, setForm] = useState<CatalogListingFormValues | null>(null);
  const [meta, setMeta] = useState<Listing | null>(null);
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
        setMeta(listing);
        setForm(listingToForm(listing));
        setCanListProducts(me.canListProducts);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Not found'),
      );
  }, [id]);

  const formLocked = meta?.reviewStatus === 'PENDING_REVIEW';

  const setFormValues: Dispatch<SetStateAction<CatalogListingFormValues>> = (
    action,
  ) => {
    setForm((prev) => {
      if (prev === null) return prev;
      return typeof action === 'function' ? action(prev) : action;
    });
  };

  function applyListingUpdate(updated: Listing) {
    setMeta(updated);
    setForm(listingToForm(updated));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !meta) return;
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
          technicalSpecs: form.technicalSpecs || undefined,
          applications: form.applications.length > 0 ? form.applications : undefined,
          minOrderQuantity:
            form.minOrderQuantity > 0 ? Number(form.minOrderQuantity) : undefined,
          warranty: form.warranty || undefined,
          priceOnRequest: form.priceOnRequest,
          priceInr: form.priceOnRequest
            ? undefined
            : form.priceInr != null
              ? Number(form.priceInr)
              : undefined,
        },
      });
      applyListingUpdate(updated);
      setMessage(
        updated.reviewStatus === 'DRAFT' && meta.reviewStatus === 'APPROVED'
          ? 'Changes saved. Because details were updated, the listing is back in Draft and must be submitted for review again.'
          : 'Saved successfully.',
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
      const updated = await apiRequest<Listing>(
        `/partner/catalog/listings/${id}/submit-for-review`,
        { method: 'POST', auth: true },
      );
      applyListingUpdate(updated);
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
      message:
        'This removes the catalog item permanently. It will no longer appear in your catalog or on the marketplace.',
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
      <div className="platform-partner-form-page platform-partner-form-page--sticky-actions">
        {!form && error && (
          <PlatformPageHeader
            breadcrumbs={[{ label: 'Catalog', href: '/partner/catalog' }]}
            title="Listing not found"
            subtitle="This catalog item may have been removed."
          />
        )}
        {form && meta && (
          <PlatformPageHeader
            breadcrumbs={[
              { label: 'Catalog', href: '/partner/catalog' },
              { label: form.name },
            ]}
            title={form.name}
            subtitle={`${LISTING_TYPE_LABELS[form.listingType]} · ${CATEGORY_LABELS[form.category]}`}
            badge={<StatusBadge status={meta.reviewStatus} />}
          />
        )}

        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {message && (
            <div className="platform-card platform-success">{message}</div>
          )}

          {form && meta && (
            <div className="catalog-create-grid">
              <div className="platform-stack platform-stack--lg">
                <CatalogListingReviewBanners
                  listing={meta}
                  canListProducts={canListProducts}
                  saving={saving}
                  onSubmitForReview={submitForReview}
                />

                <CatalogListingForm
                  mode="edit"
                  form={form}
                  setForm={setFormValues}
                  disabled={formLocked}
                  onSubmit={save}
                  trailingSection={
                    <CatalogListingModerationCard
                      reviewStatus={meta.reviewStatus}
                      isPublished={meta.isPublished}
                      canListProducts={canListProducts}
                      saving={saving}
                      onSubmitForReview={submitForReview}
                    />
                  }
                  footer={
                    <>
                      <button
                        type="submit"
                        className="platform-btn platform-btn-cta"
                        disabled={saving || formLocked}
                        aria-busy={saving}
                      >
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className="platform-btn platform-btn-danger"
                        onClick={remove}
                        disabled={saving || formLocked}
                      >
                        Delete listing
                      </button>
                    </>
                  }
                />
              </div>

              <CatalogListingPreviewPanel form={form} mode="edit" />
            </div>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
