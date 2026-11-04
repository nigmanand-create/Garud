# Staging smoke checklist (NEXT-L2)

**Step-by-step instructions:** [`STAGING_SMOKE_GUIDE.md`](./STAGING_SMOKE_GUIDE.md) · **Full URL catalog (local + staging):** [`MANUAL_URL_TEST_LIST.md`](./MANUAL_URL_TEST_LIST.md)

Run on **`https://dev.garudhub.me`** after deploy from **`dev`**, before merging to **`main`**.  
Detailed procedures and rate-limit notes: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md).

**Sign-off:** QA name · date · commit SHA · tunnel host

---

## Pre-flight

- [ ] `GARUD_DEPLOY_ENV=staging` on host (not `production`)
- [ ] Razorpay **test** keys configured; live keys **not** required on staging
- [ ] `npx prisma migrate deploy` completed in deploy log
- [ ] Post-deploy health: [`deploy/scripts/post-deploy-health-check.sh`](../deploy/scripts/post-deploy-health-check.sh) green

---

## Anonymous / marketing

- [ ] Home `/` loads (React hero, service tiles)
- [ ] `/marketplace` lists at least one published listing or shows empty state with RFQ CTA
- [ ] `/enquiry` form submits (check admin enquiry queue or SMTP log)
- [ ] Legacy snapshot bridge: visit `/scrap-recycling` → lands on `/services#recycling` (308)

---

## Buyer journey

- [ ] Login as demo buyer ([`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md))
- [ ] Header: cart, My Orders, My RFQs visible (desktop **and** mobile drawer)
- [ ] Mobile drawer: notification bell shows when logged in
- [ ] Add listing to cart → checkout with Razorpay **test** payment → order confirmed
- [ ] `/buyer/rfqs/new` → create RFQ → receive in-app notification when partner submits quote (if partner available)

---

## Partner / admin (spot checks)

- [ ] Partner login → catalog or RFQ invite visible
- [ ] Admin login → `/admin/enquiries` or orders queue loads

---

## Abuse / stability

- [ ] `GET /platform-api/v1/health` returns `{ "status": "ok" }`
- [ ] Rapid enquiry POSTs eventually return **429** (throttle sanity — do not load-test production)

---

## Payments (staging gate — P0-PAY3)

- [ ] Complete one **test-key** checkout end-to-end
- [ ] Webhook: Razorpay **dashboard** registration for the staging URL is optional on dev; the API still requires **`RAZORPAY_WEBHOOK_SECRET`** when test checkout/webhooks are enabled (register the dashboard URL if you exercise delivery/replay).

---

## Record result

| Result | Notes |
|--------|--------|
| PASS / FAIL | |

If **FAIL**, block **NEXT-L3** (`dev` → `main`) until fixed on `dev`.
