'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { EnquiryForm } from '@/components/platform/EnquiryForm';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import type { EnquiryIntent } from '@/lib/api/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTENTS: EnquiryIntent[] = [
  'GENERAL',
  'PRODUCT',
  'DEMO',
  'DISTRIBUTOR',
  'PARTNER',
  'SERVICE',
  'TRAINING',
  'FINANCE',
  'REPAIR',
  'SCRAP',
  'TENDER',
];

function uuidParam(value: string | null): string | undefined {
  return value && UUID_RE.test(value) ? value : undefined;
}

function EnquiryPageInner() {
  const searchParams = useSearchParams();
  const service = searchParams.get('service') ?? undefined;
  const subjectParam = searchParams.get('subject') ?? undefined;
  const messageParam = searchParams.get('message') ?? undefined;
  const listingId = uuidParam(searchParams.get('listing'));
  const organizationId = uuidParam(searchParams.get('partner'));
  const intentRaw = searchParams.get('intent')?.toUpperCase() as EnquiryIntent;
  const intent = INTENTS.includes(intentRaw) ? intentRaw : undefined;

  const title =
    service === 'compliance'
      ? 'DGCA & Regulatory Compliance'
      : subjectParam || 'Contact GarudHub';

  return (
    <>
      <PlatformPageHeader
        title={title}
        subtitle={
          listingId || organizationId
            ? 'Tell us about your requirement. Your enquiry is sent to the supplier and tracked by GarudHub.'
            : 'Tell us about your drone requirement. Our team will review it and connect you with the right partner.'
        }
      />
      <EnquiryForm
        serviceKey={service}
        defaultSubject={subjectParam ?? ''}
        defaultMessage={messageParam ?? ''}
        listingId={listingId}
        organizationId={organizationId}
        intent={intent}
        sourcePage={
          listingId
            ? `/marketplace/listings/${listingId}`
            : organizationId
              ? `/marketplace/partners/${organizationId}`
              : service
                ? `/enquiry?service=${encodeURIComponent(service)}`
                : subjectParam
                  ? `/enquiry?subject=${encodeURIComponent(subjectParam)}`
                  : '/enquiry'
        }
      />
    </>
  );
}

export default function EnquiryPage() {
  return (
    <Suspense fallback={<div className="platform-card">Loading form…</div>}>
      <EnquiryPageInner />
    </Suspense>
  );
}
