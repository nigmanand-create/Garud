'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { FormField } from '@/components/platform/FormField';
import { Button } from '@/components/platform/Button';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import { catalogCategoriesForListingType } from '@/lib/platform/catalog-categories';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type SourceListing = {
  id: string;
  name: string;
  listingType: ListingType;
  category: CatalogCategory;
  description?: string | null;
  technicalSpecs?: string | null;
  sku?: string | null;
  primaryImageUrl?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  minOrderQuantity?: number | null;
  organization: {
    id: string;
    companyName: string;
    country?: string | null;
    state?: string | null;
    city?: string | null;
  };
};

function buildSubmitDescription(
  listing: SourceListing,
  additionalNotes: string,
): string {
  const base = buildDescriptionSnippet(listing);
  const notes = additionalNotes.trim();
  if (!notes) return base;
  return `${base}\n\n---\nAdditional notes from buyer:\n${notes}`;
}

function ListingSummaryCard({ listing }: { listing: SourceListing }) {
  const imageSrc = resolveListingImageUrl(listing.primaryImageUrl);
  return (
    <article className="platform-card platform-listing-summary platform-mb-md">
      <div className="platform-listing-summary__media" aria-hidden>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" />
        ) : (
          <span className="platform-listing-card-media-icon">✦</span>
        )}
      </div>
      <div className="platform-listing-summary__body">
        <p className="platform-listing-summary__title">{listing.name}</p>
        <p className="platform-listing-summary__meta">
          {listing.sku ? (
            <>
              SKU: {listing.sku}
              {' · '}
            </>
          ) : null}
          {CATEGORY_LABELS[listing.category]}
          {' · '}
          {LISTING_TYPE_LABELS[listing.listingType]}
        </p>
        <p className="platform-listing-summary__price">
          {formatPrice(listing.priceOnRequest, listing.priceInr)}
        </p>
        <p className="platform-listing-summary__supplier">
          Supplier:{' '}
          <Link href={`/marketplace/partners/${listing.organization.id}`}>
            {listing.organization.companyName}
          </Link>
          {' · '}
          <Link href={`/marketplace/listings/${listing.id}`}>View listing</Link>
        </p>
      </div>
    </article>
  );
}

