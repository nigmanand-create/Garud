'use client';

import {
  useMemo,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import Link from 'next/link';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingReviewStatus, ListingType } from '@/lib/api/types';
import { ListingImageFields } from '@/components/platform/ListingImageFields';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  catalogCategoriesForListingType,
  isCatalogCategoryValidForListingType,
  resolveCatalogCategoryForListingType,
} from '@/lib/platform/catalog-categories';
import {
  COMMON_APPLICATIONS,
  type CatalogListingFormValues,
  useCatalogListingReadiness,
} from '@/lib/platform/catalog-listing-form';

type SetForm = Dispatch<SetStateAction<CatalogListingFormValues>>;

export type CatalogListingEditorMode = 'create' | 'edit';

type CatalogListingFormProps = {
  mode: CatalogListingEditorMode;
  form: CatalogListingFormValues;
  setForm: SetForm;
  disabled?: boolean;
  onSubmit: (e: FormEvent) => void;
  footer: ReactNode;
  /** Rendered after section cards, before sticky footer (e.g. edit moderation). */
  trailingSection?: ReactNode;
};

export function CatalogListingForm({
  mode,
  form,
  setForm,
  disabled = false,
  onSubmit,
  footer,
  trailingSection,
}: CatalogListingFormProps) {
  const categoryOptions = useMemo(
    () => catalogCategoriesForListingType(form.listingType),
    [form.listingType],
  );
  const categoryMismatch = !isCatalogCategoryValidForListingType(
    form.category,
    form.listingType,
  );

  function toggleApplication(app: string) {
    if (disabled) return;
    setForm((prev) => {
      const exists = prev.applications.includes(app);
      return {
        ...prev,
        applications: exists
          ? prev.applications.filter((a) => a !== app)
          : [...prev.applications, app],
      };
    });
  }

  return (
    <form onSubmit={onSubmit} className="platform-stack platform-stack--lg">
      <div className="platform-card platform-form">
        <h2 className="platform-section-heading">1. Classification & Type</h2>
        <p className="platform-form-section-desc">
          {mode === 'create'
            ? 'Select whether you are listing drone hardware equipment or specialized drone services.'
            : `${LISTING_TYPE_LABELS[form.listingType]} — listing type cannot be changed after creation.`}
        </p>

        {mode === 'create' ? (
          <CatalogListingTypeSelector form={form} setForm={setForm} disabled={disabled} />
        ) : (
          <div className="catalog-type-readonly">
            <span className="platform-partner-shortcut-icon" aria-hidden>
              <i
                className={
                  form.listingType === 'PRODUCT' ? 'ph ph-package' : 'ph ph-wrench'
                }
              />
            </span>
            <div>
              <div className="catalog-type-title">
                {LISTING_TYPE_LABELS[form.listingType]}
              </div>
              <div className="catalog-type-desc">
                {form.listingType === 'PRODUCT'
                  ? 'Hardware, payloads, and accessories'
                  : 'Maintenance, training, and professional services'}
              </div>
            </div>
          </div>
        )}

        <div className="platform-field">
          <label htmlFor="category">
            {form.listingType === 'PRODUCT'
              ? 'Product category *'
              : 'Service category *'}
          </label>
          <select
            id="category"
            value={categoryMismatch ? '' : form.category}
            disabled={disabled}
            required
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as CatalogCategory,
              }))
            }
          >
            {categoryMismatch && (
              <option value="" disabled>
                Select a category…
              </option>
            )}
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {categoryMismatch && (
            <p className="platform-field-hint platform-password-strength--1" role="alert">
              Current category does not match this listing type. Choose a{' '}
              {form.listingType === 'PRODUCT' ? 'product' : 'service'} category.
            </p>
          )}
        </div>
      </div>

      <div className="platform-card platform-form">
        <h2 className="platform-section-heading">2. Listing identity</h2>
        <p className="platform-form-section-desc">
          Enter the commercial product name and model identification numbers.
        </p>

        <div className="platform-field">
          <label htmlFor="name">Listing / product name *</label>
          <input
            id="name"
            required
            disabled={disabled}
            placeholder="e.g. Garud Falcon 4 Pro Agricultural Spraying Drone"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="platform-form-field-pair">
          <div className="platform-field">
            <label htmlFor="brand">Brand / OEM manufacturer</label>
            <input
              id="brand"
              disabled={disabled}
              placeholder="e.g. Garud Aero Dynamics"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </div>
          <div className="platform-field">
            <label htmlFor="sku">Model / DGCA code / SKU</label>
            <input
              id="sku"
              disabled={disabled}
              placeholder="e.g. GD-FALCON-4P"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
        </div>

        <div className="platform-field">
          <label htmlFor="description">Overview description</label>
          <textarea
            id="description"
            rows={4}
            disabled={disabled}
            placeholder="Describe capabilities, flight stability, industrial use cases, and key features…"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="platform-card platform-form">
        <h2 className="platform-section-heading">3. Pricing & terms</h2>
        <p className="platform-form-section-desc">
          Configure fixed pricing or price-on-request for enterprise RFQ workflows.
        </p>

        <label className="platform-checkbox-row">
          <input
            type="checkbox"
            checked={form.priceOnRequest}
            disabled={disabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, priceOnRequest: e.target.checked }))
            }
          />
          <span>
            <strong>Price on request (POR)</strong> — recommended for high-value
            enterprise drones and custom service contracts
          </span>
        </label>

        {!form.priceOnRequest && (
          <div className="platform-field platform-mt-sm">
            <label htmlFor="priceInr">Price (INR ₹) *</label>
            <input
              id="priceInr"
              type="number"
              min={0}
              required
              disabled={disabled}
              placeholder="e.g. 450000"
              value={form.priceInr}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceInr: e.target.value }))
              }
            />
          </div>
        )}

        <div className="platform-form-field-pair platform-mt-md">
          <div className="platform-field">
            <label htmlFor="minOrderQuantity">Minimum order quantity (MOQ)</label>
            <input
              id="minOrderQuantity"
              type="number"
              min={1}
              disabled={disabled}
              value={form.minOrderQuantity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  minOrderQuantity: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="platform-field">
            <label htmlFor="warranty">Warranty period</label>
            <input
              id="warranty"
              disabled={disabled}
              placeholder="e.g. 1 year comprehensive / 500 flight hours"
              value={form.warranty}
              onChange={(e) =>
                setForm((f) => ({ ...f, warranty: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="platform-card platform-form">
        <h2 className="platform-section-heading">4. Visual media assets</h2>
        <p className="platform-form-section-desc">
          Upload high-resolution photography. Listings with clear imagery pass
          moderation fastest.
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
      </div>

      <div className="platform-card platform-form">
        <h2 className="platform-section-heading">
          5. Technical specifications & applications
        </h2>
        <p className="platform-form-section-desc">
          Detail engineering parameters required by enterprise buyers.
        </p>

        <div className="platform-field">
          <label htmlFor="technicalSpecs">
            Technical specifications (key: value or structured)
          </label>
          <textarea
            id="technicalSpecs"
            rows={6}
            disabled={disabled}
            placeholder={`Endurance: 45 Minutes (with 10L payload)\nPayload Capacity: 10 kg / 16 Liters\nRange: 5 km transmission distance`}
            value={form.technicalSpecs}
            onChange={(e) =>
              setForm((f) => ({ ...f, technicalSpecs: e.target.value }))
            }
            className="platform-form-textarea-mono"
          />
        </div>

        <div className="platform-mt-md">
          <label className="platform-section-heading platform-text-sm">
            Target industrial applications
          </label>
          <div className="platform-chip-row platform-mt-sm">
            {COMMON_APPLICATIONS.map((app) => {
              const selected = form.applications.includes(app);
              return (
                <button
                  key={app}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleApplication(app)}
                  className={`platform-chip ${selected ? 'platform-chip--selected' : ''}`}
                >
                  {selected ? '✓ ' : '+ '}
                  {app}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {trailingSection}

      <div className="platform-form-sticky-footer">{footer}</div>
    </form>
  );
}

function CatalogListingTypeSelector({
  form,
  setForm,
  disabled,
}: {
  form: CatalogListingFormValues;
  setForm: SetForm;
  disabled?: boolean;
}) {
  function selectType(listingType: ListingType) {
    if (disabled) return;
    setForm((f) => ({
      ...f,
      listingType,
      category: resolveCatalogCategoryForListingType(f.category, listingType),
    }));
  }

  return (
    <div className="catalog-type-selector">
      <div
        className={`catalog-type-btn ${form.listingType === 'PRODUCT' ? 'catalog-type-btn--active' : ''}`}
        onClick={() => selectType('PRODUCT')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') selectType('PRODUCT');
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={form.listingType === 'PRODUCT'}
      >
        <span className="catalog-type-icon" aria-hidden>
          <i className="ph ph-package" />
        </span>
        <div>
          <div className="catalog-type-title">Hardware / equipment</div>
          <div className="catalog-type-desc">
            Drones, sensors, payloads, spare parts, and accessories
          </div>
        </div>
      </div>

      <div
        className={`catalog-type-btn ${form.listingType === 'SERVICE' ? 'catalog-type-btn--active' : ''}`}
        onClick={() => selectType('SERVICE')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') selectType('SERVICE');
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={form.listingType === 'SERVICE'}
      >
        <span className="catalog-type-icon" aria-hidden>
          <i className="ph ph-wrench" />
        </span>
        <div>
          <div className="catalog-type-title">Service offering</div>
          <div className="catalog-type-desc">
            Maintenance, pilot training, data processing, and consultancy
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogListingPreviewPanel({
  form,
  mode,
}: {
  form: CatalogListingFormValues;
  mode: CatalogListingEditorMode;
}) {
  const { score, checks } = useCatalogListingReadiness(form);

  return (
    <div className="catalog-preview-sticky">
      <div className="catalog-quality-card platform-card">
        <div className="catalog-quality-header">
          <span className="platform-quality-score">Listing readiness</span>
          <span
            className={`platform-quality-score ${
              score === 100
                ? 'platform-quality-score--complete'
                : 'platform-quality-score--pending'
            }`}
          >
            {score}%
          </span>
        </div>

        <div className="catalog-quality-bar-track">
          <div className="catalog-quality-bar-fill" style={{ width: `${score}%` }} />
        </div>

        <ul className="catalog-quality-checklist">
          {checks.map((c, i) => (
            <li
              key={i}
              className={`catalog-quality-check-item ${c.done ? 'catalog-quality-check-item--done' : ''}`}
            >
              <span>{c.done ? '✓' : '○'}</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="catalog-preview-box platform-card">
        <div className="catalog-preview-header">
          <span>Marketplace preview</span>
          <span className="platform-muted platform-text-xs">Updates as you edit</span>
        </div>

        <article className="platform-listing-card catalog-preview-listing-card">
          <div className="platform-listing-card-link catalog-preview-listing-card-inner">
            <div className="platform-listing-card-media" aria-hidden>
              {form.primaryImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.primaryImageUrl}
                  alt=""
                  className="platform-listing-card-media-img"
                />
              ) : (
                <span className="platform-listing-card-media-icon">
                  <i className="ph ph-image" aria-hidden />
                </span>
              )}
            </div>
            <div className="platform-listing-card-body">
              <div className="platform-listing-card-badges">
                <span className="platform-badge platform-badge--category">
                  {CATEGORY_LABELS[form.category]}
                </span>
                <span className="platform-badge platform-badge--muted">
                  {LISTING_TYPE_LABELS[form.listingType]}
                </span>
              </div>
              <h3 className="platform-listing-card-title">
                {form.name || 'Your listing name here'}
              </h3>
              <p className="platform-listing-card-price">
                {formatPrice(form.priceOnRequest, form.priceInr || undefined)}
              </p>
              <p className="platform-listing-card-partner">
                <span className="platform-listing-card-partner-name">
                  {form.brand || 'Brand / manufacturer'}
                  {form.sku ? ` · ${form.sku}` : ''}
                </span>
              </p>
            </div>
          </div>
          <div className="platform-listing-card-footer">
            <span className="platform-listing-card-cta catalog-preview-cta-mock">
              {form.priceOnRequest ? 'Request RFQ' : 'View details'}
            </span>
          </div>
        </article>

        <div className="platform-preview-note">
          <strong>Moderation:</strong>{' '}
          {mode === 'create'
            ? 'After creation, your listing is saved as Draft. Submit for admin review when ready.'
            : 'Edits to approved listings may return the item to Draft until re-reviewed.'}
        </div>
      </div>
    </div>
  );
}

type ReviewBannerListing = {
  id: string;
  reviewStatus: ListingReviewStatus;
  rejectionReason?: string | null;
  isPublished: boolean;
};

export function CatalogListingReviewBanners({
  listing,
  canListProducts,
  saving,
  onSubmitForReview,
}: {
  listing: ReviewBannerListing;
  canListProducts: boolean;
  saving: boolean;
  onSubmitForReview: () => void;
}) {
  return (
    <>
      {listing.reviewStatus === 'REJECTED' && listing.rejectionReason && (
        <div className="platform-listing-banner platform-listing-banner--rejected">
          <div className="platform-listing-banner__head">
            <span aria-hidden>⚠️</span>
            <strong>Changes requested by admin</strong>
            <span className="platform-badge-action-required">Action required</span>
          </div>
          <div className="platform-listing-banner__quote">
            &quot;{listing.rejectionReason}&quot;
          </div>
          <div className="platform-listing-banner__footer">
            <p>Update the fields below and re-submit for review.</p>
            <button
              type="button"
              className="platform-btn platform-btn-sm"
              onClick={onSubmitForReview}
              disabled={saving || !canListProducts}
            >
              Submit for review now
            </button>
          </div>
        </div>
      )}

      {listing.reviewStatus === 'PENDING_REVIEW' && (
        <div className="platform-listing-banner platform-listing-banner--pending">
          <span aria-hidden>⏳</span>
          <div>
            <strong className="platform-text-sm">Under moderation review</strong>
            <p className="platform-form-section-desc">
              Submitted to Garud admin. Typical turnaround is 24 business hours.
              Edits are locked while under review.
            </p>
          </div>
        </div>
      )}

      {listing.reviewStatus === 'APPROVED' && (
        <div className="platform-listing-banner platform-listing-banner--approved">
          <div className="platform-form-section-head">
            <span aria-hidden>✓</span>
            <div>
              <strong className="platform-text-sm">Approved on marketplace</strong>
              <p className="platform-form-section-desc">
                Live for discovery, RFQ inquiries, and buyer orders.
              </p>
            </div>
          </div>
          {listing.isPublished && (
            <Link
              href={`/marketplace/listings/${listing.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="platform-action-chip platform-action-chip--success"
            >
              View on marketplace ↗
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export function CatalogListingModerationCard({
  reviewStatus,
  isPublished,
  canListProducts,
  saving,
  onSubmitForReview,
}: {
  reviewStatus: ListingReviewStatus;
  isPublished: boolean;
  canListProducts: boolean;
  saving: boolean;
  onSubmitForReview: () => void;
}) {
  return (
    <div className="platform-card platform-form">
      <h2 className="platform-section-heading">6. Review & publication</h2>
      <div className="platform-moderation-row">
        <div>
          <div className="platform-moderation-status">
            <strong>Status:</strong>
            <StatusBadge status={reviewStatus} />
            {isPublished && (
              <span className="platform-badge-live">Live on marketplace</span>
            )}
          </div>
          <p className="platform-form-section-desc platform-mt-sm">
            {reviewStatus === 'DRAFT' &&
              'Ready to go live? Submit for platform admin review.'}
            {reviewStatus === 'PENDING_REVIEW' &&
              'Submitted and waiting for admin review.'}
            {reviewStatus === 'APPROVED' &&
              'Your listing is active on the marketplace.'}
            {reviewStatus === 'REJECTED' &&
              'Fix issues noted above and re-submit for review.'}
            {reviewStatus === 'UNPUBLISHED' &&
              'This listing was taken down. Submit again to request reactivation.'}
          </p>
        </div>

        {(reviewStatus === 'DRAFT' ||
          reviewStatus === 'REJECTED' ||
          reviewStatus === 'UNPUBLISHED') && (
          <button
            type="button"
            className="platform-btn platform-btn-primary"
            onClick={onSubmitForReview}
            disabled={saving || !canListProducts}
          >
            Submit for review
          </button>
        )}
      </div>
    </div>
  );
}
