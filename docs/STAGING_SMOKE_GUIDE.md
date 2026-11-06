# Staging smoke — step-by-step guide

Run on **https://dev.garudhub.me** after a deploy from the **`dev`** branch and **before** merging **`dev` → `main`**.

This guide satisfies launch tasks **NEXT-L2** (staging full smoke) and **P0-PAY3** (test-key checkout) in [`NEXT_TASK_LIST.md`](./NEXT_TASK_LIST.md). Use the checkbox version for sign-off: [`STAGING_SMOKE_CHECKLIST.md`](./STAGING_SMOKE_CHECKLIST.md).

**Related:** [`DEPLOY_RUNBOOK_STEP_BY_STEP.md`](./DEPLOY_RUNBOOK_STEP_BY_STEP.md) (Phase 0 host procedures) · [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) · [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md) · [`AUTH_HTTPONLY.md`](./AUTH_HTTPONLY.md)

**Sign-off record:** QA name · date · commit SHA on host · tunnel host · PASS/FAIL

**Time budget:** ~60–75 minutes for a full pass (Phases 0–6).

---

## Phase 0 — Pre-flight (host / deploy)

Verify these **immediately after deploy** on the staging host (VPS + pm2/systemd is the reference setup; a Mac + Cloudflare Tunnel also works if the same env and ports are used).

