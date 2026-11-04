'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  adminAssignPlan,
  adminCreatePlan,
  adminListPlans,
  adminListSubscriptions,
  adminSyncRazorpayPlan,
  adminUpdatePlan,
  type AdminPlan,
  type AdminPlansResponse,
  type AdminSubscriptionRow,
} from '@/lib/api/billing';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { formatInrCompact } from '@/lib/platform/admin-analytics';
import {
  billingModeNotice,
  buildPlanPayload,
  formatPlanPrice,
  type BillingPeriod,
  type PlanFormValues,
} from '@/lib/platform/partner-billing';
import { ApiError } from '@/lib/api/types';

export default function AdminBillingPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <BillingInner />
    </RequireAuth>
  );
}

const EMPTY_FORM: PlanFormValues = {
  name: '',
  description: '',
  priceInr: '0',
  listingLimit: '',
  billingPeriod: 'MONTHLY',
  featuredPlacement: false,
  rfqPriority: false,
  featuresText: '',
  isActive: true,
  isDefault: false,
  sortOrder: '100',
};

function toForm(p: AdminPlan): PlanFormValues {
  return {
    name: p.name,
    description: p.description,
    priceInr: String(p.priceInr),
    listingLimit: p.listingLimit == null ? '' : String(p.listingLimit),
    billingPeriod: p.billingPeriod,
    featuredPlacement: p.featuredPlacement,
    rfqPriority: p.rfqPriority,
    featuresText: p.features.join('\n'),
    isActive: p.isActive,
    isDefault: p.isDefault,
    sortOrder: String(p.sortOrder),
  };
}

