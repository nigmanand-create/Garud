'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PartnerOnboardingChecklist } from '@/components/platform/PartnerOnboardingChecklist';
import { PartnerShortcuts } from '@/components/platform/PartnerShortcuts';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { getPartnerPrimaryCta } from '@/lib/platform/partner-onboarding';
import type { VerificationStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type PartnerMe = {
  id: string;
  companyName: string;
  country: string;
  contactPersonName: string;
  contactEmail: string;
  contactMobile: string;
  verificationStatus: VerificationStatus;
  canEdit: boolean;
  canListProducts: boolean;
  documentCount: number;
  listingCount: number;
  rejectionReason?: string | null;
  submittedAt?: string | null;
};

export default function PartnerDashboardPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <PartnerDashboardInner />
    </RequireAuth>
  );
}

function PartnerDashboardInner() {
  const [data, setData] = useState<PartnerMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PartnerMe>('/partner/me', { auth: true })
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load profile'),
      );
  }, []);

  const primaryCta = data ? getPartnerPrimaryCta(data) : null;

  return (
    <PartnerPageShell>
      <PlatformPageHeader
        title="Partner dashboard"
        subtitle={
          data
            ? `${data.companyName} — manage verification, catalog, and buyer RFQs.`
            : 'Your hub for onboarding and marketplace activity.'
        }
        badge={data ? <StatusBadge status={data.verificationStatus} /> : undefined}
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      {!data && !error && <PlatformLoading />}
      {data && (
        <>
          {primaryCta && (
            <div className="platform-partner-cta-banner">
              <div>
                <strong>Next step</strong>
                <p className="platform-muted" style={{ margin: '0.25rem 0 0' }}>
                  Pick up where you left off in partner onboarding.
                </p>
              </div>
              <Link href={primaryCta.href} className="platform-btn platform-btn-cta">
                {primaryCta.label}
              </Link>
            </div>
          )}

          <div className="platform-stat-grid">
            <div className="platform-stat-card">
              <strong>{data.documentCount}</strong>
              <span>Documents uploaded</span>
            </div>
            <div className="platform-stat-card">
              <strong>{data.listingCount}</strong>
              <span>Catalog listings</span>
            </div>
            {data.submittedAt && (
              <div className="platform-stat-card">
                <strong style={{ fontSize: '1rem' }}>
                  {new Date(data.submittedAt).toLocaleDateString()}
                </strong>
                <span>Submitted on</span>
              </div>
            )}
          </div>

          {data.rejectionReason && (
            <div className="platform-card platform-error" role="alert">
              <strong>Application feedback</strong>
              <p style={{ margin: '0.35rem 0 0' }}>{data.rejectionReason}</p>
              {data.canEdit && (
                <Link
                  href="/partner/application"
                  className="platform-btn platform-btn-secondary"
                  style={{ marginTop: '0.75rem' }}
                >
                  Update application
                </Link>
              )}
            </div>
          )}

          <PartnerOnboardingChecklist
            data={data}
            verificationStatus={data.verificationStatus}
          />

          <PartnerShortcuts data={data} />
        </>
      )}
    </PartnerPageShell>
  );
}
