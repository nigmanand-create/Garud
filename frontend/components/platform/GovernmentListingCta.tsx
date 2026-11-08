'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import type { AuthUser } from '@/lib/api/types';
import { loginPathForIntent } from '@/lib/platform/auth-login';
import {
  GOV_TENDER_LISTING_ENQUIRY_SUBJECT,
  govTenderListingEnquiryHref,
} from '@/lib/platform/verticals';

type Props = {
  className?: string;
};

/** Routes and labels for “get this tender listed” (not marketplace RFQ). */
export function governmentListingCta(
  user: AuthUser | null | undefined,
  loading: boolean,
): { href: string; label: string } {
  const listingEnquiryPath = govTenderListingEnquiryHref();

  if (loading) {
    return { href: listingEnquiryPath, label: 'Submit a tender for listing' };
  }
  if (!user) {
    const next = encodeURIComponent(listingEnquiryPath);
    return {
      href: `${loginPathForIntent('buyer')}?next=${next}`,
      label: 'Sign in to submit a tender for listing',
    };
  }
  if (user.role === 'PLATFORM_ADMIN') {
    return {
      href: '/admin/gov-opportunities',
      label: 'Publish in admin (Gov & tenders)',
    };
  }
  if (user.role === 'BUYER' || user.role === 'GOVERNMENT') {
    return {
      href: listingEnquiryPath,
      label: 'Submit a tender for listing',
    };
  }
  return {
    href: `/enquiry?intent=TENDER&subject=${encodeURIComponent(GOV_TENDER_LISTING_ENQUIRY_SUBJECT)}`,
    label: 'Request listing via Garud',
  };
}

/**
 * Primary CTA on /government: admins publish curated items; buyers/government submit a listing request (enquiry), not marketplace RFQ.
 */
export function GovernmentListingCta({ className }: Props) {
  const { user, loading } = useAuth();

  const { href, label } = useMemo(
    () => governmentListingCta(user, loading),
    [user, loading],
  );

  return (
    <Link href={href} className={className ?? 'platform-btn platform-btn-cta'}>
      {label}
    </Link>
  );
}
