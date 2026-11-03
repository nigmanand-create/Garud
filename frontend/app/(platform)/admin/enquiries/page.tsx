'use client';

import { Fragment, useEffect, useState } from 'react';
import { listAdminEnquiries, updateEnquiryStatus } from '@/lib/api/enquiries';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import type { AdminEnquiriesResponse, EnquiryStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function AdminEnquiriesPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <EnquiriesInner />
    </RequireAuth>
  );
}

function EnquiriesInner() {
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | ''>('NEW');
  const [data, setData] = useState<AdminEnquiriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listAdminEnquiries({
      status: statusFilter || undefined,
      take: 50,
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load enquiries');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function markRead(id: string) {
    try {
      await updateEnquiryStatus(id, 'READ');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  const counts = data?.statusCounts ?? { NEW: 0, READ: 0 };

  return (
    <>
      <PlatformPageHeader
        title="Enquiry queue"
        subtitle="Review inbound leads from services, marketplace, and the native contact form."
      />
      <AdminSubnav />

      <div className="mod-kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{counts.NEW}</div>
            <div className="mod-kpi-label">New</div>
          </div>
        </div>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{counts.READ}</div>
            <div className="mod-kpi-label">Read</div>
          </div>
        </div>
      </div>

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="enquiry-status-filter">Status</label>
          <select
            id="enquiry-status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value || '') as EnquiryStatus | '')
            }
          >
            <option value="">All</option>
            <option value="NEW">New</option>
            <option value="READ">Read</option>
          </select>
        </div>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}
      {loading && <div className="platform-card">Loading enquiries…</div>}

      {!loading && data && (
        <div className="platform-card">
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Contact</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5}>No enquiries in this filter.</td>
                  </tr>
                )}
                {data.items.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td>{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                      <td>
                        <div>{row.name}</div>
                        <div className="platform-text-muted">{row.email}</div>
                        {row.phone && (
                          <div className="platform-text-muted">{row.phone}</div>
                        )}
                      </td>
                      <td>{row.subject}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="platform-btn platform-btn-secondary platform-btn-sm"
                          onClick={() =>
                            setExpandedId(expandedId === row.id ? null : row.id)
                          }
                        >
                          {expandedId === row.id ? 'Hide' : 'View'}
                        </button>
                        {row.status === 'NEW' && (
                          <button
                            type="button"
                            className="platform-btn platform-btn-sm"
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => markRead(row.id)}
                          >
                            Mark read
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={5}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>
                          {row.sourcePage && (
                            <p className="platform-text-muted">
                              Source: {row.sourcePage}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
