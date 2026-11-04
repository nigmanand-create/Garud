'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  acceptServiceRequest,
  declineServiceRequest,
  getServiceCoverage,
  listPartnerServiceRequests,
  saveServiceCoverage,
  updatePartnerServiceRequest,
  type PartnerServiceRequestItem,
  type PartnerServiceRequestsResponse,
  type PartnerServiceTab,
} from '@/lib/api/service-requests';
import { ApiError } from '@/lib/api/types';
import {
  INDIAN_STATES,
  SERVICE_REQUEST_CATEGORY_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_VERTICAL_CONFIGS,
  type ServiceRequestCategory,
} from '@/lib/platform/verticals';

const TABS: { key: PartnerServiceTab; label: string }[] = [
  { key: 'OFFERED', label: 'New matches' },
  { key: 'ACTIVE', label: 'In progress' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function PartnerServiceRequestsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <Inner />
    </RequireAuth>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Inner() {
  const [tab, setTab] = useState<PartnerServiceTab>('OFFERED');
  const [data, setData] = useState<PartnerServiceRequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<ServiceRequestCategory[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [savingCoverage, setSavingCoverage] = useState(false);

  const load = useCallback(() => {
    listPartnerServiceRequests(tab)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load service requests'),
      );
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getServiceCoverage()
      .then((c) => {
        setCategories(c.categories);
        setStates(c.states);
      })
      .catch(() => undefined);
  }, []);

  async function act(fn: () => Promise<unknown>, success: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed');
    }
  }

  async function saveCoverage(e: FormEvent) {
    e.preventDefault();
    setSavingCoverage(true);
    setError(null);
    try {
      await saveServiceCoverage({ categories, states });
      setNotice('Coverage saved. New requests will be matched using these settings.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save coverage');
    } finally {
      setSavingCoverage(false);
    }
  }

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Service requests"
          subtitle="Customer requirements matched to your service coverage. Accept to connect with the requester, then track the job to completion."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && (
            <div className="platform-card platform-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="platform-card platform-success" role="status">
              {notice}
            </div>
          )}

          <form className="platform-card platform-form" onSubmit={saveCoverage}>
            <h2>Matching coverage</h2>
            <p className="platform-form-section-desc">
              Requests are matched by service and state. Leave states empty to take requests from
              anywhere in India. Providers with an approved service listing in Repair or Consultancy
              are also matched for those verticals.
            </p>
            <fieldset>
              <legend>Services you provide</legend>
              {SERVICE_VERTICAL_CONFIGS.map((v) => (
                <label key={v.category} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={categories.includes(v.category)}
                    onChange={() => setCategories((c) => toggle(c, v.category))}
                  />{' '}
                  {v.label}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="cov-states">States served (hold Ctrl/Cmd to select several)</label>
              <select
                id="cov-states"
                multiple
                size={8}
                value={states}
                onChange={(e) => setStates(Array.from(e.target.selectedOptions, (o) => o.value))}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="platform-form-actions">
              <button type="submit" className="platform-btn platform-btn-cta" disabled={savingCoverage}>
                {savingCoverage ? 'Saving…' : 'Save coverage'}
              </button>
            </div>
          </form>

          <div className="platform-section-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`platform-section-tab${tab === t.key ? ' platform-section-tab--active' : ''}`}
                onClick={() => {
                  setData(null);
                  setTab(t.key);
                }}
              >
                {t.label}
                {data
                  ? ` (${t.key === 'OFFERED' ? data.counts.offered : t.key === 'ACTIVE' ? data.counts.active : data.counts.closed})`
                  : ''}
              </button>
            ))}
          </div>

          {!data && !error && <PlatformLoading />}
          {data && data.items.length === 0 && (
            <EmptyState
              title={tab === 'OFFERED' ? 'No new matches' : 'Nothing here yet'}
              description="Set your service coverage above — matched customer requests appear here."
            />
          )}
          {data?.items.map((item) => (
            <RequestCard
              key={item.matchId}
              item={item}
              note={notes[item.request.id] ?? ''}
              onNote={(v) => setNotes((n) => ({ ...n, [item.request.id]: v }))}
              onAccept={() =>
                act(
                  () => acceptServiceRequest(item.request.id),
                  'Accepted — requester contact details are now visible.',
                )
              }
              onDecline={() => act(() => declineServiceRequest(item.request.id), 'Declined.')}
              onAddNote={() =>
                act(
                  () => updatePartnerServiceRequest(item.request.id, { note: notes[item.request.id] }),
                  'Note added.',
                ).then(() => setNotes((n) => ({ ...n, [item.request.id]: '' })))
              }
              onComplete={() =>
                act(
                  () =>
                    updatePartnerServiceRequest(item.request.id, {
                      status: 'COMPLETED',
                      note: notes[item.request.id] || undefined,
                    }),
                  'Job marked completed.',
                )
              }
            />
          ))}
        </div>
      </div>
    </PartnerPageShell>
  );
}

