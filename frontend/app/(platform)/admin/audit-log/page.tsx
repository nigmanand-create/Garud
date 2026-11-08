'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiDownload } from '@/lib/api/client';
import { listAuditLog, type AuditLogResponse } from '@/lib/api/admin';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  AUDIT_KINDS,
  AUDIT_KIND_LABELS,
  AUDIT_PAGE_SIZE,
  auditActorLabel,
  auditPageCount,
  auditSubjectHref,
  buildAuditExportPath,
  type AuditKind,
} from '@/lib/platform/admin-ops';
import { formatEnumLabel } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

export default function AdminAuditLogPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <AuditLogInner />
    </RequireAuth>
  );
}

function AuditLogInner() {
  const [kind, setKind] = useState<AuditKind | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAuditLog({
      kinds: kind ? [kind] : undefined,
      search,
      from: from || undefined,
      to: to || undefined,
      page,
    })
      .then((res) => setData(res))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load audit log'),
      )
      .finally(() => setLoading(false));
  }, [kind, search, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? auditPageCount(data.total) : 1;
  const allCount = data
    ? AUDIT_KINDS.reduce((sum, k) => sum + data.kindCounts[k], 0)
    : 0;

  async function exportCsv() {
    setExporting(true);
    try {
      await apiDownload(
        buildAuditExportPath({
          kinds: kind ? [kind] : undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
        `garudhub-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title="Audit log"
        subtitle="Every admin decision in one place: KYC, listing moderation, partnership decisions, enquiry routing and user/role changes."
      />

      <form
        className="platform-card platform-admin-ops-section platform-form platform-filter-bar platform-admin-list-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSearch(searchInput);
        }}
      >
        <div className="platform-admin-list-filter-field">
          <label htmlFor="audit-kind">Type</label>
          <select
            id="audit-kind"
            className="mod-filter-select"
            value={kind}
            onChange={(e) => {
              setKind((e.target.value || '') as AuditKind | '');
              setPage(0);
            }}
          >
            <option value="">All types{data ? ` (${allCount})` : ''}</option>
            {AUDIT_KINDS.map((k) => (
              <option key={k} value={k}>
                {AUDIT_KIND_LABELS[k]}
                {data ? ` (${data.kindCounts[k]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--grow">
          <label htmlFor="audit-search">Search</label>
          <input
            id="audit-search"
            type="search"
            className="mod-filter-input"
            placeholder="Company, listing, note, email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="platform-admin-list-filter-field">
          <label htmlFor="audit-from">From</label>
          <input
            id="audit-from"
            type="date"
            className="mod-filter-input mod-filter-input--date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="platform-admin-list-filter-field">
          <label htmlFor="audit-to">To</label>
          <input
            id="audit-to"
            type="date"
            className="mod-filter-input mod-filter-input--date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--action">
          <label className="platform-admin-list-filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <button type="submit" className="platform-btn platform-btn-sm">
            Apply
          </button>
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--action">
          <label className="platform-admin-list-filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            disabled={exporting}
            onClick={exportCsv}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </form>

      {error && <div className="platform-card platform-error">{error}</div>}

      <div
        className="platform-card platform-admin-ops-section platform-card--flush"
        aria-busy={loading}
      >
        {loading && !data ? (
          <PlatformLoading />
        ) : data ? (
          <>
          <div className="platform-table-wrap">
            <table className="platform-table mod-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Change</th>
                  <th>Note</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6}>No audit events match these filters.</td>
                  </tr>
                )}
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleString('en-IN')}</td>
                    <td>{AUDIT_KIND_LABELS[e.kind]}</td>
                    <td>
                      <Link href={auditSubjectHref(e)}>{e.subject.label}</Link>
                    </td>
                    <td>
                      <div className="platform-admin-audit-change">
                        {e.fromStatus && (
                          <>
                            <StatusBadge status={e.fromStatus} />
                            <span className="platform-admin-audit-change-arrow" aria-hidden="true">
                              →
                            </span>
                          </>
                        )}
                        {e.toStatus ? (
                          <StatusBadge status={e.toStatus} />
                        ) : (
                          <span className="platform-admin-audit-change-action">
                            {formatEnumLabel(e.action)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{e.note ?? '—'}</td>
                    <td>{auditActorLabel(e.actor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="platform-admin-list-pagination">
            <span className="platform-text-sm platform-muted">
              {data.total} event{data.total === 1 ? '' : 's'} · page {page + 1} of {pages} ·{' '}
              {AUDIT_PAGE_SIZE} per page
            </span>
            <span className="platform-admin-list-pagination-actions">
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
              >
                Previous
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                disabled={page + 1 >= pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </span>
          </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
