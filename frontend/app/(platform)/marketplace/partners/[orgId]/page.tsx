'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

type PartnerProfile = {
  id: string;
  companyName: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  industries: string[];
  productsServicesDescription?: string | null;
  _count: { listings: number };
};

export default function PartnerPublicProfilePage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<PartnerProfile>(`/marketplace/partners/${orgId}`)
      .then(setProfile)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Partner not found'),
      )
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <p className="platform-muted">Loading partner profile…</p>;
  if (error || !profile) {
    return <div className="platform-card platform-error">{error ?? 'Not found'}</div>;
  }

  const location = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <PlatformPageHeader
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Partners', href: '/marketplace' },
          { label: profile.companyName },
        ]}
        title={profile.companyName}
        subtitle={
          <>
            Verified partner · {profile._count.listings} published listing
            {profile._count.listings === 1 ? '' : 's'}
          </>
        }
        actions={
          <Link href="/enquiry.php" className="platform-btn platform-btn-cta">
            Contact partner
          </Link>
        }
      />

      <div className="platform-detail-layout">
        <div className="platform-card platform-prose">
          {location && <p className="platform-muted">{location}</p>}
          {profile.website && (
            <p>
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="platform-auth-link-accent"
              >
                {profile.website}
              </a>
            </p>
          )}
          {profile.industries?.length > 0 && (
            <>
              <h3>Industries</h3>
              <p>{profile.industries.join(', ')}</p>
            </>
          )}
          {profile.productsServicesDescription && (
            <>
              <h3>About</h3>
              <p className="platform-pre-wrap">
                {profile.productsServicesDescription}
              </p>
            </>
          )}
        </div>

        <aside className="platform-detail-sidebar">
          <div className="platform-card">
            <p className="platform-sidebar-cta-lead">
              Interested in working with {profile.companyName}?
            </p>
            <Link
              href="/enquiry.php"
              className="platform-btn platform-btn-cta platform-btn-full"
            >
              Send enquiry
            </Link>
            <p className="platform-sidebar-cta-foot">
              <Link href="/marketplace" className="platform-back-link">
                ← Back to marketplace
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
