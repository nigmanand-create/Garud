# Payments runbook (B7 · P-INT-02)

How GarudHub takes money, how to configure it per environment, and how to prove it works before and after go-live.
Covers **order payments** (Razorpay Orders + NEFT/RTGS wire) and **partner subscriptions** (Razorpay Subscriptions).

Related: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`DEPLOY_CLOUDFLARE_TUNNEL.md`](./DEPLOY_CLOUDFLARE_TUNNEL.md) §7.7 · [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) Phase 6.

---

## 1. Payment surfaces

| Surface | Gateway | Source of truth for “paid” | Code |
|---------|---------|----------------------------|------|
| Buyer order — online | Razorpay Orders | `payment.captured` webhook **or** signed checkout callback (`POST /payments/verify-razorpay`) | `payments.service.ts` |
| Buyer order — wire | NEFT/RTGS (UTR) | Admin approves UTR (`POST /payments/admin/verify-utr`) | `payments.service.ts` |
| Partner plan | Razorpay Subscriptions | `subscription.*` webhooks (checkout callback activates early) | `partner-billing.service.ts` |
| COD | — | **Not supported** (deferred, PRD Phase 4) | — |

---

## 2. Environment matrix

| Variable | Local | Staging (`dev.garudhub.me`) | Production (`garudhub.me`) |
|----------|-------|-----------------------------|----------------------------|
| `NODE_ENV` | `development` | `production` | `production` |
| `GARUD_DEPLOY_ENV` | unset | `staging` | **`production`** |
| `RAZORPAY_KEY_ID` | unset (sandbox) or `rzp_test_…` | `rzp_test_…` | **`rzp_live_…`** (boot fails otherwise) |
| `RAZORPAY_KEY_SECRET` | matches key | matches key | live secret |
| `RAZORPAY_WEBHOOK_SECRET` | optional (unsigned accepted, logged) | **required** | **required** |
| Sandbox simulation (`order_sand_…`, `sub_sand_…`) | ✅ when keys unset | ✅ when keys unset | ❌ never |
| Payment intent with no keys | simulated | simulated | **503** “Online payment is not available” |
| Razorpay API error at intent | falls back to sandbox | falls back to sandbox | **502**, no simulation |
| Webhook without `RAZORPAY_WEBHOOK_SECRET` | accepted + warning | **503** (`NODE_ENV=production`) | **503** |
| Partner billing mode | `SANDBOX` (no keys) / `LIVE` | `SANDBOX` / `LIVE` (test keys) | `LIVE` / `UNAVAILABLE` (no keys) |
| Seed / demo data | yes | once, `ALLOW_DEMO_SEED` | **no** |

Rules enforced in code (not just convention):

- `NODE_ENV=production` + `GARUD_DEPLOY_ENV=production` + any Razorpay variable set ⇒ the API **refuses to boot** unless key id is `rzp_live_…` and secret + webhook secret are set (`env.validation.ts`).
- “Production deploy” for sandbox purposes means `GARUD_DEPLOY_ENV === 'production'` only. **Staging must set `GARUD_DEPLOY_ENV=staging`**, never `production`, or test keys will fail boot validation.
- Sandbox payment ids are accepted only if the matching payment intent was created in sandbox mode **and** the deploy is not production.
- Never commit key files. `backend/rzp-key.csv` is git-ignored (`*.csv`); treat the test key in it as exposed to anyone who has the working directory and rotate before reuse in a shared environment.

---

## 3. Webhook configuration

**Endpoint** (pick one; both reach the same handler):

| Path | URL |
|------|-----|
| Via Next proxy (default) | `https://<host>/platform-api/v1/payments/webhook` |
| Dedicated API host | `https://api.<host>/api/v1/payments/webhook` |

Notes:

- The Next proxy forwards the **raw body** and the `x-razorpay-signature` / `x-razorpay-event-id` headers. If you add another proxy, it must not re-serialize JSON — the HMAC is computed over the exact bytes Razorpay sent (`rawBody: true` in `main.ts`).
- Create the webhook in the **matching Razorpay mode** (Test for staging, Live for production) and copy its secret into `RAZORPAY_WEBHOOK_SECRET` of that environment only.

