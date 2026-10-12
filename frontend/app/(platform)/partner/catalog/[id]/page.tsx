'use client';

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
import type { CatalogCategory, ListingType } from '@/lib/api/types';
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
    const publish = canListProducts ? form.isPublished : false;
    setSaving(true);
    try {
      await apiRequest(`/partner/catalog/listings/${id}`, {
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
          isPublished: publish,
        },
      });
      setForm((f) => (f ? { ...f, isPublished: publish } : f));
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
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
            badge={
              <StatusBadge
                status={form.isPublished ? 'PUBLISHED' : 'DRAFT'}
                label={form.isPublished ? 'Live on marketplace' : 'Draft'}
              />
            }
          />
        )}
        <div className="platform-form-layout">
          {error && <div className="platform-card platform-error">{error}</div>}
          {message && (
            <div className="platform-card platform-success">{message}</div>
          )}
          {!canListProducts && form && (
            <div className="platform-callout platform-callout--partner">
              Marketplace publishing unlocks after partner verification. Your listing
              stays as a draft until then.
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
            <legend className="platform-form-section-title">Visibility</legend>
            <label className="platform-checkbox-row">
              <input
                type="checkbox"
                checked={form.isPublished}
                disabled={!canListProducts}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, isPublished: e.target.checked } : f,
                  )
                }
              />
              <span>
                Publish on marketplace
                {!canListProducts && (
                  <span className="platform-muted"> (requires verification)</span>
                )}
              </span>
            </label>
          </fieldset>

              <div className="platform-form-sticky-footer">
                <button
                  type="submit"
                  className="platform-btn platform-btn-cta"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="platform-btn platform-btn-danger"
                  onClick={remove}
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
