'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { EnquiryForm } from '@/components/platform/EnquiryForm';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

function EnquiryPageInner() {
  const searchParams = useSearchParams();
  const service = searchParams.get('service') ?? undefined;
  const subjectParam = searchParams.get('subject') ?? undefined;

  const title =
    service === 'compliance'
      ? 'DGCA & Regulatory Compliance'
      : subjectParam || 'Contact GarudHub';

  return (
    <>
      <PlatformPageHeader
        title={title}
        subtitle="Tell us about your drone requirement. Enquiries are routed to the Garud platform admin queue."
      />
      <EnquiryForm
        serviceKey={service}
        defaultSubject={subjectParam ?? ''}
        sourcePage={
          service
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
