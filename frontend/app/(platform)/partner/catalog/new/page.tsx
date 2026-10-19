'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import Link from 'next/link';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { parseGalleryImageUrls } from '@/lib/platform/listing-media';
import { ListingImageFields } from '@/components/platform/ListingImageFields';

const COMMON_APPLICATIONS = [
  'Agriculture Spraying',
  'Topographic Survey & Mapping',
  'Industrial & Infrastructure Inspection',
  'Security & Surveillance',
  'Disaster Management & Search & Rescue',
  'Mining & Volumetric Estimation',
  'Powerline & Solar Panel Monitoring',
  'Delivery & Logistics Payload',
];

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
    technicalSpecs: '',
    applications: [] as string[],
    minOrderQuantity: 1,
    warranty: '',
    priceOnRequest: true,
    priceInr: '',
  });

  useEffect(() => {
    apiRequest<{ canListProducts: boolean }>('/partner/me', { auth: true })
      .then((me) => setCanListProducts(me.canListProducts))
      .catch(() => setCanListProducts(false));
  }, []);

  function toggleApplication(app: string) {
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

  // Quality score & checklist
  const { score, checks } = useMemo(() => {
    const list = [
      { label: 'Product Name specified', done: form.name.trim().length >= 3 },
      { label: 'Brand / OEM identified', done: form.brand.trim().length >= 2 },
      { label: 'Primary photo uploaded', done: Boolean(form.primaryImageUrl.trim()) },
      { label: 'Pricing terms configured', done: form.priceOnRequest || Number(form.priceInr) > 0 },
      { label: 'Technical specs provided', done: form.technicalSpecs.trim().length >= 20 },
      { label: 'Product description written', done: form.description.trim().length >= 30 },
    ];
    const completedCount = list.filter((c) => c.done).length;
    const pct = Math.round((completedCount / list.length) * 100);
    return { score: pct, checks: list };
  }, [form]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
            name: form.name.trim(),
            brand: form.brand.trim() || undefined,
            sku: form.sku.trim() || undefined,
            primaryImageUrl: form.primaryImageUrl.trim() || undefined,
            galleryImageUrls: parseGalleryImageUrls(form.galleryImageUrlsText),
            description: form.description.trim() || undefined,
            technicalSpecs: form.technicalSpecs.trim() || undefined,
            applications: form.applications.length > 0 ? form.applications : undefined,
            minOrderQuantity: form.minOrderQuantity > 0 ? Number(form.minOrderQuantity) : undefined,
            warranty: form.warranty.trim() || undefined,
            priceOnRequest: form.priceOnRequest,
            priceInr: form.priceOnRequest
              ? undefined
              : Number(form.priceInr),
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
      <div className="platform-partner-form-page platform-partner-form-page--sticky-actions">
        <PlatformPageHeader
          breadcrumbs={[
            { label: 'Catalog', href: '/partner/catalog' },
            { label: 'New Listing' },
          ]}
          title="Create New Catalog Listing"
          subtitle="Publish drone hardware, accessories, or services to the public marketplace after platform review."
        />

        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}

          {!canListProducts && (
            <div
              className="platform-callout platform-callout--partner"
              style={{
                borderLeft: '4px solid #2f5233',
                background: '#f3f7f4',
                padding: '1rem',
                borderRadius: 8,
                marginBottom: '1rem',
              }}
            >
              <strong>Organization Verification Note:</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                Your partner KYC application is pending or in review. You can create and save draft listings now, which will unlock submission for marketplace publication once your account is verified.
              </p>
            </div>
          )}

          <div className="catalog-create-grid">
            {/* Left: Main Form Cards */}
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Card 1: Classification & Type */}
              <div className="platform-card platform-form">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  1. Classification & Type
                </h2>
                <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Select whether you are listing drone hardware equipment or specialized drone services.
                </p>

                {/* Segmented Type Switcher */}
                <div className="catalog-type-selector">
                  <div
                    className={`catalog-type-btn ${form.listingType === 'PRODUCT' ? 'catalog-type-btn--active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, listingType: 'PRODUCT' }))}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="catalog-type-icon">🚁</span>
                    <div>
                      <div className="catalog-type-title">Hardware / Equipment</div>
                      <div className="catalog-type-desc">Drones, sensors, payloads, spare parts, and accessories</div>
                    </div>
                  </div>

                  <div
                    className={`catalog-type-btn ${form.listingType === 'SERVICE' ? 'catalog-type-btn--active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, listingType: 'SERVICE' }))}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="catalog-type-icon">🛠️</span>
                    <div>
                      <div className="catalog-type-title">Service Offering</div>
                      <div className="catalog-type-desc">Maintenance, pilot training, data processing, & consultancy</div>
                    </div>
                  </div>
                </div>

                <div className="platform-field">
                  <label htmlFor="category">Marketplace Category *</label>
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
                    {(Object.keys(CATEGORY_LABELS) as CatalogCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Card 2: Basic Identity */}
              <div className="platform-card platform-form">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  2. Listing Identity
                </h2>
                <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Enter the commercial product name and model identification numbers.
                </p>

                <div className="platform-field">
                  <label htmlFor="name">Listing / Product Name *</label>
                  <input
                    id="name"
                    required
                    placeholder="e.g. Garud Falcon 4 Pro Agricultural Spraying Drone"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="platform-form-field-pair">
                  <div className="platform-field">
                    <label htmlFor="brand">Brand / OEM Manufacturer</label>
                    <input
                      id="brand"
                      placeholder="e.g. Garud Aero Dynamics"
                      value={form.brand}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="sku">Model / DGCA Code / SKU</label>
                    <input
                      id="sku"
                      placeholder="e.g. GD-FALCON-4P"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="platform-field">
                  <label htmlFor="description">Overview Description</label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe the capabilities, flight stability, industrial use cases, and key features…"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Card 3: Commercial Pricing & Terms */}
              <div className="platform-card platform-form">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  3. Pricing & Terms
                </h2>
                <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Configure whether this item has a fixed purchase price or requires RFQ quotations.
                </p>

                <label className="platform-checkbox-row" style={{ alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.priceOnRequest}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceOnRequest: e.target.checked }))
                    }
                  />
                  <span>
                    <strong>Price on request (POR)</strong> — Recommended for high-value enterprise drones and custom service contracts
                  </span>
                </label>

                {!form.priceOnRequest && (
                  <div className="platform-field" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="priceInr">Price (INR ₹) *</label>
                    <input
                      id="priceInr"
                      type="number"
                      min={0}
                      required
                      placeholder="e.g. 450000"
                      value={form.priceInr}
                      onChange={(e) => setForm((f) => ({ ...f, priceInr: e.target.value }))}
                    />
                  </div>
                )}

                <div className="platform-form-field-pair" style={{ marginTop: '1rem' }}>
                  <div className="platform-field">
                    <label htmlFor="minOrderQuantity">Minimum Order Quantity (MOQ)</label>
                    <input
                      id="minOrderQuantity"
                      type="number"
                      min={1}
                      value={form.minOrderQuantity}
                      onChange={(e) => setForm((f) => ({ ...f, minOrderQuantity: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="warranty">Warranty Period</label>
                    <input
                      id="warranty"
                      placeholder="e.g. 1 Year Comprehensive / 500 Flight Hours"
                      value={form.warranty}
                      onChange={(e) => setForm((f) => ({ ...f, warranty: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Visual Media */}
              <div className="platform-card platform-form">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  4. Visual Media Assets
                </h2>
                <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Upload high-resolution photography. Listings with clear imagery against clean backgrounds pass moderation fastest.
                </p>

                <ListingImageFields
                  primaryImageUrl={form.primaryImageUrl}
                  galleryImageUrlsText={form.galleryImageUrlsText}
                  onPrimaryChange={(url) => setForm((f) => ({ ...f, primaryImageUrl: url }))}
                  onGalleryTextChange={(text) => setForm((f) => ({ ...f, galleryImageUrlsText: text }))}
                />
              </div>

              {/* Card 5: Technical Specifications & Applications */}
              <div className="platform-card platform-form">
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  5. Technical Specifications & Applications
                </h2>
                <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Detail the engineering parameters (flight endurance, payload capacity, battery, sensors) required by enterprise buyers.
                </p>

                <div className="platform-field">
                  <label htmlFor="technicalSpecs">Technical Specifications (Key: Value or Structured)</label>
                  <textarea
                    id="technicalSpecs"
                    rows={6}
                    placeholder={`Endurance: 45 Minutes (with 10L payload)\nPayload Capacity: 10 kg / 16 Liters\nRange: 5 km Transmission Distance\nPositioning: RTK Dual-Antenna Sub-Centimeter\nWind Resistance: Grade 6 (12 m/s)`}
                    value={form.technicalSpecs}
                    onChange={(e) => setForm((f) => ({ ...f, technicalSpecs: e.target.value }))}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Target Industrial Applications (Click to select)
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {COMMON_APPLICATIONS.map((app) => {
                      const selected = form.applications.includes(app);
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => toggleApplication(app)}
                          style={{
                            background: selected ? 'var(--platform-accent, #2f5233)' : '#f1f5f9',
                            color: selected ? '#fff' : '#475569',
                            border: `1px solid ${selected ? 'var(--platform-accent, #2f5233)' : '#cbd5e1'}`,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {selected ? '✓ ' : '+ '}
                          {app}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="platform-form-sticky-footer">
                <button
                  type="submit"
                  className="platform-btn platform-btn-cta"
                  disabled={submitting || !form.name.trim()}
                  aria-busy={submitting}
                  style={{ minWidth: 160 }}
                >
                  {submitting ? 'Creating Listing…' : 'Create & Save Listing'}
                </button>
                <Link href="/partner/catalog" className="platform-btn platform-btn-secondary">
                  Cancel
                </Link>
              </div>
            </form>

            {/* Right: Sticky Live Preview & Readiness Score */}
            <div className="catalog-preview-sticky">
              {/* Quality & Readiness Score */}
              <div className="catalog-quality-card">
                <div className="catalog-quality-header">
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Listing Readiness
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: score === 100 ? '#15803d' : '#b45309' }}>
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

              {/* Live Card Preview */}
              <div className="catalog-preview-box">
                <div className="catalog-preview-header">
                  <span>Live Marketplace Preview</span>
                  <span style={{ fontSize: '0.725rem', color: '#16a34a', fontWeight: 600 }}>● REAL-TIME</span>
                </div>

                <div className="catalog-mock-card">
                  {form.primaryImageUrl ? (
                    <img
                      src={form.primaryImageUrl}
                      alt={form.name || 'Preview'}
                      className="catalog-mock-img"
                    />
                  ) : (
                    <div className="catalog-mock-placeholder">
                      <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📷</span>
                      <span>No image uploaded yet</span>
                    </div>
                  )}

                  <div className="catalog-mock-content">
                    <div className="catalog-mock-category">
                      {CATEGORY_LABELS[form.category]}
                    </div>
                    <div className="catalog-mock-title">
                      {form.name || 'Your Listing Name Here'}
                    </div>
                    <div className="catalog-mock-brand">
                      {form.brand || 'Brand / Manufacturer'}
                      {form.sku && ` · ${form.sku}`}
                    </div>

                    <div className="catalog-mock-price-row">
                      <div className="catalog-mock-price">
                        {formatPrice(form.priceOnRequest, form.priceInr || undefined)}
                      </div>
                      <button type="button" className="catalog-mock-btn" disabled>
                        {form.priceOnRequest ? 'Request RFQ' : 'Add to cart'}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                    padding: '0.75rem',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: '#334155', display: 'block', marginBottom: 2 }}>
                    Moderation Advice:
                  </strong>
                  After creation, your listing will be saved as <strong>Draft</strong>. You can then submit it for platform moderation with 1-click. Garud admins verify compliance, warranty, and imagery before it goes live.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PartnerPageShell>
  );
}