function RequestCard({
  item,
  note,
  onNote,
  onAccept,
  onDecline,
  onAddNote,
  onComplete,
}: {
  item: PartnerServiceRequestItem;
  note: string;
  onNote: (v: string) => void;
  onAccept: () => void;
  onDecline: () => void;
  onAddNote: () => void;
  onComplete: () => void;
}) {
  const r = item.request;
  const connected = item.matchStatus === 'ACCEPTED';
  const active = connected && r.status === 'IN_PROGRESS';
  return (
    <article className="platform-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>{r.title}</h3>
          <p className="platform-text-muted">
            {SERVICE_REQUEST_CATEGORY_LABELS[r.category]}
            {r.city || r.state ? ` · ${[r.city, r.state].filter(Boolean).join(', ')}` : ''} ·{' '}
            {new Date(r.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        <StatusBadge
          status={item.matchStatus === 'OFFERED' || connected ? r.status : item.matchStatus}
          label={
            item.matchStatus === 'OFFERED' || connected
              ? SERVICE_REQUEST_STATUS_LABELS[r.status]
              : item.matchStatus === 'DECLINED'
                ? 'Declined'
                : 'Taken by another provider'
          }
        />
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>
      {r.details && Object.keys(r.details).length > 0 && (
        <ul className="platform-list">
          {Object.entries(r.details).map(([k, v]) => (
            <li key={k}>
              <strong>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</strong> {String(v)}
            </li>
          ))}
        </ul>
      )}
      {connected && (
        <p>
          <strong>{r.requesterName}</strong> ·{' '}
          <a href={`mailto:${r.requesterEmail}`}>{r.requesterEmail}</a>
          {r.requesterPhone ? ` · ${r.requesterPhone}` : ''}
        </p>
      )}
      {connected && r.updates.length > 0 && (
        <ul className="platform-list">
          {r.updates.map((u) => (
            <li key={u.id}>
              {new Date(u.createdAt).toLocaleString('en-IN')} — {u.actor.toLowerCase()}
              {u.note ? `: ${u.note}` : ''}
            </li>
          ))}
        </ul>
      )}

      {item.matchStatus === 'OFFERED' && r.status === 'MATCHED' && (
        <div className="platform-form-actions">
          <button type="button" className="platform-btn platform-btn-cta platform-btn-sm" onClick={onAccept}>
            Accept &amp; connect
          </button>
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            onClick={onDecline}
          >
            Decline
          </button>
        </div>
      )}
      {active && (
        <div className="platform-form">
          <label htmlFor={`note-${r.id}`}>Progress note (visible to the requester)</label>
          <textarea
            id={`note-${r.id}`}
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(e) => onNote(e.target.value)}
          />
          <div className="platform-form-actions">
            <button
              type="button"
              className="platform-btn platform-btn-secondary platform-btn-sm"
              disabled={!note.trim()}
              onClick={onAddNote}
            >
              Add note
            </button>
            <button type="button" className="platform-btn platform-btn-cta platform-btn-sm" onClick={onComplete}>
              Mark completed
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
