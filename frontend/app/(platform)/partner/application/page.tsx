'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { FormField } from '@/components/platform/FormField';
import { ApiError } from '@/lib/api/types';
import type { VerificationStatus } from '@/lib/api/types';

type PartnerMe = {
  companyName: string;
  country: string;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  companyType?: string | null;
  yearEstablished?: number | null;
  gst?: string | null;
  cin?: string | null;
  contactPersonName: string;
  contactEmail: string;
  contactMobile: string;
  productsServicesDescription?: string | null;
  industries: string[];
  partnershipTypes: string[];
  verificationStatus: VerificationStatus;
  canEdit: boolean;
};

export default function PartnerApplicationPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <ApplicationInner />
    </RequireAuth>
  );
}

function ApplicationInner() {
  const [form, setForm] = useState<PartnerMe | null>(null);
  const [industriesText, setIndustriesText] = useState('');
  const [partnershipTypesText, setPartnershipTypesText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<PartnerMe>('/partner/me', { auth: true })
      .then((d) => {
        setForm(d);
        setIndustriesText((d.industries ?? []).join(', '));
        setPartnershipTypesText((d.partnershipTypes ?? []).join(', '));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load'),
      );
  }, []);

  function update(field: keyof PartnerMe, value: string | number) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !form.canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const industries = industriesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const partnershipTypes = partnershipTypesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiRequest('/partner/application', {
        method: 'PATCH',
        auth: true,
        body: {
          companyName: form.companyName,
          country: form.country,
          state: form.state || undefined,
          city: form.city || undefined,
          website: form.website || undefined,
          companyType: form.companyType || undefined,
          yearEstablished: form.yearEstablished ?? undefined,
          gst: form.gst || undefined,
          cin: form.cin || undefined,
          contactPersonName: form.contactPersonName,
          contactEmail: form.contactEmail,
          contactMobile: form.contactMobile,
          productsServicesDescription:
            form.productsServicesDescription || undefined,
          industries,
          partnershipTypes,
        },
      });
      setMessage('Application saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const docs = await apiRequest<{ id: string }[]>('/partner/documents', {
        auth: true,
      });
      if (docs.length < 1) {
        setError(
          'Upload at least one verification document before submitting.',
        );
        return;
      }
      await apiRequest('/partner/application/submit', {
        method: 'POST',
        auth: true,
      });
      setMessage('Submitted for verification.');
      const d = await apiRequest<PartnerMe>('/partner/me', { auth: true });
      setForm(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!form) {
    return (
      <PartnerPageShell>
        <div className="platform-partner-form-page">
          <PlatformPageHeader
            title="Partner application"
            subtitle="Complete your company profile and submit for Garud verification."
          />
          {error ? (
            <div className="platform-form-layout platform-form-layout--wide">
              <div className="platform-card platform-error">{error}</div>
            </div>
          ) : (
            <PlatformLoading label="Loading application…" />
          )}
        </div>
      </PartnerPageShell>
    );
  }

  const isApproved = form.verificationStatus === 'APPROVED';
  const isInReview =
    form.verificationStatus === 'SUBMITTED' ||
    form.verificationStatus === 'UNDER_REVIEW';

  const statusCallout =
    isApproved
      ? 'Your company is verified. You can publish listings and respond to RFQs.'
      : form.verificationStatus === 'REJECTED'
        ? 'Please address feedback, update your profile, and submit again.'
        : isInReview
          ? 'Your application is with Garud. Your profile is read-only until review is complete.'
          : 'Complete all sections, upload documents, then submit for verification.';

  const statusCalloutClass = isApproved
    ? 'platform-callout platform-callout--success'
    : isInReview
      ? 'platform-callout platform-callout--partner'
      : form.verificationStatus === 'REJECTED'
        ? 'platform-callout'
        : 'platform-callout platform-callout--partner';

  const formReadOnly = !form.canEdit;

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Partner application"
          subtitle={
            isApproved
              ? 'Your verified company profile on Garud.'
              : 'Complete your company profile and submit for Garud verification.'
          }
          badge={<StatusBadge status={form.verificationStatus} />}
        />
        <div className="platform-form-layout platform-form-layout--wide">
          {error && (
            <div
              className="platform-card platform-error"
              role="alert"
              aria-live="polite"
            >
              {error}
              {error.includes('verification document') && (
                <>
                  {' '}
                  <Link href="/partner/documents">Go to documents</Link>
                </>
              )}
            </div>
          )}
          {message && (
            <div
              className="platform-card platform-success"
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          )}

          <div className={statusCalloutClass} role="status">
            {statusCallout}
          </div>

          <form
            className={`platform-card platform-form platform-form-card${formReadOnly ? ' platform-form-readonly' : ''}`}
            onSubmit={save}
          >
        <fieldset className="platform-form-section" disabled={formReadOnly}>
          <legend className="platform-form-section-title">Company details</legend>
          <p className="platform-form-section-desc">
            Legal entity information shown to buyers after verification.
          </p>
          <FormField label="Company name" htmlFor="companyName">
            <input
              id="companyName"
              required
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
            />
          </FormField>
          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                required
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="state">State</label>
              <input
                id="state"
                value={form.state ?? ''}
                onChange={(e) => update('state', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
          </div>
          <div className="platform-field">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="url"
              placeholder="https://"
              value={form.website ?? ''}
              onChange={(e) => update('website', e.target.value)}
            />
          </div>
          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="companyType">Company type</label>
              <input
                id="companyType"
                placeholder="Manufacturer, distributor, …"
                value={form.companyType ?? ''}
                onChange={(e) => update('companyType', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="yearEstablished">Year established</label>
              <input
                id="yearEstablished"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                value={form.yearEstablished ?? ''}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          yearEstablished: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }
                      : f,
                  )
                }
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="platform-form-section" disabled={formReadOnly}>
          <legend className="platform-form-section-title">Registration</legend>
          <p className="platform-form-section-desc">
            Tax and company IDs used during verification (optional where not applicable).
          </p>
          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="gst">GST</label>
              <input
                id="gst"
                value={form.gst ?? ''}
                onChange={(e) => update('gst', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="cin">CIN</label>
              <input
                id="cin"
                value={form.cin ?? ''}
                onChange={(e) => update('cin', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="platform-form-section" disabled={formReadOnly}>
          <legend className="platform-form-section-title">Primary contact</legend>
          <p className="platform-form-section-desc">
            Garud and buyers use these details for verification and RFQs.
          </p>
          <div className="platform-field">
            <label htmlFor="contactPersonName">Contact name</label>
            <input
              id="contactPersonName"
              required
              value={form.contactPersonName}
              onChange={(e) => update('contactPersonName', e.target.value)}
            />
          </div>
          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="contactEmail">Contact email</label>
              <input
                id="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="contactMobile">Contact mobile</label>
              <input
                id="contactMobile"
                required
                value={form.contactMobile}
                onChange={(e) => update('contactMobile', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="platform-form-section" disabled={formReadOnly}>
          <legend className="platform-form-section-title">Offerings</legend>
          <p className="platform-form-section-desc">
            What you sell or service — helps match buyer RFQs to your catalog.
          </p>
          <div className="platform-field">
            <label htmlFor="productsServicesDescription">
              Products / services description
            </label>
            <textarea
              id="productsServicesDescription"
              value={form.productsServicesDescription ?? ''}
              onChange={(e) =>
                setForm((f) =>
                  f ? { ...f, productsServicesDescription: e.target.value } : f,
                )
              }
            />
          </div>
          <div className="platform-field">
            <label htmlFor="industries">Industries (comma-separated)</label>
            <input
              id="industries"
              placeholder="Agriculture, Logistics, …"
              value={industriesText}
              onChange={(e) => setIndustriesText(e.target.value)}
            />
          </div>
          <div className="platform-field">
            <label htmlFor="partnershipTypes">
              Partnership types (comma-separated)
            </label>
            <input
              id="partnershipTypes"
              placeholder="DISTRIBUTION, OEM, …"
              value={partnershipTypesText}
              onChange={(e) => setPartnershipTypesText(e.target.value)}
            />
          </div>
        </fieldset>

        <div className="platform-actions">
          {form.canEdit && (
            <>
              <button
                type="submit"
                className="platform-btn platform-btn-secondary"
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-cta"
                disabled={submitting}
                aria-busy={submitting}
                onClick={submit}
              >
                {submitting ? 'Submitting…' : 'Submit for verification'}
              </button>
            </>
          )}
        </div>
          </form>
        </div>
      </div>
    </PartnerPageShell>
  );
}