function buildDescriptionSnippet(listing: SourceListing): string {
  const parts = [listing.description?.trim(), listing.technicalSpecs?.trim()].filter(
    Boolean,
  ) as string[];
  const joined =
    parts.join('\n\n') ||
    `Requesting a B2B quotation for ${listing.name} from ${listing.organization.companyName}.`;
  const maxLen = 2000;
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}…` : joined;
}

function readListingIdFromWindow(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('listing')?.trim();
  return id || null;
}

export default function NewRfqPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <Suspense
        fallback={
          <p className="platform-muted">Loading quotation request…</p>
        }
      >
        <NewRfqInner />
      </Suspense>
    </RequireAuth>
  );
}

function NewRfqInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingIdFromParams = searchParams.get('listing')?.trim() || null;
  const [listingIdFromWindow] = useState(readListingIdFromWindow);
  const listingId = listingIdFromParams || listingIdFromWindow;
  const listingLinkedIntent = Boolean(listingId);
  const prefillApplied = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [listingLoading, setListingLoading] = useState(listingLinkedIntent);
  const [listingError, setListingError] = useState<string | null>(null);
  const [sourceListing, setSourceListing] = useState<SourceListing | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    additionalNotes: '',
    category: 'AGRICULTURE_DRONE' as CatalogCategory,
    listingType: '' as ListingType | '',
    quantity: '',
    country: 'India',
    state: '',
    city: '',
    deadlineAt: '',
    payloadCapacityKg: '',
    enduranceMinutes: '',
    isDgcaRequired: false,
    targetBudgetInr: '',
    specsDocumentUrl: '',
  });

  useEffect(() => {
    if (!listingId) {
      setSourceListing(null);
      setListingLoading(false);
      setListingError(null);
      prefillApplied.current = false;
      return;
    }

    let cancelled = false;
    setListingLoading(true);
    setListingError(null);
    prefillApplied.current = false;

    apiRequest<SourceListing>(`/marketplace/listings/${listingId}`)
      .then((listing) => {
        if (cancelled) return;
        setSourceListing(listing);
        if (!prefillApplied.current) {
          prefillApplied.current = true;
          setForm((f) => ({
            ...f,
            title: `RFQ: ${listing.name}`,
            description: buildDescriptionSnippet(listing),
            category: listing.category,
            listingType: listing.listingType,
            quantity:
              listing.minOrderQuantity != null
                ? String(listing.minOrderQuantity)
                : '1',
            country: listing.organization.country?.trim() || f.country,
            state: listing.organization.state?.trim() || f.state,
            city: listing.organization.city?.trim() || f.city,
          }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSourceListing(null);
        setListingError(
          err instanceof ApiError
            ? err.message
            : 'Could not load marketplace listing',
        );
      })
      .finally(() => {
        if (!cancelled) setListingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const categoryOptions = useMemo(() => {
    if (sourceListing) {
      return catalogCategoriesForListingType(sourceListing.listingType);
    }
    if (form.listingType) {
      return catalogCategoriesForListingType(form.listingType);
    }
    return Object.keys(CATEGORY_LABELS) as CatalogCategory[];
  }, [sourceListing, form.listingType]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (listingLinkedIntent && (listingLoading || listingError || !sourceListing)) {
      setError(listingError ?? 'Listing is still loading');
      return;
    }
    try {
      const listingMode = Boolean(sourceListing);
      const created = await apiRequest<{ id: string }>('/rfq', {
        method: 'POST',
        auth: true,
        body: {
          title: listingMode
            ? `RFQ: ${sourceListing!.name}`
            : form.title,
          description: listingMode
            ? buildSubmitDescription(sourceListing!, form.additionalNotes)
            : form.description,
          category: listingMode ? sourceListing!.category : form.category,
          listingType: listingMode
            ? sourceListing!.listingType
            : form.listingType || undefined,
          listingId: sourceListing?.id,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          country: form.country || undefined,
          state: form.state || undefined,
          city: form.city || undefined,
          deadlineAt: form.deadlineAt
            ? new Date(form.deadlineAt).toISOString()
            : undefined,
          ...(listingMode
            ? {}
            : {
                payloadCapacityKg: form.payloadCapacityKg
                  ? Number(form.payloadCapacityKg)
                  : undefined,
                enduranceMinutes: form.enduranceMinutes
                  ? Number(form.enduranceMinutes)
                  : undefined,
              }),
          isDgcaRequired: form.isDgcaRequired,
          targetBudgetInr: form.targetBudgetInr
            ? Number(form.targetBudgetInr)
            : undefined,
          specsDocumentUrl: form.specsDocumentUrl.trim() || undefined,
        },
      });
      router.push(`/buyer/rfqs/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  }

  const dgcaHighlightClass = form.isDgcaRequired
    ? 'platform-checkbox-highlight platform-checkbox-highlight--active'
    : 'platform-checkbox-highlight';

  const isListingMode = Boolean(sourceListing);
  const listingFlowActive = listingLinkedIntent && !listingError;

  const pageSubtitle = listingFlowActive
    ? isListingMode
      ? `Request a formal quotation from ${sourceListing!.organization.companyName} for “${sourceListing!.name}”.`
      : listingLoading
        ? 'Loading listing details…'
        : 'Request a quotation for this marketplace listing.'
    : 'Specify drone technical payload, flight endurance, and DGCA compliance requirements to receive verified vendor proposals.';

  const pageTitle = listingFlowActive
    ? 'Request quotation'
    : 'Post Drone Procurement RFQ';

  const showGeneralProcurementOverview =
    !listingLinkedIntent || Boolean(listingError);

  const formDisabled = Boolean(
    listingLinkedIntent && (listingLoading || listingError),
  );

  return (
    <>
      <PlatformPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        backHref="/buyer/rfqs"
        backLabel="My RFQs"
      />

      {listingLinkedIntent && listingLoading && (
        <div className="platform-card platform-muted">Loading listing details…</div>
      )}

      {listingLinkedIntent && listingError && (
        <div className="platform-card platform-error">
          {listingError}.{' '}
          <Link href="/marketplace">Browse marketplace</Link>
        </div>
      )}

      {sourceListing && (
        <>
          <div className="platform-callout platform-callout--partner platform-mb-md">
            <p className="platform-text-sm platform-mb-sm">
              <strong>Requesting quotation for:</strong>{' '}
              <Link href={`/marketplace/listings/${sourceListing.id}`}>
                {sourceListing.name}
              </Link>
            </p>
            <p className="platform-text-sm platform-muted">
              Supplier: {sourceListing.organization.companyName}
              {sourceListing.organization.city
                ? ` · ${[
                    sourceListing.organization.city,
                    sourceListing.organization.state,
                  ]
                    .filter(Boolean)
                    .join(', ')}`
                : null}
            </p>
          </div>
          <ListingSummaryCard listing={sourceListing} />
        </>
      )}

      {error && <div className="platform-card platform-error">{error}</div>}
      <form
        className="platform-card platform-form platform-stack platform-stack--lg"
        onSubmit={onSubmit}
      >
        {isListingMode ? (
          <fieldset className="platform-form-section" disabled={formDisabled}>
            <legend className="platform-form-section-title">Your request</legend>
            <FormField label="Quantity required *" htmlFor="rfq-quantity">
              <input
                id="rfq-quantity"
                type="number"
                min={1}
                required
                placeholder="e.g. 5"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Additional notes" htmlFor="rfq-additional-notes">
              <textarea
                id="rfq-additional-notes"
                rows={3}
                placeholder="Delivery preferences, customization, timeline, or other details for the supplier…"
                value={form.additionalNotes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, additionalNotes: e.target.value }))
                }
              />
            </FormField>
          </fieldset>
        ) : showGeneralProcurementOverview ? (
          <fieldset className="platform-form-section" disabled={formDisabled}>
            <legend className="platform-form-section-title">General Procurement Overview</legend>
            <FormField label="Title *" htmlFor="rfq-title">
              <input
                id="rfq-title"
                required
                placeholder="e.g. 10x Heavy-lift Agri Sprayer Drones with RTK"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </FormField>
            <FormField label="Detailed Scope of Work / Requirements *" htmlFor="rfq-description">
              <textarea
                id="rfq-description"
                required
                rows={3}
                placeholder="Describe intended deployment (e.g., spraying acreage, camera payloads, warranty expectations, delivery timeline)..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </FormField>
            <div className="platform-field-row">
              <FormField label="Category *" htmlFor="rfq-category">
                <select
                  id="rfq-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as CatalogCategory,
                    }))
                  }
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Listing type filter" htmlFor="rfq-listing-type">
                <select
                  id="rfq-listing-type"
                  value={form.listingType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      listingType: (e.target.value || '') as ListingType | '',
                    }))
                  }
                >
                  <option value="">Any Vendor Type</option>
                  {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((t) => (
                    <option key={t} value={t}>
                      {LISTING_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Required Quantity" htmlFor="rfq-quantity">
                <input
                  id="rfq-quantity"
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </FormField>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="platform-form-section platform-form-divider" disabled={formDisabled}>
          <legend className="platform-form-section-title">
            {listingFlowActive
              ? 'Commercial & compliance'
              : 'Drone Technical & Compliance Specifications'}
          </legend>
          {!listingFlowActive && (
            <>
              <div className="platform-form-section-head">
                <span aria-hidden>🛸</span>
                <span className="platform-text-sm platform-muted">Technical parameters</span>
              </div>
              <p className="platform-form-section-desc">
                Filter prospective quotes with hard technical parameters for payload, flight time, and certification.
              </p>
            </>
          )}
          {listingFlowActive && (
            <p className="platform-form-section-desc">
              Optional budget, supporting documents, and certification requirements for this listing.
            </p>
          )}

          <div className="platform-field-row">
            {!listingFlowActive && (
              <>
                <FormField label="Min. Payload Capacity (kg)" htmlFor="rfq-payload">
                  <input
                    id="rfq-payload"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 10 or 16"
                    value={form.payloadCapacityKg}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, payloadCapacityKg: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Min. Flight Endurance (Minutes)" htmlFor="rfq-endurance">
                  <input
                    id="rfq-endurance"
                    type="number"
                    min="1"
                    placeholder="e.g. 35"
                    value={form.enduranceMinutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, enduranceMinutes: e.target.value }))
                    }
                  />
                </FormField>
              </>
            )}
            <FormField label="Target Budget (Total INR)" htmlFor="rfq-budget">
              <input
                id="rfq-budget"
                type="number"
                min="0"
                placeholder="e.g. 4500000"
                value={form.targetBudgetInr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetBudgetInr: e.target.value }))
                }
              />
            </FormField>
          </div>

          <FormField label="Technical Tender Document / Specs URL (PDF or Doc)" htmlFor="rfq-specs-url">
            <input
              id="rfq-specs-url"
              type="url"
              placeholder="https://.../technical-spec-document.pdf"
              value={form.specsDocumentUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, specsDocumentUrl: e.target.value }))
              }
            />
          </FormField>

          <div className={dgcaHighlightClass}>
            <input
              type="checkbox"
              id="isDgcaRequired"
              checked={form.isDgcaRequired}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDgcaRequired: e.target.checked }))
              }
            />
            <label htmlFor="isDgcaRequired">
              🇮🇳 Mandatory DGCA Type Certification Required (Compliant with Drone Rules 2021)
            </label>
          </div>
        </fieldset>

        <fieldset className="platform-form-section platform-form-divider" disabled={formDisabled}>
          <legend className="platform-form-section-title">Delivery Location & Proposal Deadline</legend>
          <div className="platform-field-row">
            <FormField label="Country" htmlFor="rfq-country">
              <input
                id="rfq-country"
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
              />
            </FormField>
            <FormField label="State" htmlFor="rfq-state">
              <input
                id="rfq-state"
                placeholder="e.g. Karnataka"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
              />
            </FormField>
            <FormField label="City" htmlFor="rfq-city">
              <input
                id="rfq-city"
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </FormField>
          </div>
          <FormField label="Bidding Deadline" htmlFor="rfq-deadline">
            <input
              id="rfq-deadline"
              type="date"
              value={form.deadlineAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, deadlineAt: e.target.value }))
              }
            />
          </FormField>
        </fieldset>

        <Button
          type="submit"
          variant="cta"
          fullWidth
          className="platform-mt-md"
          disabled={formDisabled}
        >
          {listingFlowActive
            ? 'Send quotation request'
            : 'Publish Drone RFQ & Invite Vendors ↗'}
        </Button>
      </form>
    </>
  );
}
