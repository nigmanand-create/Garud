'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  cancelPartnerSubscription,
  checkoutPartnerPlan,
  getPartnerSubscription,
  verifyPartnerSubscription,
  type PartnerSubscription,
} from '@/lib/api/billing';
import { loadRazorpayScript } from '@/lib/api/payments';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  billingModeNotice,
  formatPlanPrice,
  planAction,
  usageSummary,
} from '@/lib/platform/partner-billing';
import { ApiError } from '@/lib/api/types';

export default function PartnerSubscriptionPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <SubscriptionInner />
    </RequireAuth>
  );
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null;
}

function SubscriptionInner() {
  const { confirm, dialog } = useConfirmDialog();
  const [data, setData] = useState<PartnerSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getPartnerSubscription()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load plan'),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSelect(planKey: string, planName: string) {
    setError(null);
    setNotice(null);
    setBusy(planKey);
    try {
      const res = await checkoutPartnerPlan(planKey);
      if (res.mode === 'ACTIVATED') {
        setNotice(`You are now on the ${planName} plan.`);
        load();
        return;
      }

      if (res.sandboxMode) {
        // Test environment without Razorpay keys: confirm the simulated authorisation.
        const ok = await confirm({
          title: `Simulate ${planName} payment?`,
          message:
            'This environment runs billing in test mode. Confirming activates the plan without any real charge.',
          confirmLabel: 'Simulate payment',
        });
        if (!ok) {
          setNotice('Checkout started but not completed. Pick a plan again to resume.');
          load();
          return;
        }
        await verifyPartnerSubscription({
          razorpaySubscriptionId: res.subscriptionId,
          razorpayPaymentId: `pay_sand_${Date.now()}`,
          razorpaySignature: 'sandbox',
        });
        setNotice(`You are now on the ${planName} plan (test mode).`);
        load();
        return;
      }

      const loaded = await loadRazorpayScript();
      const Razorpay = (window as unknown as { Razorpay?: new (o: unknown) => { open(): void } })
        .Razorpay;
      if (!loaded || !Razorpay) {
        if (res.shortUrl) {
          window.location.href = res.shortUrl;
          return;
        }
        throw new Error('Could not load Razorpay checkout. Disable script blockers and retry.');
      }
      new Razorpay({
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: 'GarudHub Partner Plan',
        description: `${planName} plan`,
        theme: { color: '#2f5233' },
        handler: async (r: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPartnerSubscription({
              razorpaySubscriptionId: r.razorpay_subscription_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
            });
            setNotice(`Payment received — you are now on the ${planName} plan.`);
            load();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Payment verification failed');
          }
        },
      }).open();
    } catch (e) {
      setError(
        e instanceof ApiError || e instanceof Error ? e.message : 'Could not change plan',
      );
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    const ok = await confirm({
      title: 'Cancel your subscription?',
      message:
        'Your plan stays active until the end of the current paid period, then you return to the free plan. Listings above the free limit stay visible but you cannot add more.',
      confirmLabel: 'Cancel subscription',
      destructive: true,
    });
    if (!ok) return;
    setBusy('cancel');
    setError(null);
    try {
      setData(await cancelPartnerSubscription());
      setNotice('Subscription will end at the close of the current period.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel');
    } finally {
      setBusy(null);
    }
  }

  const modeNotice = data ? billingModeNotice(data.billingMode) : null;
  const usage = data ? usageSummary(data.usage) : null;
  const cancelsAtPeriodEnd = Boolean(data?.plan.endsAt);
  const currentIsPaid = Boolean(
    data && data.plan.priceInr > 0 && data.plan.source === 'SUBSCRIPTION',
  );

  return (
    <PartnerPageShell>
      {dialog}
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Subscription"
          subtitle="Your GarudHub plan, entitlements and usage. Upgrade any time — paid plans are billed through Razorpay."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {notice && (
            <div className="platform-card" role="status">
              {notice}
            </div>
          )}
          {!data && !error && <PlatformLoading />}
          {data && usage && (
            <>
              {modeNotice && (
                <div className="platform-card platform-notice-warn" role="note">
                  {modeNotice}
                </div>
              )}

              <section className="platform-card" aria-labelledby="plan-heading">
                <h2 id="plan-heading">
                  {data.plan.name} <StatusBadge status={data.plan.status} />
                </h2>
                <p>{data.plan.description}</p>
                <p className="platform-muted">
                  Price:{' '}
                  <strong>
                    {data.plan.priceInr === 0
                      ? data.plan.source === 'DEFAULT'
                        ? 'Free during launch'
                        : 'Free'
                      : formatPlanPrice(data.plan.priceInr, data.plan.billingPeriod)}
                  </strong>
                  {data.plan.renewsAt && <> · Renews {fmtDate(data.plan.renewsAt)}</>}
                  {data.plan.endsAt && <> · Ends {fmtDate(data.plan.endsAt)} (cancelled)</>}
                </p>
                {data.plan.status === 'PAST_DUE' && (
                  <p className="platform-error platform-text-sm">
                    Your last payment failed. Update your payment method in Razorpay to avoid losing
                    paid features.
                  </p>
                )}
                <p>
                  <strong>Usage:</strong> {usage.text}
                </p>
                {usage.percent != null && (
                  <div
                    className={`platform-meter${usage.atLimit ? ' platform-meter--full' : usage.nearLimit ? ' platform-meter--warn' : ''}`}
                    role="progressbar"
                    aria-valuenow={usage.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${usage.percent}%` }} />
                  </div>
                )}
                {usage.atLimit && (
                  <p className="platform-text-sm platform-muted">
                    You have reached your listing limit — upgrade below to add more.
                  </p>
                )}
                {currentIsPaid && !cancelsAtPeriodEnd && (
                  <p>
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-sm"
                      disabled={busy === 'cancel'}
                      onClick={onCancel}
                    >
                      Cancel subscription
                    </button>
                  </p>
                )}
              </section>

              <section aria-labelledby="plans-heading">
                <h2 id="plans-heading">Plans</h2>
                <div className="platform-plan-grid">
                  {data.plans.map((plan) => {
                    const action = planAction(plan, {
                      mode: data.billingMode,
                      currentPlanKey: data.plan.key,
                      currentIsPaid,
                      cancelsAtPeriodEnd,
                    });
                    return (
                      <article
                        key={plan.key}
                        className={`platform-plan-card${plan.isCurrent ? ' platform-plan-card--current' : ''}`}
                      >
                        <h3>{plan.name}</h3>
                        <p className="platform-plan-price">
                          {formatPlanPrice(plan.priceInr, plan.billingPeriod)}
                        </p>
                        <p className="platform-muted platform-text-sm">{plan.description}</p>
                        <ul className="platform-list">
                          {plan.entitlements.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="platform-btn platform-btn-full"
                          disabled={action.disabled || busy !== null}
                          onClick={() => onSelect(plan.key, plan.name)}
                        >
                          {busy === plan.key ? 'Working…' : action.label}
                        </button>
                        {action.reason && (
                          <p className="platform-muted platform-text-sm">{action.reason}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="platform-card">
                <h2>Included in your plan</h2>
                <ul className="platform-list">
                  {data.entitlements.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <p className="platform-muted platform-text-sm">
                  Featured placement and RFQ priority are recorded on your plan; automatic
                  ranking changes roll out after launch.
                </p>
              </section>

              <p className="platform-muted platform-text-sm">
                Looking for a record of approvals and moderation decisions?{' '}
                <Link href="/partner/activity">View activity log</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
