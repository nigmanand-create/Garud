'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createPartnershipRequest,
  listPartnerPartnerships,
  withdrawPartnershipRequest,
  type PartnerPartnershipsResponse,
  type PartnershipRequestType,
} from '@/lib/api/partnerships';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  PARTNERSHIP_STATUS_LABELS,
  PARTNERSHIP_TYPE_LABELS,
} from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

const TYPES = Object.keys(PARTNERSHIP_TYPE_LABELS) as PartnershipRequestType[];

export default function PartnerPartnershipsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <PartnershipsInner />
    </RequireAuth>
  );
}

function PartnershipsInner() {
  const [data, setData] = useState<PartnerPartnershipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<PartnershipRequestType>('DISTRIBUTORSHIP');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [regions, setRegions] = useState('');
  const [targetId, setTargetId] = useState('');

  const load = useCallback(() => {
    listPartnerPartnerships()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load partnerships'),
      );
  }, []);

  useEffect(() => {
    load();
    const target = new URLSearchParams(window.location.search).get('target');
    if (target) setTargetId(target);
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await createPartnershipRequest({
        type,
        title,
        message,
        regions: regions || undefined,
        targetOrganizationId: targetId.trim() || undefined,
      });
      setTitle('');
      setMessage('');
      setRegions('');
      setTargetId('');
      setNotice('Request submitted. The GarudHub team will review it shortly.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  }

  async function withdraw(id: string) {
    try {
      await withdrawPartnershipRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not withdraw');
    }
  }

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Partnerships"
          subtitle="Request distributor, dealer, OEM or technology partnerships. GarudHub reviews each request and records the outcome here."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error" role="alert">{error}</div>}
          {notice && <div className="platform-card platform-success" role="status">{notice}</div>}

          <form className="platform-card platform-form" onSubmit={onSubmit}>
            <h2>New partnership request</h2>
            <div className="platform-form-field-pair">
              <div>
                <label htmlFor="pr-type">Partnership type</label>
                <select
                  id="pr-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as PartnershipRequestType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PARTNERSHIP_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pr-regions">Regions (optional)</label>
                <input
                  id="pr-regions"
                  value={regions}
                  maxLength={500}
                  onChange={(e) => setRegions(e.target.value)}
                  placeholder="e.g. Karnataka, Tamil Nadu"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pr-title">Title</label>
              <input
                id="pr-title"
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pr-target">Target partner ID (optional)</label>
              <input
                id="pr-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Organization ID from a marketplace vendor profile"
              />
            </div>
            <div>
              <label htmlFor="pr-message">Details</label>
              <textarea
                id="pr-message"
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="platform-form-actions">
              <button type="submit" className="platform-btn platform-btn-cta" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>

          {data === null && !error && <PlatformLoading />}

          {data && data.items.length === 0 && (
            <EmptyState
              title="No partnership requests yet"
              description="Use the form above to start a distributor, dealer or OEM partnership conversation."
              icon="🤝"
            />
          )}

          {data && data.items.length > 0 && (
            <div className="platform-card">
              <h2>Your requests</h2>
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Type</th>
                      <th>Request</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>{PARTNERSHIP_TYPE_LABELS[r.type]}</td>
                        <td>
                          <strong>{r.title}</strong>
                          {r.targetOrganization && (
                            <div className="platform-text-muted">
                              With {r.targetOrganization.companyName}
                            </div>
                          )}
                          {r.adminNote && (
                            <div className="platform-text-muted">
                              GarudHub: {r.adminNote}
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            status={r.status}
                            label={PARTNERSHIP_STATUS_LABELS[r.status]}
                          />
                        </td>
                        <td>
                          {(r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW') && (
                            <button
                              type="button"
                              className="platform-btn platform-btn-secondary platform-btn-sm"
                              onClick={() => withdraw(r.id)}
                            >
                              Withdraw
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data && data.incomingApproved.length > 0 && (
            <div className="platform-card">
              <h2>Partners who requested you</h2>
              <ul className="platform-list">
                {data.incomingApproved.map((i) => (
                  <li key={i.id}>
                    <strong>{i.organization.companyName}</strong> —{' '}
                    {PARTNERSHIP_TYPE_LABELS[i.type]}: {i.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
