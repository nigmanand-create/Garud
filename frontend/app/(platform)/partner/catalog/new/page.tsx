'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import Link from 'next/link';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import {
  CatalogListingForm,
  CatalogListingPreviewPanel,
} from '@/components/platform/CatalogListingEditor';
import {
  buildListingPayload,
  emptyCatalogListingForm,
  type CatalogListingFormValues,
} from '@/lib/platform/catalog-listing-form';
import { parseGalleryImageUrls } from '@/lib/platform/listing-media';
import { ApiError } from '@/lib/api/types';

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
  const [form, setForm] = useState<CatalogListingFormValues>(emptyCatalogListingForm());

  useEffect(() => {
    apiRequest<{ canListProducts: boolean }>('/partner/me', { auth: true })
      .then((me) => setCanListProducts(me.canListProducts))
      .catch(() => setCanListProducts(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = buildListingPayload(form);
      const created = await apiRequest<{ id: string }>(
        '/partner/catalog/listings',
        {
          method: 'POST',
          auth: true,
          body: {
            ...payload,
            galleryImageUrls: parseGalleryImageUrls(form.galleryImageUrlsText),
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
            { label: 'New listing' },
          ]}
          title="Create new catalog listing"
          subtitle="Publish drone hardware, accessories, or services to the marketplace after platform review."
        />

        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}

          {!canListProducts && (
            <div className="platform-callout platform-callout--partner">
              <strong>Organization verification note:</strong>
              <p className="platform-form-section-desc">
                Your partner KYC is pending review. You can create draft listings
                now; submission unlocks once your account is verified.
              </p>
            </div>
          )}

          <div className="catalog-create-grid">
            <CatalogListingForm
              mode="create"
              form={form}
              setForm={setForm}
              onSubmit={onSubmit}
              footer={
                <>
                  <button
                    type="submit"
                    className="platform-btn platform-btn-cta"
                    disabled={submitting || !form.name.trim()}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Creating listing…' : 'Create & save listing'}
                  </button>
                  <Link href="/partner/catalog" className="platform-btn platform-btn-secondary">
                    Cancel
                  </Link>
                </>
              }
            />

            <CatalogListingPreviewPanel form={form} mode="create" />
          </div>
        </div>
      </div>
    </PartnerPageShell>
  );
}
