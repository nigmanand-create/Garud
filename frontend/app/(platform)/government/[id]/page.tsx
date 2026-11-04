'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EnquiryForm } from '@/components/platform/EnquiryForm';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { getGovOpportunity, type GovOpportunity } from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import {
  closingLabel,
  formatInrCompact,
  GOV_TYPE_LABELS,
  tenderEnquiryDefaults,
} from '@/lib/platform/verticals';

export default function GovernmentOpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<GovOpportunity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGovOpportunity(id)
      .then(setItem)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Opportunity not found'));
  }, [id]);

  if (error) return <div className="platform-card platform-error">{error}</div>;
  if (!item) return <PlatformLoading />;

  const defaults = tenderEnquiryDefaults(item);

  return (
    <>
      <PlatformPageHeader
        title={item.title}
        subtitle={`${GOV_TYPE_LABELS[item.type]} · ${item.issuingBody}${item.state ? ` · ${item.state}` : ''}`}
        breadcrumbs={[
          { label: 'Services', href: '/services' },
          { label: 'Government', href: '/government' },
          { label: item.title },
        ]}
      />
      <div className="platform-card">
        <p>{item.summary}</p>
        <ul className="platform-list">
          {item.referenceNo && <li>Reference: {item.referenceNo}</li>}
          <li>Estimated value: {formatInrCompact(item.estimatedValueInr)}</li>
          {item.openDate && <li>Opens: {new Date(item.openDate).toLocaleDateString('en-IN')}</li>}
          <li>
            {item.closingDate
              ? `Closing: ${new Date(item.closingDate).toLocaleDateString('en-IN')} (${closingLabel(item.closingDate)})`
              : closingLabel(null)}
          </li>
        </ul>
        {item.description && <p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>}
        {item.eligibility && (
          <p>
            <strong>Eligibility:</strong> {item.eligibility}
          </p>
        )}
        {item.sourceUrl && (
          <p>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              Official source ↗
            </a>
          </p>
        )}
      </div>

      {item.isExpired || item.status === 'CLOSED' ? (
        <div className="platform-card platform-muted">This opportunity is closed.</div>
      ) : (
        <>
          <h2 className="platform-section-heading">Express interest</h2>
          <EnquiryForm
            serviceKey="tender"
            intent="TENDER"
            defaultSubject={defaults.subject}
            defaultMessage={defaults.message}
            sourcePage={`/government/${item.id}`}
          />
        </>
      )}
    </>
  );
}
