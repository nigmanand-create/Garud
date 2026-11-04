'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  cancelServiceRequest,
  trackServiceRequest,
  type TrackedServiceRequest,
} from '@/lib/api/service-requests';
import { ApiError } from '@/lib/api/types';
import {
  canRequesterCancel,
  SERVICE_REQUEST_CATEGORY_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STEPS,
  statusStepIndex,
} from '@/lib/platform/verticals';

export default function TrackServiceRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<TrackedServiceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    trackServiceRequest(token)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load this request'),
      );
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel() {
    if (!window.confirm('Cancel this service request?')) return;
    try {
      setData(await cancelServiceRequest(token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel');
    }
  }

  if (error && !data) {
    return <div className="platform-card platform-error">{error}</div>;
  }
  if (!data) return <PlatformLoading />;

  const step = statusStepIndex(data.status);
  const location = [data.city, data.state].filter(Boolean).join(', ');

  return (
    <>
      <PlatformPageHeader
        title={data.title}
        subtitle={`${SERVICE_REQUEST_CATEGORY_LABELS[data.category]}${location ? ` · ${location}` : ''}`}
        breadcrumbs={[{ label: 'Services', href: '/services' }, { label: 'Track request' }]}
        badge={
          <StatusBadge
            status={data.status}
            label={SERVICE_REQUEST_STATUS_LABELS[data.status]}
          />
        }
      />
      {error && <div className="platform-card platform-error">{error}</div>}

      <div className="platform-card">
        {data.status === 'CANCELLED' ? (
          <p className="platform-text-muted">This request was cancelled.</p>
        ) : (
          <ol className="platform-list" aria-label="Progress" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
            {SERVICE_REQUEST_STEPS.map((s, i) => (
              <li
                key={s}
                style={{ fontWeight: i <= step ? 700 : 400, opacity: i <= step ? 1 : 0.5 }}
              >
                {i < step ? '✓ ' : i === step ? '● ' : '○ '}
                {SERVICE_REQUEST_STATUS_LABELS[s]}
              </li>
            ))}
          </ol>
        )}
        {data.provider && (
          <p>
            Provider: <strong>{data.provider}</strong> — they will contact you directly.
          </p>
        )}
        <p style={{ whiteSpace: 'pre-wrap' }}>{data.description}</p>
      </div>

      <div className="platform-card">
        <h2>Timeline</h2>
        <ul className="platform-list">
          {data.updates.map((u) => (
            <li key={u.id}>
              <strong>{new Date(u.createdAt).toLocaleString('en-IN')}</strong>
              {u.status ? ` — ${SERVICE_REQUEST_STATUS_LABELS[u.status]}` : ''}
              {u.note ? `: ${u.note}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {canRequesterCancel(data.status) && (
        <div className="platform-form-actions">
          <button type="button" className="platform-btn platform-btn-secondary" onClick={cancel}>
            Cancel request
          </button>
        </div>
      )}
    </>
  );
}
