'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAdminOverview, type AdminOverview } from '@/lib/api/admin';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  AUDIT_KIND_LABELS,
  auditActorLabel,
  auditSubjectHref,
  buildOpsCards,
} from '@/lib/platform/admin-ops';
import { formatEnumLabel } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

export default function AdminOpsHomePage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <OpsHomeInner />
    </RequireAuth>
  );
}

const QUICK_LINKS = [
  { href: '/admin/applications', label: 'Review KYC queue' },
  { href: '/admin/enquiries', label: 'Triage new enquiries' },
  { href: '/admin/partnerships', label: 'Partnership requests' },
  { href: '/admin/listings', label: 'Moderate listings' },
  { href: '/admin/analytics', label: 'GMV & RFQ analytics' },
  { href: '/admin/billing', label: 'Partner plans & billing' },
  { href: '/admin/users', label: 'Manage admins & roles' },
  { href: '/admin/audit-log', label: 'Open audit log' },
];

function OpsHomeInner() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load overview'),
      );
  }, []);

  const cards = data ? buildOpsCards(data.queues) : [];

  return (
    <div className="platform-admin-ops-home">
      <PlatformPageHeader
        title="Operations dashboard"
        subtitle="Queue triage, commerce oversight, and recent audit activity — start with highlighted tiles when counts are non-zero."
        badge={
          data && data.attentionTotal > 0 ? (
            <span className="platform-status-badge platform-status-badge--pending">
              {data.attentionTotal} need attention
            </span>
          ) : undefined
        }
      />

      {error && <div className="platform-card platform-error">{error}</div>}
      {!data && !error && <PlatformLoading />}

      {data && (
        <div className="platform-admin-ops-dashboard">
          <section
            className="platform-card platform-admin-ops-section"
            aria-labelledby="ops-queues"
          >
            <div className="platform-admin-ops-section-head">
              <h2 id="ops-queues" className="platform-admin-ops-section-title">
                Queues
              </h2>
              <p className="platform-muted platform-text-sm platform-admin-ops-section-desc">
                Enquiry → lead → partnership → listing: work through the highlighted tiles first.
              </p>
            </div>
            <ul className="platform-admin-ops-grid">
              {cards.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.href}
                    className={`platform-partner-ops-stat${c.alert ? ' platform-partner-ops-stat--alert' : ''}`}
                  >
                    <strong>{c.value}</strong>
                    <span>{c.label}</span>
                    {c.hint && <span className="platform-text-sm platform-muted">{c.hint}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="platform-card platform-admin-ops-section"
            aria-labelledby="ops-quick"
          >
            <div className="platform-admin-ops-section-head">
              <h2 id="ops-quick" className="platform-admin-ops-section-title">
                Quick links
              </h2>
              <p className="platform-muted platform-text-sm platform-admin-ops-section-desc">
                {data.queues.admins.active} active platform admin
                {data.queues.admins.active === 1 ? '' : 's'}.
              </p>
            </div>
            <ul className="platform-admin-quick-links">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="platform-admin-quick-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="platform-card platform-admin-ops-section platform-card--flush"
            aria-labelledby="ops-recent"
          >
            <div className="platform-admin-ops-section-head platform-admin-ops-section-head--bar">
              <div className="platform-page-header-row">
                <h2 id="ops-recent" className="platform-admin-ops-section-title">
                  Recent activity
                </h2>
                <Link href="/admin/audit-log" className="platform-text-sm">
                  View full audit log →
                </Link>
              </div>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="platform-muted platform-admin-ops-empty">No audit events yet.</p>
            ) : (
              <div className="platform-table-wrap">
                <table className="platform-table mod-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Outcome</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.createdAt).toLocaleString('en-IN')}</td>
                        <td>{AUDIT_KIND_LABELS[e.kind]}</td>
                        <td>
                          <Link href={auditSubjectHref(e)}>{e.subject.label}</Link>
                        </td>
                        <td>
                          {e.toStatus ? (
                            <StatusBadge status={e.toStatus} label={formatEnumLabel(e.toStatus)} />
                          ) : (
                            formatEnumLabel(e.action)
                          )}
                        </td>
                        <td>{auditActorLabel(e.actor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
