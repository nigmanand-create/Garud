'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  createGovOpportunity,
  deleteGovOpportunity,
  listAdminGovOpportunities,
  updateGovOpportunity,
  type AdminGovResponse,
} from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import {
  closingLabel,
  formatInrCompact,
  GOV_STATUS_LABELS,
  GOV_TYPE_LABELS,
  INDIAN_STATES,
  type GovOpportunityStatus,
  type GovOpportunityType,
} from '@/lib/platform/verticals';

export default function AdminGovOpportunitiesPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [filter, setFilter] = useState<GovOpportunityStatus | ''>('');
  const [data, setData] = useState<AdminGovResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [type, setType] = useState<GovOpportunityType>('TENDER');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [state, setState] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [value, setValue] = useState('');
  const [closing, setClosing] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [description, setDescription] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    listAdminGovOpportunities(filter || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load opportunities'));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createGovOpportunity({
        type,
        title: title.trim(),
        summary: summary.trim(),
        issuingBody: issuingBody.trim(),
        referenceNo: referenceNo.trim() || undefined,
        state: state || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        estimatedValueInr: value ? Number(value) : undefined,
        closingDate: closing || undefined,
        eligibility: eligibility.trim() || undefined,
        description: description.trim() || undefined,
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
      });
      setNotice(publishNow ? 'Published to /government.' : 'Saved as draft.');
      setTitle('');
      setSummary('');
      setReferenceNo('');
      setSourceUrl('');
      setValue('');
      setClosing('');
      setEligibility('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title="Tenders & schemes"
        subtitle="Curate government tenders, schemes and subsidies shown on /government. Visitor interest arrives in the enquiry queue as Tender / scheme leads."
      />

      {error && <div className="platform-card platform-error">{error}</div>}
      {notice && <div className="platform-card platform-success">{notice}</div>}

      {data && (
        <div className="mod-kpi-grid">
          {(['DRAFT', 'PUBLISHED', 'CLOSED'] as GovOpportunityStatus[]).map((s) => (
            <div
              key={s}
              className={`mod-kpi-card${filter === s ? ' mod-kpi-card--active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setFilter(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setFilter(s);
              }}
            >
              <div className="mod-kpi-data">
                <div className="mod-kpi-num">{data.statusCounts[s] ?? 0}</div>
                <div className="mod-kpi-label">{GOV_STATUS_LABELS[s]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="platform-card platform-admin-ops-section platform-form" aria-labelledby="go-new-heading">
        <div className="platform-admin-ops-section-head">
          <h2 id="go-new-heading" className="platform-admin-ops-section-title">
            New opportunity
          </h2>
        </div>
        <form onSubmit={create}>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="go-type">Type</label>
              <select id="go-type" value={type} onChange={(e) => setType(e.target.value as GovOpportunityType)}>
                {(Object.keys(GOV_TYPE_LABELS) as GovOpportunityType[]).map((t) => (
                  <option key={t} value={t}>
                    {GOV_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="go-state">State (blank = national)</label>
              <select id="go-state" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">National</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="go-title">Title</label>
            <input id="go-title" required minLength={3} maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="go-summary">Summary</label>
            <textarea id="go-summary" required minLength={10} maxLength={1000} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="go-body">Issuing body</label>
              <input id="go-body" required maxLength={300} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
            </div>
            <div>
              <label htmlFor="go-ref">Reference no.</label>
              <input id="go-ref" maxLength={100} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>
          </div>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="go-value">Estimated value (INR)</label>
              <input id="go-value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <label htmlFor="go-close">Closing date</label>
              <input id="go-close" type="date" value={closing} onChange={(e) => setClosing(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="go-url">Official source URL</label>
            <input id="go-url" type="url" placeholder="https://" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </div>
          <div>
            <label htmlFor="go-elig">Eligibility</label>
            <input id="go-elig" maxLength={3000} value={eligibility} onChange={(e) => setEligibility(e.target.value)} />
          </div>
          <div>
            <label htmlFor="go-desc">Details</label>
            <textarea id="go-desc" rows={4} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label>
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} /> Publish immediately
          </label>
          <div className="platform-form-actions">
            <button type="submit" className="platform-btn platform-btn-cta platform-btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save opportunity'}
            </button>
          </div>
        </form>
      </section>

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="go-filter">Status</label>
          <select
            id="go-filter"
            className="mod-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as GovOpportunityStatus | '')}
          >
              <option value="">All</option>
              {(Object.keys(GOV_STATUS_LABELS) as GovOpportunityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {GOV_STATUS_LABELS[s]}
                  {data ? ` (${data.statusCounts[s]})` : ''}
                </option>
              ))}
            </select>
        </div>
      </div>

      <div className="platform-card platform-card--flush">
        {!data && !error ? (
          <PlatformLoading />
        ) : data && data.items.length === 0 ? (
          <p className="platform-muted platform-admin-ops-empty">Nothing here yet.</p>
        ) : data ? (
          <div className="platform-table-wrap">
            <table className="platform-table mod-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Value</th>
                  <th>Closing</th>
                  <th>Status</th>
                  <th className="platform-table-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.title}
                      <div className="platform-text-muted">
                        {GOV_TYPE_LABELS[o.type]} · {o.issuingBody}
                        {o.referenceNo ? ` · ${o.referenceNo}` : ''}
                      </div>
                    </td>
                    <td>{formatInrCompact(o.estimatedValueInr)}</td>
                    <td>{closingLabel(o.closingDate)}</td>
                    <td>
                      <StatusBadge status={o.status} label={GOV_STATUS_LABELS[o.status]} />
                    </td>
                    <td className="platform-table-actions-row">
                      <Link
                        href={`/admin/gov-opportunities/${o.id}`}
                        className="platform-btn platform-btn-secondary platform-btn-sm"
                      >
                        View
                      </Link>
                      {o.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          className="platform-btn platform-btn-cta platform-btn-sm"
                          onClick={() => run(() => updateGovOpportunity(o.id, { status: 'PUBLISHED' }))}
                        >
                          Publish
                        </button>
                      )}
                      {o.status === 'PUBLISHED' && (
                        <button
                          type="button"
                          className="platform-btn platform-btn-secondary platform-btn-sm"
                          onClick={() => run(() => updateGovOpportunity(o.id, { status: 'CLOSED' }))}
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary platform-btn-sm"
                        onClick={() => {
                          if (window.confirm('Delete this opportunity?')) {
                            void run(() => deleteGovOpportunity(o.id));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
