'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPartnerServicesHub, type PartnerServicesHub } from '@/lib/api/partner-hub';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, SERVICE_VERTICALS, formatPrice } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

export default function PartnerServicesPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <ServicesInner />
    </RequireAuth>
  );
}

function ServicesInner() {
  const [hub, setHub] = useState<PartnerServicesHub | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPartnerServicesHub()
      .then(setHub)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load services'),
      );
  }, []);

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Services"
          subtitle="Manage the services you offer buyers — compliance, repair, training, finance, and more — and see how they perform."
          actions={
            <Link
              href="/partner/catalog/new?type=SERVICE"
              className="platform-btn platform-btn-cta"
            >
              Add a service
            </Link>
          }
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!hub && !error && <PlatformLoading />}

          {hub && (
            <>
              <div className="mod-kpi-grid">
                <Kpi value={hub.total} label="Service listings" />
                <Kpi value={hub.live} label="Live on marketplace" />
                <Kpi value={hub.summary.PENDING_REVIEW} label="Pending review" />
                <Kpi value={hub.serviceLeads.new} label={`New service leads (${hub.serviceLeads.total} total)`} />
              </div>

              <section className="platform-card" aria-labelledby="coverage-heading">
                <h2 id="coverage-heading">Vertical coverage</h2>
                <p className="platform-muted platform-text-sm">
                  GarudHub service verticals buyers browse at{' '}
                  <Link href="/services">/services</Link>. Covered means you have a service
                  listing in a matching category.
                </p>
                <ul className="platform-partner-ops-grid">
                  {SERVICE_VERTICALS.map((v) => {
                    const covered = v.categories.some((c) => hub.categories.includes(c));
                    return (
                      <li key={v.key}>
                        <Link
                          href={
                            covered
                              ? '/partner/catalog'
                              : `/partner/catalog/new?type=SERVICE`
                          }
                          className="platform-partner-ops-stat"
                        >
                          <strong>{covered ? '✓' : '+'}</strong>
                          <span>
                            {v.label}
                            <br />
                            {covered ? 'Covered' : 'Add listing'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {hub.items.length === 0 ? (
                <EmptyState
                  title="No services listed yet"
                  description="Publish a service listing (repair, training, compliance, consultancy…) so buyers can find and contact you."
                  primaryAction={{ label: 'Add a service', href: '/partner/catalog/new?type=SERVICE' }}
                  icon="🛠️"
                />
              ) : (
                <div className="platform-card">
                  <div className="platform-table-wrap">
                    <table className="platform-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Views (30d)</th>
                          <th>Leads</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {hub.items.map((s) => (
                          <tr key={s.id}>
                            <td>
                              {s.name}
                              {s.rejectionReason && (
                                <div className="platform-error platform-text-sm">
                                  {s.rejectionReason}
                                </div>
                              )}
                            </td>
                            <td>{CATEGORY_LABELS[s.category]}</td>
                            <td>{formatPrice(s.priceOnRequest, s.priceInr)}</td>
                            <td>
                              <StatusBadge status={s.reviewStatus} />
                              {s.isPublished && <span className="platform-muted"> · live</span>}
                            </td>
                            <td>{s.views30d}</td>
                            <td>{s.leadCount}</td>
                            <td>
                              <Link
                                href={`/partner/catalog/${s.id}`}
                                className="platform-btn platform-btn-secondary platform-btn-sm"
                              >
                                Edit
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hub.recentLeads.length > 0 && (
                <section className="platform-card" aria-labelledby="svc-leads-heading">
                  <h2 id="svc-leads-heading">Recent service leads</h2>
                  <ul className="platform-list">
                    {hub.recentLeads.map((l) => (
                      <li key={l.id}>
                        <strong>{l.enquiry.subject}</strong> — {l.enquiry.name}{' '}
                        <StatusBadge status={l.status} />{' '}
                        <span className="platform-muted">
                          {new Date(l.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/partner/leads?intent=SERVICE" className="platform-link-btn">
                    Open leads pipeline →
                  </Link>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <div className="mod-kpi-card" style={{ cursor: 'default' }}>
      <div className="mod-kpi-data">
        <div className="mod-kpi-num">{value}</div>
        <div className="mod-kpi-label">{label}</div>
      </div>
    </div>
  );
}
