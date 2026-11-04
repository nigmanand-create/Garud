'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { apiRequest } from '@/lib/api/client';
import { submitEnquiry } from '@/lib/api/enquiries';
import { ApiError } from '@/lib/api/types';
import {
  buildDistributorMessage,
  buildDistributorSubject,
  DISTRIBUTOR_TYPE_LABELS,
  parseDistributorType,
  type DistributorRequestType,
} from '@/lib/platform/distributor';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ListingContext = {
  id: string;
  name: string;
  brand?: string | null;
  organization: { id: string; companyName: string };
};

function DistributorInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const listingParam = searchParams.get('listing');
  const partnerParam = searchParams.get('partner');
  const listingId = listingParam && UUID_RE.test(listingParam) ? listingParam : undefined;
  const partnerId = partnerParam && UUID_RE.test(partnerParam) ? partnerParam : undefined;

  const [type, setType] = useState<DistributorRequestType>(
    parseDistributorType(searchParams.get('type')),
  );
  const [context, setContext] = useState<ListingContext | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [territory, setTerritory] = useState('');
  const [experience, setExperience] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    if (!listingId) return;
    apiRequest<ListingContext>(`/marketplace/listings/${listingId}`)
      .then(setContext)
      .catch(() => setContext(null));
  }, [listingId]);

  const targetOrgId = context?.organization.id ?? partnerId;
  const isPartner = user?.role === 'PARTNER';
  const productName = context?.name;
  const supplierName = context?.organization.companyName;

  const partnershipHref = useMemo(
    () => (targetOrgId ? `/partner/partnerships?target=${targetOrgId}` : '/partner/partnerships'),
    [targetOrgId],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitEnquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: buildDistributorSubject(type, productName),
        message: buildDistributorMessage({
          type,
          company,
          territory,
          experience,
          annualVolume,
          notes,
          productName,
          supplierName,
        }),
        sourcePage: listingId
          ? `/marketplace/distributor?listing=${listingId}&type=${type}`
          : `/marketplace/distributor?type=${type}`,
        intent: 'DISTRIBUTOR',
        listingId,
        organizationId: listingId ? undefined : partnerId,
      });
      setSuccessId(res.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your request');
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = listingId ? `/marketplace/listings/${listingId}` : '/marketplace';

  return (
    <>
      <PlatformPageHeader
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          ...(context ? [{ label: context.name, href: backHref }] : []),
          { label: type === 'DEALER' ? 'Become a dealer' : 'Become a distributor' },
        ]}
        title={type === 'DEALER' ? 'Apply for a dealership' : 'Become a distributor'}
        subtitle={
          context
            ? `Tell ${context.organization.companyName} where you can sell ${context.name}. They review distributor requests directly in their GarudHub lead inbox.`
            : 'Tell us the territory you can cover and the brands you want to represent. We route your request to the right OEM or international partner.'
        }
      />

      {successId ? (
        <div className="platform-card platform-success" role="status">
          <h2 style={{ marginTop: 0 }}>Request received</h2>
          <p>
            Reference <code>{successId.slice(0, 8)}</code>.{' '}
            {context
              ? `${context.organization.companyName} and the GarudHub team will respond on `
              : 'The GarudHub team will respond on '}
            <strong>{email}</strong> within 1–2 business days.
          </p>
          <div className="platform-actions platform-mt-md">
            <Link href={backHref} className="platform-btn platform-btn-secondary">
              {listingId ? 'Back to product' : 'Back to marketplace'}
            </Link>
            {isPartner && (
              <Link href={partnershipHref} className="platform-btn platform-btn-cta">
                Also send a formal partnership request
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="platform-detail-layout">
          <form className="platform-card platform-form" onSubmit={onSubmit}>
            {context && (
              <div className="platform-callout" role="note">
                <strong>{context.name}</strong>
                {context.brand ? ` · ${context.brand}` : ''}
                <br />
                <span className="platform-muted platform-text-muted-sm">
                  Supplier: {context.organization.companyName}
                </span>
              </div>
            )}
            {error && (
              <div className="platform-error" role="alert">
                {error}
              </div>
            )}

            <div className="platform-form-field-pair">
              <div>
                <label htmlFor="dist-type">I want to be a</label>
                <select
                  id="dist-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DistributorRequestType)}
                >
                  {(Object.keys(DISTRIBUTOR_TYPE_LABELS) as DistributorRequestType[]).map((t) => (
                    <option key={t} value={t}>
                      {DISTRIBUTOR_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dist-company">Company name</label>
                <input
                  id="dist-company"
                  required
                  minLength={2}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="platform-form-field-pair">
              <div>
                <label htmlFor="dist-name">Contact person</label>
                <input
                  id="dist-name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="dist-email">Work email</label>
                <input
                  id="dist-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="platform-form-field-pair">
              <div>
                <label htmlFor="dist-phone">Phone (optional)</label>
                <input
                  id="dist-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="dist-territory">Territory you can cover</label>
                <input
                  id="dist-territory"
                  required
                  minLength={2}
                  maxLength={300}
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="e.g. Maharashtra, Gujarat"
                />
              </div>
            </div>

            <div className="platform-form-field-pair">
              <div>
                <label htmlFor="dist-exp">Relevant experience (optional)</label>
                <input
                  id="dist-exp"
                  maxLength={300}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 6 yrs agri-equipment dealership"
                />
              </div>
              <div>
                <label htmlFor="dist-volume">Expected annual volume (optional)</label>
                <input
                  id="dist-volume"
                  maxLength={200}
                  value={annualVolume}
                  onChange={(e) => setAnnualVolume(e.target.value)}
                  placeholder="e.g. 50 units"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dist-notes">Anything else? (optional)</label>
              <textarea
                id="dist-notes"
                rows={4}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="platform-form-actions">
              <button type="submit" className="platform-btn platform-btn-cta" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>

          <aside className="platform-detail-sidebar">
            <div className="platform-card">
              <h3 className="platform-section-heading">What happens next</h3>
              <ol className="platform-compare-steps">
                <li>Your request becomes a tracked lead for the supplier.</li>
                <li>The GarudHub team is copied and can step in to match you.</li>
                <li>Shortlisted applicants get a call to agree territory and terms.</li>
              </ol>
              {isPartner && (
                <p className="platform-mt-md platform-text-muted-sm">
                  Already a verified GarudHub partner?{' '}
                  <Link href={partnershipHref} className="platform-inline-link">
                    Submit a formal partnership request
                  </Link>{' '}
                  for admin review.
                </p>
              )}
              {!user && (
                <p className="platform-mt-md platform-text-muted-sm">
                  Want faster routing and a partner dashboard?{' '}
                  <Link href="/auth/register?type=partner" className="platform-inline-link">
                    Register as a B2B partner
                  </Link>
                  .
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default function DistributorRequestPage() {
  return (
    <Suspense fallback={<div className="platform-card">Loading form…</div>}>
      <DistributorInner />
    </Suspense>
  );
}
