'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCommerceAnalytics, type CommerceAnalytics } from '@/lib/api/admin';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import {
  ANALYTICS_RANGES,
  barHeights,
  formatDelta,
  formatInrCompact,
  formatTrendLabel,
  funnelDropoffs,
} from '@/lib/platform/admin-analytics';
import { formatEnumLabel } from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

export default function AdminAnalyticsPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <AnalyticsInner />
    </RequireAuth>
  );
}

function Delta({ pct }: { pct: number | null }) {
  const d = formatDelta(pct);
  return (
    <span
      className={`platform-text-sm ${d.tone === 'up' ? 'platform-delta--up' : d.tone === 'down' ? 'platform-delta--down' : 'platform-muted'}`}
    >
      {d.text}
    </span>
  );
}

function AnalyticsInner() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CommerceAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getCommerceAnalytics(days)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load analytics'),
      );
  }, [days]);

  const heights = data ? barHeights(data.trend.points.map((p) => p.gmvInr)) : [];

  return (
    <>
      <PlatformPageHeader
        title="Commerce analytics"
        subtitle="GMV and order trends, payment and fulfilment mix, top vendors and the RFQ → quotation → order funnel. GMV counts confirmed (non-cancelled) orders."
        actions={
          <Link href="/admin/orders" className="platform-btn platform-btn-secondary platform-btn-sm">
            Order oversight
          </Link>
        }
      />
      <AdminSubnav />

      <div className="platform-section-tabs" role="tablist" aria-label="Date range">
        {ANALYTICS_RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            role="tab"
            aria-selected={days === r.days}
            className={`platform-section-tab${days === r.days ? ' platform-section-tab--active' : ''}`}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}
      {!data && !error && <PlatformLoading />}

      {data && (
        <>
          <ul className="platform-partner-ops-grid" aria-label="Headline metrics">
            <li className="platform-partner-ops-stat">
              <strong>{formatInrCompact(data.gmv.totalInr)}</strong>
              <span>GMV</span>
              <Delta pct={data.gmv.changePct} />
            </li>
            <li className="platform-partner-ops-stat">
              <strong>{data.gmv.orders}</strong>
              <span>Orders</span>
              <Delta pct={data.gmv.ordersChangePct} />
            </li>
            <li className="platform-partner-ops-stat">
              <strong>{formatInrCompact(data.gmv.avgOrderValueInr)}</strong>
              <span>Avg order value</span>
            </li>
            <li className="platform-partner-ops-stat">
              <strong>{formatInrCompact(data.gmv.paidInr)}</strong>
              <span>Paid GMV</span>
              <span className="platform-text-sm platform-muted">
                {formatInrCompact(data.gmv.pendingInr)} awaiting payment
              </span>
            </li>
            <li
              className={`platform-partner-ops-stat${data.gmv.cancellationRatePct >= 20 ? ' platform-partner-ops-stat--alert' : ''}`}
            >
              <strong>{data.gmv.cancellationRatePct}%</strong>
              <span>Cancellation rate</span>
              <span className="platform-text-sm platform-muted">
                {data.gmv.cancelledOrders} cancelled
              </span>
            </li>
          </ul>

          <section className="platform-card" aria-labelledby="trend-h">
            <h2 id="trend-h">
              GMV trend ({data.trend.bucketDays > 1 ? 'weekly' : 'daily'})
            </h2>
            <div className="platform-bar-chart" role="img" aria-label="GMV over time">
              {data.trend.points.map((p, i) => (
                <div
                  key={p.date}
                  data-zero={p.gmvInr === 0}
                  style={{ height: `${heights[i]}%` }}
                  title={`${formatTrendLabel(p.date, data.trend.bucketDays)}: ${formatInrCompact(p.gmvInr)} · ${p.orders} orders`}
                />
              ))}
            </div>
            <p className="platform-muted platform-text-sm">
              Hover a bar for the period total. Previous period GMV:{' '}
              {formatInrCompact(data.gmv.previousPeriodInr)}.
              {data.truncated && ' Showing the first 20,000 orders of the window.'}
            </p>
          </section>

          <section className="platform-card" aria-labelledby="rfq-h">
            <div className="platform-page-header-row">
              <h2 id="rfq-h">RFQ funnel</h2>
              <span className="platform-muted platform-text-sm">
                RFQs created in range · <Delta pct={data.rfq.createdChangePct} />
              </span>
            </div>
            <div className="platform-funnel">
              {data.rfq.funnel.map((s) => (
                <div key={s.key} className="platform-funnel-row">
                  <span>{s.label}</span>
                  <div className="platform-funnel-track">
                    <span style={{ width: `${s.ratePct}%` }} />
                  </div>
                  <span>
                    <strong>{s.count}</strong> · {s.ratePct}%
                  </span>
                </div>
              ))}
            </div>
            <p className="platform-muted platform-text-sm">
              {funnelDropoffs(data.rfq.funnel)
                .map((d) => `${d.lostPct}% drop: ${d.from} → ${d.to}`)
                .join(' · ')}
            </p>
            <div className="platform-form-field-pair">
              <div>
                <h3>Vendor response</h3>
                <p>
                  {data.rfq.invites.total} invites · <strong>{data.rfq.invites.responseRatePct}%</strong>{' '}
                  responded, <strong>{data.rfq.invites.quoteRatePct}%</strong> quoted (
                  {data.rfq.invites.declined} declined)
                </p>
              </div>
              <div>
                <h3>Quotations</h3>
                <p>
                  {data.rfq.quotations.total} submitted · {data.rfq.quotations.avgPerRfq} per RFQ ·{' '}
                  <strong>{data.rfq.quotations.acceptanceRatePct}%</strong> accepted
                </p>
              </div>
            </div>
            <p className="platform-text-sm platform-muted">
              RFQ status:{' '}
              {Object.entries(data.rfq.byStatus)
                .map(([k, v]) => `${formatEnumLabel(k)} ${v}`)
                .join(' · ')}
            </p>
          </section>

          <div className="platform-form-field-pair">
            <section className="platform-card" aria-labelledby="mix-h">
              <h2 id="mix-h">Order sources</h2>
              <p>
                Via RFQ: <strong>{data.sourceSplit.rfq.orders}</strong> orders ·{' '}
                {formatInrCompact(data.sourceSplit.rfq.gmvInr)} ({data.sourceSplit.rfqSharePct}% of GMV)
              </p>
              <p>
                Direct cart: <strong>{data.sourceSplit.direct.orders}</strong> orders ·{' '}
                {formatInrCompact(data.sourceSplit.direct.gmvInr)}
              </p>
              <h3>Payment status</h3>
              <ul className="platform-list">
                {Object.entries(data.paymentBreakdown).map(([k, v]) => (
                  <li key={k}>
                    {formatEnumLabel(k)}: {v.orders} orders · {formatInrCompact(v.gmvInr)}
                  </li>
                ))}
              </ul>
              <h3>Fulfilment</h3>
              <ul className="platform-list">
                {Object.entries(data.fulfillmentBreakdown).map(([k, v]) => (
                  <li key={k}>
                    {formatEnumLabel(k)}: {v}
                  </li>
                ))}
              </ul>
            </section>

            <section className="platform-card" aria-labelledby="vendors-h">
              <h2 id="vendors-h">Top vendors by GMV</h2>
              {data.topVendors.length === 0 ? (
                <p className="platform-muted">No orders in this range.</p>
              ) : (
                <div className="platform-table-wrap">
                  <table className="platform-table">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Orders</th>
                        <th>GMV</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topVendors.map((v) => (
                        <tr key={v.organizationId}>
                          <td>{v.companyName}</td>
                          <td>{v.orders}</td>
                          <td>{formatInrCompact(v.gmvInr)}</td>
                          <td>{v.sharePct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
