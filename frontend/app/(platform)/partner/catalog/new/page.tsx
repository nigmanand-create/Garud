'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import Link from 'next/link';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { parseGalleryImageUrls } from '@/lib/platform/listing-media';
import { ListingImageFields } from '@/components/platform/ListingImageFields';

export default function NewListingPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <NewListingInner />
    </RequireAuth>
  );
}

function NewListingInner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [canListProducts, setCanListProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    listingType: 'PRODUCT' as ListingType,
    category: 'AGRICULTURE_DRONE' as CatalogCategory,
    name: '',
    brand: '',
    sku: '',
    primaryImageUrl: '',
    galleryImageUrlsText: '',
    description: '',
    priceOnRequest: true,
    priceInr: '',
    isPublished: false,
  });

  useEffect(() => {
    apiRequest<{ canListProducts: boolean }>('/partner/me', { auth: true })
      .then((me) => setCanListProducts(me.canListProducts))
      .catch(() => setCanListProducts(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const publish = canListProducts ? form.isPublished : false;
    setSubmitting(true);
    try {
      const created = await apiRequest<{ id: string }>(
        '/partner/catalog/listings',
        {
          method: 'POST',
          auth: true,
          body: {
            listingType: form.listingType,
            category: form.category,
            name: form.name,
            brand: form.brand || undefined,
            sku: form.sku || undefined,
            primaryImageUrl: form.primaryImageUrl || undefined,
            galleryImageUrls: parseGalleryImageUrls(form.galleryImageUrlsText),
            description: form.description || undefined,
            priceOnRequest: form.priceOnRequest,
            priceInr: form.priceOnRequest
              ? undefined
              : Number(form.priceInr),
            isPublished: publish,
          },
        },
      );
      router.push(`/partner/catalog/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PartnerPageShell>
      <div
        className="platform-partner-form-page platform-partner-form-page--sticky-actions"
      >
        <PlatformPageHeader
          breadcrumbs={[
            { label: 'Catalog', href: '/partner/catalog' },
            { label: 'New listing' },
          ]}
          title="New listing"
          subtitle="Add a product or service to your partner catalog."
        />
        <div className="platform-form-layout">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!canListProducts && (
            <div className="platform-callout platform-callout--partner">
              Publishing to the marketplace is available after Garud verifies your
              partner account. You can save this listing as a draft once approved.
            </div>
          )}
          <form
            className="platform-card platform-form platform-form-card"
            onSubmit={onSubmit}
          >
            <fieldset className="platform-form-section">
              <legend className="platform-form-section-title">
                Listing details
              </legend>
              <p className="platform-form-section-desc">
                Choose type and category, then describe what buyers will see on the
                marketplace.
              </p>
              <div className="platform-form-field-pair">
                <div className="platform-field">
                  <label htmlFor="listingType">Type</label>
                  <select
                    id="listingType"
                    value={form.listingType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        listingType: e.target.value as ListingType,
                      }))
                    }
                  >
                    {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {LISTING_TYPE_LABELS[t]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="platform-field">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value as CatalogCategory,
                      }))
                    }
                  >
                    {(Object.keys(CATEGORY_LABELS) as CatalogCategory[]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
          <div className="platform-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="platform-field">
            <label htmlFor="brand">Brand</label>
            <input
              id="brand"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </div>
          <div className="platform-field">
            <label htmlFor="sku">SKU / model code (optional)</label>
            <input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="e.g. GD-AGRI-X1"
            />
          </div>
          <div className="platform-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </fieldset>

        <fieldset className="platform-form-section">
          <legend className="platform-form-section-title">Images</legend>
          <p className="platform-form-section-desc">
            Upload JPEG/PNG files (stored under backend{' '}
            <code>UPLOAD_DIR</code>) or paste external HTTPS URLs.
          </p>
          <ListingImageFields
            primaryImageUrl={form.primaryImageUrl}
            galleryImageUrlsText={form.galleryImageUrlsText}
            onPrimaryChange={(url) =>
              setForm((f) => ({ ...f, primaryImageUrl: url }))
            }
            onGalleryTextChange={(text) =>
              setForm((f) => ({ ...f, galleryImageUrlsText: text }))
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
                setForm((f) => ({ ...f, priceOnRequest: e.target.checked }))
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
                required
                value={form.priceInr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceInr: e.target.value }))
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
                setForm((f) => ({ ...f, isPublished: e.target.checked }))
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
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Creating…' : 'Create listing'}
              </button>
              <Link
                href="/partner/catalog"
                className="platform-btn platform-btn-secondary"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PartnerPageShell>
  );
}