| Step | Action | Pass? |
|------|--------|-------|
| 0.1 | Pull latest **`dev`** on the host; note the deployed **commit SHA** | |
| 0.2 | `cd ~/Garud/backend && npx prisma migrate deploy` — completes with no errors (also wired in [`remote-deploy-dev.sh`](../deploy/scripts/remote-deploy-dev.sh)) | |
| 0.3 | API on **`:3000`**, Next web on **`:3001`** (pm2 or manual) — both healthy | |
| 0.4 | `backend/.env`: **`GARUD_DEPLOY_ENV=staging`** — must **not** be `production` ([P0-PAY5](./DEPLOY_RUNBOOK_STEP_BY_STEP.md#p0-pay--payments)) | |
| 0.5 | Razorpay **test** keys only (`rzp_test_…`); live keys must **not** be required on staging | |
| 0.6 | **`RAZORPAY_WEBHOOK_SECRET`** set for test-mode webhooks (unsigned webhooks are rejected when `NODE_ENV=production` on the API) | |
| 0.7 | Health: open or curl **`https://dev.garudhub.me/platform-api/v1/health`** → `{"status":"ok"}` | |
| 0.8 | Optional script: `BASE_URL=https://dev.garudhub.me bash deploy/scripts/post-deploy-health-check.sh` ([`post-deploy-health-check.sh`](../deploy/scripts/post-deploy-health-check.sh)) | |

### Demo data and credentials (staging caveat)

[`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md) is written for **local development** (`http://localhost:3001`). On staging, use the **same emails and default passwords** only if the database was seeded once on that host:

| Role | Email | Password |
|------|-------|----------|
| Buyer (checkout QA) | `checkout-test@garudhub.local` | `ChangeMeDemo123!` |
| Buyer (general) | `buyer@garudhub.local` | `ChangeMeDemo123!` |
| Partner | `partner@garudhub.local` | `ChangeMeDemo123!` |
| Admin | `admin@garudhub.local` | Value of **`ADMIN_PASSWORD`** in host `backend/.env` (often `ChangeMeAdmin123!` per `.env.example`) |

**Do not use demo passwords on production.** Staging seed (if needed): on the host only, after migrate — `cd backend && npm run prisma:seed` when permitted ([`ALLOW_DEMO_SEED`](./PAYMENTS_RUNBOOK.md#2-environment-matrix) / non-production policy). **Never** seed production.

### Fresh data reset (local or staging)

To wipe orders, RFQs, enquiries, carts, and catalog rows **without** deleting demo users (`admin@`, `partner@`, `buyer@`, etc.): from `backend/`, run `npm run commerce:fresh` (or `commerce:reset` then `prisma:seed`). On production-like `NODE_ENV`, set `ALLOW_COMMERCE_RESET=true` for a one-off wipe. Default seed no longer creates sample orders; use `SEED_DEMO_TRANSACTIONS=true npm run prisma:seed` if you need the legacy PO/NEFT demo order.

**Checkout listing (after seed):** **Garud AgriSpray X1** (SKU `GD-AGRI-X1`) — see [`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md#checkout-test-manual-qa).

### httpOnly session cookies

Browser auth uses **`garud_access`** / **`garud_refresh`** httpOnly cookies via the Next **`/platform-api`** proxy ([`AUTH_HTTPONLY.md`](./AUTH_HTTPONLY.md)). Before testing:

1. Clear stale site data or use a fresh incognito window.
2. If you previously used localStorage tokens, **log out → log in** once on staging.
3. Do **not** set `NEXT_PUBLIC_AUTH_SESSION=bearer` on the staging web bundle unless debugging break-glass mode.

---

## Phase 1 — Anonymous / marketing (~10 min)

Use an **incognito** window (no prior session).

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open **https://dev.garudhub.me/** | React home: hero, service tiles, register CTA |
| 1.2 | Open **/marketplace** | At least one published listing **or** empty state with RFQ CTA |
| 1.3 | Open **/enquiry**, submit the form (valid email/phone) | Success message; new row in **Admin → Enquiries** (or API/log if SMTP is off) |
| 1.4 | Open **/scrap-recycling** | **308** redirect → **/services#recycling** (snapshot bridge) |
| 1.5 | Optional: **/about-us**, **/legal/privacy** (or other bridged marketing paths) | Pages load; no broken layout |

---

## Phase 2 — Buyer journey (~20 min)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | **/auth/login** → `checkout-test@garudhub.local` | Lands in buyer area (e.g. marketplace) |
| 2.2 | **Desktop header:** Cart, My Orders, My RFQs | Visible |
| 2.3 | **Mobile:** open hamburger drawer → same nav links + **notification bell** | Bell visible when logged in |
| 2.4 | **/marketplace** → **Garud AgriSpray X1** (`GD-AGRI-X1`) → Add to cart | Cart count increases |
| 2.5 | **/buyer/cart** → proceed to checkout | Razorpay **test** checkout opens |
| 2.6 | Complete test payment (Razorpay test card / UPI test e.g. `success@razorpay`) | Order confirmed; appears under **/buyer/orders** |
| 2.7 | Optional: open **Receipt** on the order | Receipt page loads |
| 2.8 | **/buyer/rfqs/new** — create a short RFQ | RFQ detail page loads |
| 2.9 | **Second browser/profile:** log in as **partner@garudhub.local** → submit a quote on that RFQ | Buyer **notification bell** shows quote activity (ties to step 2.3) |

---

## Phase 3 — Partner and admin spot check (~10 min)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | **partner@garudhub.local** → **/partner** | Partner dashboard loads |
| 3.2 | **/partner/catalog** or partner RFQ views | Data visible (catalog or open RFQs) |
| 3.3 | **admin@garudhub.local** → **/admin** | Admin ops home loads |
| 3.4 | **/admin/enquiries** | Phase 1 enquiry visible (optional: filters / CRM export) |
| 3.5 | Optional: **/admin/analytics**, featured listing toggle on a listing | Pages load |

---

## Phase 4 — Payments gate (P0-PAY3) (~15 min)

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Repeat **one full test checkout** (steps 2.4–2.6) if not already done in Phase 2 | Order **PAID**; status updates without manual admin fix |
| 4.2 | Razorpay Dashboard ( **Test mode** ) → Webhooks | Staging URL registered: **`https://dev.garudhub.me/platform-api/v1/payments/webhook`** ([`PAYMENTS_RUNBOOK.md` §3](./PAYMENTS_RUNBOOK.md#3-webhook-configuration)) |
| 4.3 | Optional: “Send test webhook” or replay a delivery | HTTP **200**; order stays consistent (idempotent replay) |
| 4.4 | Optional: [`PAYMENTS_RUNBOOK.md` §3](./PAYMENTS_RUNBOOK.md#webhook-go-live-checklist) — POST with bogus `x-razorpay-signature` | **400** (signature rejected) |

Production webhook URL (**live** mode) is **`https://garudhub.me/platform-api/v1/payments/webhook`** — do **not** point staging test webhooks at production.

---

## Phase 5 — Stability / throttle (light touch)

Do **not** load-test staging or production; this is a sanity check only.

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Re-check **https://dev.garudhub.me/platform-api/v1/health** | Still `{"status":"ok"}` |
| 5.2 | Submit **/enquiry** rapidly **6–8 times** in ~1 minute (same browser) | Eventually **429 Too Many Requests** (default `THROTTLE_ENQUIRY_LIMIT=5` per minute — see [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#rate-limits--abuse-review-p0-sec2-tuning)) |

---

## Phase 6 — Sign-off

1. Mark all applicable boxes in [`STAGING_SMOKE_CHECKLIST.md`](./STAGING_SMOKE_CHECKLIST.md).
2. Fill the result table (in the checklist or below):

| Result | Commit SHA | QA · Date | Notes |
|--------|------------|-----------|-------|
| PASS / FAIL | e.g. `abc1234` | | Failed step numbers / tickets |

**If PASS:** update [`NEXT_TASK_LIST.md`](./NEXT_TASK_LIST.md) — check **NEXT-L2** and **P0-PAY3** when your process allows — then plan **NEXT-L3** (`dev` → `main` + prod deploy per runbook).

**If FAIL:** fix on **`dev`**, redeploy staging, re-run this guide; **do not** merge to **`main`** until staging passes.

---

## Common failures (quick fix)

| Symptom | Likely fix |
|---------|------------|
| Cloudflare **502** / **1033** | API or web process down; check pm2/systemd and cloudflared tunnel |
| **Login 401** | Missing seed on host; clear cookies/site data; confirm JWT secrets on staging |
| Checkout fails or stuck **PENDING** | Confirm `GARUD_DEPLOY_ENV=staging`, `rzp_test_…` keys, `RAZORPAY_WEBHOOK_SECRET`; verify webhook URL in Razorpay test dashboard |
| `prisma migrate deploy` fails | Pull latest **`dev`**; resolve migration drift on staging DB only |
| No enquiry email | SMTP optional on staging; verify row in **/admin/enquiries** or API logs |
| Never see **429** on enquiry spam | Throttle is per IP via forwarded headers; try more submits in one minute or check `THROTTLE_ENQUIRY_*` on host |
| Health OK on localhost but not public URL | Tunnel/DNS (`dev.garudhub.me`) or Cloudflare ingress misconfigured |

---

## Local smoke is not staging sign-off

You may rehearse the same **browser steps** on **http://localhost:3001** (see [`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md)). That run **does not** satisfy **NEXT-L2** or **P0-PAY3** unless you explicitly record it as local-only practice. Official sign-off must use **https://dev.garudhub.me** after a **`dev`** deploy with staging env and tunnel/DNS as production-like as your launch path.