**Events to subscribe**

| Event | Effect |
|-------|--------|
| `payment.captured` / `order.paid` | Transaction → `SUCCESS`, order → `PAID` (only if amount matches our intent; replay is a no-op) |
| `payment.failed` | Transaction → `FAILED` with gateway reason; order stays `PENDING` so the buyer can retry |
| `refund.processed` | Transaction → `REFUNDED`; order → `REFUNDED` on a full refund |
| `subscription.activated`, `subscription.charged` | Partner subscription → `ACTIVE`, period start/end stored |
| `subscription.pending`, `subscription.halted` | → `PAST_DUE` (access kept as grace) |
| `subscription.cancelled`, `subscription.completed` | → `CANCELLED` (falls back to default plan) |

Behaviour: invalid/missing signature ⇒ **400**; unknown event/object ⇒ **200** (so Razorpay stops retrying) with `handled:false`; amount mismatch ⇒ **not marked paid**, transaction gets a `failureReason` for manual review.

### Webhook go-live checklist

```text
[ ] Webhook created in correct Razorpay mode, URL = environment host (§3)
[ ] Secret copied to RAZORPAY_WEBHOOK_SECRET; API restarted (pm2 restart garudhub-api)
[ ] Events from the table above ticked (and no others needed)
[ ] Razorpay dashboard → Webhooks → “Send test webhook” → delivery shows 200
[ ] Tamper test: curl POST the same URL with a bogus x-razorpay-signature → 400
[ ] Place a small order, pay online → order flips to PAID without refreshing (webhook path)
[ ] Replay the delivery from the dashboard → still 200, no duplicate state change
[ ] API logs show no "Amount mismatch" / "unknown order" warnings for the test payment
[ ] Failed-payment test (use Razorpay failing test card) → transaction FAILED, order PENDING
```

---

## 4. Staging vs production procedure

### Staging (`dev` branch → `dev.garudhub.me`)

1. `GARUD_DEPLOY_ENV=staging`, `rzp_test_…` keys, test-mode webhook secret.
2. Run the webhook checklist (§3) with Razorpay **test** cards/UPI (`success@razorpay`).
3. Partner billing: as admin open **Admin → Partner Billing**, “Sync to Razorpay” each paid plan (creates the test-mode plan), then as a verified partner upgrade on `/partner/subscription` and complete the Razorpay test authorisation. Confirm the status goes `PENDING_PAYMENT → ACTIVE` and `/admin/billing` shows the subscriber.
4. Cancel the subscription: plan stays active until the period end; `cancelling` shows in admin.

### Production (`main` → `garudhub.me`)

1. Business: Razorpay KYC complete, **Subscriptions** feature enabled on the live account, settlement account verified.
2. Ops: `GARUD_DEPLOY_ENV=production`, `rzp_live_…` key + secret, **live-mode** webhook secret. Boot check fails fast if any is wrong.
3. `npx prisma migrate deploy` (includes `20261104140000_partner_subscription_billing`).
4. Re-run the webhook checklist with a **₹1–₹10 real transaction**, then refund it from the Razorpay dashboard and confirm `refund.processed` marks the order `REFUNDED`.
5. In **Admin → Partner Billing**, sync each paid plan against the **live** account (plan ids from test mode do not exist in live — sync creates fresh ones). Do **not** copy the database from staging without clearing `partner_plans.razorpay_plan_id`.
6. Smoke test an upgrade with a real small-value plan if desired; otherwise keep paid plans hidden (`Visible to partners` off) until commercial terms are announced.

### Rollback / incident levers

| Symptom | Action |
|---------|--------|
| Gateway outage or bad keys | Buyers get 502/503 on “Pay online”; wire transfer keeps working. Fix env, restart API. |
| Orders stuck `PENDING` after real payment | Check webhook deliveries in Razorpay dashboard → redeliver. Last resort: Admin → order → update payment status. |
| Wrong amount captured | Webhook refuses to mark paid and logs `Amount mismatch`; reconcile manually, refund via Razorpay. |
| Subscription charged but plan inactive | Redeliver `subscription.charged`; or Admin → Partner Billing → assign plan (no charge) as a stop-gap. |
| Need to stop new paid signups | Admin → Partner Billing → untick “Visible to partners” on the plan (existing subscribers keep access). |