function BillingInner() {
  const [data, setData] = useState<AdminPlansResponse | null>(null);
  const [subs, setSubs] = useState<AdminSubscriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<PlanFormValues>(EMPTY_FORM);
  const [assignOrg, setAssignOrg] = useState('');
  const [assignPlan, setAssignPlan] = useState('');

  const load = useCallback(() => {
    Promise.all([adminListPlans(), adminListSubscriptions()])
      .then(([p, s]) => {
        setData(p);
        setSubs(s.items);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load billing'),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: AdminPlan) {
    setEditing(p.id);
    setForm(toForm(p));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const built = buildPlanPayload(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    void run(async () => {
      if (editing === 'new') {
        await adminCreatePlan(built.payload);
        setNotice('Plan created.');
      } else if (editing) {
        await adminUpdatePlan(editing, built.payload);
        setNotice('Plan updated. If the price changed, sync it to Razorpay again.');
      }
      setEditing(null);
    });
  }

  const set = <K extends keyof PlanFormValues>(k: K, v: PlanFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const modeNotice = data ? billingModeNotice(data.billingMode) : null;

  return (
    <>
      <PlatformPageHeader
        title="Partner billing"
        subtitle="Configure plans and entitlements, sync them to Razorpay, and oversee partner subscriptions."
        actions={
          <button
            type="button"
            className="platform-btn platform-btn-sm"
            onClick={() => {
              setEditing('new');
              setForm(EMPTY_FORM);
            }}
          >
            New plan
          </button>
        }
      />
      <AdminSubnav />

      {error && <div className="platform-card platform-error">{error}</div>}
      {notice && (
        <div className="platform-card" role="status">
          {notice}
        </div>
      )}
      {modeNotice && (
        <div className="platform-card platform-notice-warn" role="note">
          {modeNotice}
        </div>
      )}
      {!data && !error && <PlatformLoading />}

      {editing && (
        <form className="platform-card platform-form" onSubmit={onSubmit}>
          <h2>{editing === 'new' ? 'New plan' : `Edit ${form.name}`}</h2>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="plan-name">Name</label>
              <input id="plan-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label htmlFor="plan-price">Price (₹, 0 = free)</label>
              <input
                id="plan-price"
                inputMode="decimal"
                value={form.priceInr}
                onChange={(e) => set('priceInr', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="plan-desc">Description</label>
            <input
              id="plan-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="plan-period">Billing period</label>
              <select
                id="plan-period"
                value={form.billingPeriod}
                onChange={(e) => set('billingPeriod', e.target.value as BillingPeriod)}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label htmlFor="plan-limit">Listing limit (blank = unlimited)</label>
              <input
                id="plan-limit"
                inputMode="numeric"
                value={form.listingLimit}
                onChange={(e) => set('listingLimit', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="plan-features">Extra feature bullets (one per line)</label>
            <textarea
              id="plan-features"
              rows={4}
              value={form.featuresText}
              onChange={(e) => set('featuresText', e.target.value)}
            />
          </div>
          <p className="platform-link-row">
            <label>
              <input
                type="checkbox"
                checked={form.featuredPlacement}
                onChange={(e) => set('featuredPlacement', e.target.checked)}
              />{' '}
              Featured placement
            </label>{' '}
            <label>
              <input
                type="checkbox"
                checked={form.rfqPriority}
                onChange={(e) => set('rfqPriority', e.target.checked)}
              />{' '}
              RFQ priority
            </label>{' '}
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />{' '}
              Visible to partners
            </label>{' '}
            <label>
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set('isDefault', e.target.checked)}
              />{' '}
              Default (free) plan
            </label>
          </p>
          <div>
            <label htmlFor="plan-sort">Sort order</label>
            <input
              id="plan-sort"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
            />
          </div>
          <p>
            <button type="submit" className="platform-btn platform-btn-sm" disabled={busy}>
              Save plan
            </button>{' '}
            <button
              type="button"
              className="platform-btn platform-btn-secondary platform-btn-sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </p>
          <p className="platform-muted platform-text-sm">
            Only the listing limit is enforced today. Featured placement and RFQ priority are
            stored and shown to partners; ranking changes are not wired yet.
          </p>
        </form>
      )}

      {data && (
        <>
          <section className="platform-card">
            <div className="platform-page-header-row">
              <h2>Plans</h2>
              <span className="platform-muted">
                Estimated MRR (active subscriptions): <strong>{formatInrCompact(data.mrrInr)}</strong>
              </span>
            </div>
            <div className="platform-table-wrap">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Listings</th>
                    <th>Flags</th>
                    <th>Subscribers</th>
                    <th>Razorpay</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.plans.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>{' '}
                        <span className="platform-muted platform-text-sm">({p.key})</span>
                        <div>
                          {p.isDefault && <StatusBadge status="APPROVED" label="Default" />}{' '}
                          {!p.isActive && <StatusBadge status="UNPUBLISHED" label="Hidden" />}
                        </div>
                      </td>
                      <td>{formatPlanPrice(p.priceInr, p.billingPeriod)}</td>
                      <td>{p.listingLimit == null ? 'Unlimited' : p.listingLimit}</td>
                      <td>
                        {[p.featuredPlacement && 'Featured', p.rfqPriority && 'RFQ priority']
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td>
                        {p.subscribers.active} active / {p.subscribers.total}
                      </td>
                      <td>
                        {p.priceInr <= 0 ? (
                          '—'
                        ) : p.razorpaySynced ? (
                          <StatusBadge status="APPROVED" label="Synced" />
                        ) : (
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await adminSyncRazorpayPlan(p.id);
                                setNotice(`${p.name} synced to Razorpay.`);
                              })
                            }
                          >
                            Sync to Razorpay
                          </button>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="platform-link-btn"
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form
            className="platform-card platform-form platform-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignOrg.trim() || !assignPlan) {
                setError('Enter an organization ID and choose a plan.');
                return;
              }
              void run(async () => {
                const r = await adminAssignPlan(assignOrg.trim(), assignPlan);
                setNotice(`${r.organization.companyName} assigned to ${r.planKey}.`);
                setAssignOrg('');
              });
            }}
          >
            <div>
              <label htmlFor="assign-org">Assign plan to organization (ID)</label>
              <input
                id="assign-org"
                value={assignOrg}
                onChange={(e) => setAssignOrg(e.target.value)}
                placeholder="organization id"
              />
            </div>
            <div>
              <label htmlFor="assign-plan">Plan</label>
              <select
                id="assign-plan"
                value={assignPlan}
                onChange={(e) => setAssignPlan(e.target.value)}
              >
                <option value="">Select…</option>
                {data.plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button type="submit" className="platform-btn platform-btn-sm" disabled={busy}>
                Assign (no charge)
              </button>
            </div>
          </form>

          <section className="platform-card">
            <h2>Recent subscriptions</h2>
            {subs.length === 0 ? (
              <p className="platform-muted">No partner has chosen a plan yet.</p>
            ) : (
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Partner</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Period end</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id}>
                        <td>
                          {s.organization.companyName}
                          <div className="platform-muted platform-text-sm">{s.organization.id}</div>
                        </td>
                        <td>{s.plan.name}</td>
                        <td>
                          <StatusBadge status={s.status} />
                          {s.cancelledAt && (
                            <div className="platform-muted platform-text-sm">cancelling</div>
                          )}
                        </td>
                        <td>
                          {s.currentPeriodEnd
                            ? new Date(s.currentPeriodEnd).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td>
                          {s.assignedByAdmin
                            ? 'Admin assigned'
                            : s.razorpaySubscriptionId?.startsWith('sub_sand_')
                              ? 'Sandbox'
                              : 'Razorpay'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
