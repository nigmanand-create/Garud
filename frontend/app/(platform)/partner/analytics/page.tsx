'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  buildPartnerAnalyticsExportPath,
  getPartnerAnalytics,
  type PartnerAnalytics,
} from '@/lib/api/partner-hub';
import { apiDownload } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { LEAD_STATUS_LABELS } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

const RANGES = [7, 30, 90] as const;

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function PartnerAnalyticsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <AnalyticsInner />
    </RequireAuth>
  );
}

function AnalyticsInner() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<PartnerAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getPartnerAnalytics(days)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load analytics'),
      );
  }, [days]);

  const maxViews = data ? Math.max(1, ...data.views.byDay.map((d) => d.count)) : 1;

  async function exportCsv() {
    try {
      await apiDownload(
        buildPartnerAnalyticsExportPath(days),
        `garudhub-partner-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Export failed');
    }
  }

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Analytics"
          subtitle="Marketplace visibility and sales funnel for your organization."
          actions={
            <div role="group" aria-label="Date range" className="platform-form-actions">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`platform-btn platform-btn-sm ${days === r ? 'platform-btn-cta' : 'platform-btn-secondary'}`}
                  aria-pressed={days === r}
                  onClick={() => setDays(r)}
                >
                  {r}d
                </button>
              ))}
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                onClick={() => void exportCsv()}
                disabled={!data}
              >
                Export CSV
              </button>
            </div>
          }
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!data && !error && <PlatformLoading />}

          {data && (
            <>
              <div className="mod-kpi-grid">
                <Kpi value={data.views.total} label="Listing views" />
                <Kpi value={data.enquiries.total} label="Enquiries received" />
                <Kpi value={data.leads.newInPeriod} label="New leads" />
                <Kpi value={data.orders.count} label={`Orders · ${inr(data.orders.gmvInr)}`} />
              </div>

              <section className="platform-card" aria-labelledby="views-heading">
                <h2 id="views-heading">Listing views (last {data.periodDays} days)</h2>
                {data.views.total === 0 ? (
                  <p className="platform-muted">
                    No views yet. Views are counted when buyers open your public listing pages.
                  </p>
                ) : (
                  <div
                    className="platform-bar-chart"
                    role="img"
                    aria-label={`Daily listing views, ${data.views.total} in total`}
                  >
                    {data.views.byDay.map((d) => (
                      <div
                        key={d.date}
                        className="platform-bar-chart-bar"
                        title={`${d.date}: ${d.count}`}
                        style={{ height: `${Math.max(2, (d.count / maxViews) * 100)}%` }}
                      />
                    ))}
                  </div>
                )}
                {data.views.topListings.length > 0 && (
                  <>
                    <h3>Top listings</h3>
                    <ol className="platform-list">
                      {data.views.topListings.map((l) => (
                        <li key={l.listingId}>
                          <Link href={`/partner/catalog/${l.listingId}`}>{l.name}</Link> —{' '}
                          {l.views} views
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </section>

              <div className="platform-form-field-pair">
                <section className="platform-card" aria-labelledby="funnel-heading">
                  <h2 id="funnel-heading">Lead funnel (all time)</h2>
                  <ul className="platform-list">
                    {(Object.keys(LEAD_STATUS_LABELS) as (keyof typeof LEAD_STATUS_LABELS)[]).map(
                      (s) => (
                        <li key={s}>
                          {LEAD_STATUS_LABELS[s]}: <strong>{data.leads.byStatus[s]}</strong>
                        </li>
                      ),
                    )}
                  </ul>
                  <p className="platform-muted platform-text-sm">
                    Win rate (won ÷ closed): {pct(data.leads.winRate)}
                  </p>
                  <Link href="/partner/leads" className="platform-link-btn">
                    Open leads →
                  </Link>
                </section>

                <section className="platform-card" aria-labelledby="rfq-heading">
                  <h2 id="rfq-heading">RFQ performance</h2>
                  <ul className="platform-list">
                    <li>
                      Invites received: <strong>{data.rfq.invitesTotal}</strong>
                    </li>
                    <li>
                      Quoted: <strong>{data.rfq.invites.QUOTED}</strong> · Declined:{' '}
                      <strong>{data.rfq.invites.DECLINED}</strong> · Awaiting:{' '}
                      <strong>{data.rfq.invites.INVITED}</strong>
                    </li>
                    <li>
                      Quotations accepted: <strong>{data.rfq.quotations.ACCEPTED}</strong> · rejected:{' '}
                      <strong>{data.rfq.quotations.REJECTED}</strong>
                    </li>
                  </ul>
                  <p className="platform-muted platform-text-sm">
                    Response rate: {pct(data.rfq.responseRate)} · Acceptance rate:{' '}
                    {pct(data.rfq.acceptanceRate)}
                  </p>
                  <Link href="/partner/rfqs" className="platform-link-btn">
                    Open RFQ inbox →
                  </Link>
                </section>
              </div>
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