---

## 5. Partner subscription billing (C4)

- **Plans** are rows in `partner_plans` (seeded on first read: *Founding Partner* free default, *Growth* ₹4,999/mo, *Enterprise* ₹14,999/mo — placeholders, edit in **Admin → Partner Billing**). Exactly one free default plan applies to partners without a subscription.
- **Entitlements** are columns on the plan: `listingLimit` (**enforced** at `POST /partner/catalog/listings`; existing listings are never removed), `featuredPlacement` and `rfqPriority` (**stored and shown; ranking not wired yet**).
- **Flow**: partner `POST /partner/subscription/checkout` → free plan activates immediately; paid plan creates a Razorpay subscription (needs `razorpay_plan_id` from “Sync to Razorpay”) → Razorpay checkout → `POST /partner/subscription/verify` (signature `HMAC(payment_id|subscription_id)`) → webhooks keep it current.
- **Cancel** is “at period end”: access continues until `currentPeriodEnd`, then the partner falls back to the default plan. Switching between paid plans = cancel first, then pick the new one (no proration in v1).
- **Price changes** on a plan clear its `razorpay_plan_id` (Razorpay plans are immutable); re-sync before partners can subscribe at the new price. Existing subscribers stay on the old Razorpay plan.
- **Admin comp / offline invoice**: `POST /admin/billing/assign` (UI form) assigns a plan without the gateway; it refuses if the partner holds a live gateway subscription.
- **Billing modes** shown in UI: `LIVE` (keys set), `SANDBOX` (no keys, non-production: simulated authorisation, no money), `UNAVAILABLE` (production without keys: paid checkout disabled, 503).

Known gaps (v1): no GST invoices/billing history in-app (use Razorpay dashboard), no proration or plan-to-plan switching, no dunning emails, no automatic downgrade of listings above a lowered limit, admin assign uses organization ID (no picker).

---

## 6. Order / RFQ analytics (admin)

`GET /admin/analytics?days=7..365` → **Admin → Commerce Analytics** (`/admin/analytics`): GMV (confirmed orders) with period-over-period change, paid vs awaiting-payment, AOV, cancellation rate, daily/weekly GMV trend, payment/fulfilment mix, RFQ vs direct-cart order split, top vendors, and the RFQ funnel (created → quoted → accepted → ordered, invite response rate, quotes per RFQ). Funnel cohorts are RFQs **created in the window**, so recent RFQs under-count conversion until they mature.

---

## 7. Cart policy — single seller per order

Decision (Phase 6): **keep one seller per cart/order.** An order carries one vendor’s invoice, shipment, fulfilment status, payout and `PaymentTransaction`s; splitting a basket across vendors would need a parent “basket” entity, per-vendor sub-orders and partial payments — not justified for B2B drone volumes where multi-vendor sourcing already happens through **RFQ**.

UX: adding an item from another seller returns `409`; the product page now explains the rule and offers *Go to cart*, *Clear cart & add this item* and *Raise an RFQ instead*; the cart page states the policy. Revisit if buyers regularly ask to check out several sellers at once (see PRD Phase 6).

---

## 8. Hardening changes shipped with this runbook

| Issue (before) | Fix |
|----------------|-----|
| Webhook signature skipped when the header was absent (Next proxy also dropped the header) | Signature required whenever a secret is set; proxy forwards `x-razorpay-signature`; 503 in production with no secret; constant-time compare over the **raw** body |
| Anyone could verify a forged `order_sand_…` id and mark an order PAID | Sandbox ids accepted only for sandbox-created intents and never on `GARUD_DEPLOY_ENV=production` |
| Valid signature for *another* Razorpay order could be applied to a pricier order | Verification requires an intent created for **that** order |
| Unconfigured gateway skipped signature check for non-sandbox ids | Returns 503 instead |
| Webhook marked paid without amount check; no failed/refund handling; not idempotent | Amount compared in paise; `payment.failed`, `refund.processed`, subscription events handled; replays are no-ops |
