# GarudHub — Client Presentation Runbook

**Audience:** Client stakeholder (Nigmanand)  
**Presentation date:** October 23, 2026  
**Prepared:** October 22, 2026  
**Canonical code baseline:** Branch `feature/task-003-004-payments-workflow` (not `main` — `main` is README-only).  
**Truth docs:** `docs/CODE_LEVEL_STATUS.md`, `docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md`, `docs/DECODE_JWT_SPEC.txt`, `DEMO_ACCOUNTS.md`

---

## 0. One-line message (say this first)

> **GarudHub is India’s B2B drone ecosystem platform.** The **full blueprint** covers marketplace, eight service verticals, partner dashboard, leads, and partnerships. **Phase 1 is live in this build:** verified partner onboarding, moderated catalog, B2B marketplace, RFQ with drone spec comparison, cart/checkout, hybrid payments (Razorpay test + NEFT/UTR), admin trust & GMV — with marketing and lead workflows rolling out next.

Do **not** claim: in-app messaging, partner subscription billing, training batches, government tender module, native enquiry inbox, or full vendor directory.

---

## 1. Presentation narrative (~5 minutes)

### 1.1 Map spec vision → what works today

| Spec pillar (`DECODE_JWT_SPEC.txt`) | Client-facing line | What to show | Honest status |
|-------------------------------------|-------------------|--------------|---------------|
| **“India’s B2B Drone Ecosystem”** | Single platform connecting manufacturers, buyers, distributors, service & training partners | `/about-us`, `/services`, `/b2b-partners` | **Vision on React pages**; home `/` is still legacy HTML snapshot |
| **Marketplace + RFQ** | Find products, verified vendors, post requirements, compare quotes | `/marketplace`, `/buyer/rfqs/*`, `/partner/rfqs/*` | **~75–90%** of commerce RFQ path |
| **Join GarudHub / verification** | Register → documents → admin approve → list | `/auth/register`, `/partner/application`, `/admin` | **Done** for partner KYC |
| **Partner dashboard (12 modules)** | Today: **Products, RFQs, Orders, Documents**; roadmap: Leads, Enquiries, Messages, Analytics, Payments subscription | `/partner`, `/partner/catalog`, `/partner/rfqs`, `/partner/orders` | **~45% UI** vs wireframe — name the four live modules |
| **Eight service verticals** | Ecosystem story + enquiry capture | `/services` sections | **Marketing + legacy enquiry form** — not matched service workflow yet |
| **Payments** | B2B: online (pilot) + bank transfer with admin reconciliation | Checkout modal + `/admin/orders/[id]` UTR verify | **Buyer order pay** works; partner subscription **not built** |

### 1.2 Suggested 5-minute talk track

1. **Hook (30s):** Tagline — *Connect. Partner. Sell. Service. Grow.* Position as **business-generation platform**, not a brochure site.
2. **Ecosystem story (60s):** Walk `/about-us` or `/services` — manufacturer → GarudHub → buyer, plus training/compliance/services as **Phase 2 verticals**.
3. **Trust (60s):** Two gates — partner KYC + listing moderation before anything is public.
4. **Phase 1 live (90s):** Marketplace browse → listing detail → RFQ with **payload, endurance, DGCA** fields → partner quote → buyer comparison → accept → order (priced quotes only).
5. **Commerce (60s):** Cart/checkout for fixed-price SKUs; **Indian B2B** GSTIN/PO; payments pilot (Razorpay test or UTR + admin verify).
6. **Close (30s):** “Blueprint ~half in UI; **commerce spine ~80%** for MVP. Next: native enquiries, lead inbox, one vertical depth, production payments.”

---

## 2. Recommended live demo script (15–20 min)

**Base URL:** `http://localhost:3001`  
**API (if asked):** `http://localhost:3000/api/v1` · Swagger often at `http://localhost:3000/api`  
**Login:** `http://localhost:3001/auth/login`

Use **three incognito windows** (or three browser profiles): **Buyer**, **Partner**, **Admin**. Never mix roles in one profile — JWT is in `localStorage`.

### 2.0 Which marketing URL to open?

| URL | Use in demo? | Notes |
|-----|--------------|-------|
| **`/`** | Optional **30s** | Legacy **HTML snapshot** — rich hero, may feel slightly different nav vs inner React pages. Good for “production parity home.” |
| **`/about-us`, `/services`, `/b2b-partners`** | **Recommended start** | Native React + same **MarketingHeader** as marketplace/admin. Shows spec-aligned storytelling. |
| **Legacy slugs** (blog, old service landings) | **Skip** | 47 snapshot paths — risks broken/old CTAs. |

**Recommended flow:** Start **`/about-us`** → **`/services`** (scroll one pillar) → **`/b2b-partners`** → **`/marketplace`** for transactional demo.

---

### Act A — Public marketplace (3 min) — no login

1. Open `http://localhost:3001/marketplace`.
2. Switch section tabs (products / categories as implemented).
3. Open **Garud AgriSpray X1** (SKU `GD-AGRI-X1`) — listing detail: specs, price ₹2,85,000, partner link.
4. **Optional:** Open partner storefront from listing → `/marketplace/partners/[orgId]`.
5. **Say:** “Search and vendor index are on the roadmap; browse and moderation-backed catalog are live.”

**Expected:** Approved listings from seed; images load; **Add to cart** visible only after buyer login.

---

### Act B — Buyer: checkout path (5 min) — incognito #1

| Field | Value |
|-------|--------|
| Email | `checkout-test@garudhub.local` |
| Password | `ChangeMeDemo123!` |

1. Login → lands on marketplace (or use header).
2. **Garud AgriSpray X1** → quantity ≥ 1 → **Add to cart**.
3. Header: **My Orders** / cart path → `http://localhost:3001/buyer/cart`.
4. Proceed → `http://localhost:3001/buyer/checkout` — saved address, GSTIN/PO if shown.
5. Place order → **PaymentGatewayModal**.

**Payments branch:**

| Condition | What to do | What client sees |
|-----------|------------|------------------|
| **`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` set** in `backend/.env` (test keys) | Choose Razorpay; complete test payment | Live gateway test checkout |
| **Keys missing or API fails** | Backend **falls back to sandbox** — still demo-able | Explain: “Test keys; production keys next.” Complete sandbox flow if UI allows |
| **Prefer B2B story** | On order detail → **Bank transfer / UTR** → submit sample UTR | Switch to **Admin** window to verify (Act D) |

6. `http://localhost:3001/buyer/orders` → open order → **OrderProgressStepper**, transactions.

**Expected:** Single-vendor cart; order `CONFIRMED`; payment `PENDING` or `PAID` depending on path.

---

### Act C — Buyer RFQ “Phase 3” (5–7 min) — same buyer or `buyer@garudhub.local`

**Impressive spec-aligned block — prioritize if time is short.**

1. While logged in as buyer: `http://localhost:3001/buyer/rfqs/new` (or header **Marketplace → Post B2B Drone RFQ**).
2. Create RFQ with **drone spec fields:** payload (kg), endurance (min), DGCA required, budget, optional specs doc URL.
3. `http://localhost:3001/buyer/rfqs` — new RFQ **OPEN**.

**Switch to incognito #2 — Partner**

| Field | Value |
|-------|--------|
| Email | `partner@garudhub.local` |
| Password | `ChangeMeDemo123!` |

4. `http://localhost:3001/partner/rfqs` → open invite → submit **priced** quotation (include quoted payload/endurance/DGCA/warranty if form shows).
5. Back to **Buyer** window: `http://localhost:3001/buyer/rfqs/[id]` → **comparison matrix**.
6. **Accept** a priced quote → **creates order** → show in `/buyer/orders`.

**Say explicitly:** Price-on-request quotes **cannot** accept-to-order yet — use fixed price on quote.

**If no invite appears:** Partner org must be **verified** (seed is); category match drives invites — create RFQ category aligned with partner listings (e.g. agriculture drone).

---

### Act D — Partner catalog + admin moderation (3 min)

**Partner window (continued):**

1. `http://localhost:3001/partner` — onboarding checklist / verified badge.
2. `http://localhost:3001/partner/catalog/new` — create draft listing → **Submit for review** (do **not** publish unmoderated listing in front of client unless you pre-clear).

**Admin — incognito #3**

| Field | Value |
|-------|--------|
| Email | `admin@garudhub.local` |
| Password | `ChangeMeAdmin123!` (from `backend/.env` / `.env.example`) |

3. `http://localhost:3001/admin` — pending partner applications (mention queue; may be empty if all approved).
4. `http://localhost:3001/admin/listings` — approve pending listing from Act D.
5. `http://localhost:3001/admin/orders` — GMV header, open order from Act B/C → **UTR verify** if bank transfer used; cancel only if you intend to show dispute flow.

**Partner fulfillment (optional 2 min):** `http://localhost:3001/partner/orders/[id]` → update fulfillment, tracking URL → buyer sees stepper update.

---

### Act E — Registration story (1 min, optional)

- `http://localhost:3001/auth/register?type=partner` — account types match spec enum.
- **Do not** complete a new registration live unless DB is disposable — say verification is admin-gated.

---

### Demo timing cheat sheet

| Segment | Min | Skip if rushed |
|---------|-----|----------------|
| Marketing (`/about-us` + `/services`) | 2 | Keep 1 slide instead |
| Marketplace browse | 2 | — |
| Checkout + payment/UTR | 5 | Razorpay → UTR only |
| RFQ Phase 3 + accept → order | 6 | **Keep — best spec alignment** |
| Partner catalog + admin approve | 3 | Show admin orders only |
| Fulfillment | 2 | Mention verbally |

---

## 3. Do NOT show / risk areas

| Risk | Why | What happens |
|------|-----|--------------|
| **`/enquiry.php`** | Legacy snapshot + POST proxy to **production** PHP | Feels “scattered”; leaves platform; may fail offline or write real prod leads |
| **Service CTAs on `/services`** | Most go to **`/enquiry.php?service=...`** | Same as above — **describe** “Phase 2 native enquiry,” don’t click |
| **Listing “Send enquiry”** | Links to `/enquiry.php?subject=...` | Skip — use RFQ or cart instead |
| **Logged in as wrong role** | Cart/RFQ/admin routes are role-gated | 403 or confusing redirects — use separate incognito profiles |
| **Partner expecting Leads / Messages / Analytics sidebar** | **No routes** in app | 404 or dead expectations — stay on Catalog, RFQs, Orders |
| **“Request product demo”** | **Not implemented** on PDP | Missing CTA vs spec |
| **`/marketplace/vendors` (vendor directory)** | **Not built** | Only `/marketplace/partners/[orgId]` storefront |
| **Blog / random snapshot URLs** | Old nav, mixed link localization | Visual inconsistency |
| **`main` branch checkout** | Empty product | “Project not started” — always demo **feature branch** |
| **README.md claims** | Stale (Oct 20, `main` commit) | RFQ→order **is** implemented; don’t read README verbatim |
| **Cash on delivery** | Enum only | No UI |
| **Multi-vendor cart** | Single vendor enforced | Adding second vendor → error — don’t demo |
| **Mobile menu “Contact Us” → enquiry.php** | Same legacy trap | Avoid opening mobile menu CTA |
| **Uncommitted WIP** | Marketing pages may differ machine-to-machine | Rehearse on **your** laptop after pull + commit decision |

---

## 4. Pre-demo technical checklist (tonight + morning)

### Tonight (full rehearsal — ~45–60 min)

- [ ] **Git:** On `feature/task-003-004-payments-workflow`; `git pull`; note uncommitted marketing files — **present from this tree only**.
- [ ] **Docker:** From repo root: `docker compose up -d` — Postgres on host port **5434**.
- [ ] **Backend env:** Copy `backend/.env.example` → `backend/.env` if needed. Set:
  - `DATABASE_URL` (matches docker compose user/db)
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `DEMO_PASSWORD`
  - Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (test mode)
- [ ] **Migrate + seed:**  
  `cd backend && npm install && npm run prisma:migrate && npm run prisma:seed`
- [ ] **Start API:** `npm run start:dev` — health: `GET http://localhost:3000/api/v1/health`
- [ ] **Frontend:** `cd frontend && npm install && npm run dev` — **http://localhost:3001**
- [ ] **Smoke test accounts:** Login all three roles per `DEMO_ACCOUNTS.md`.
- [ ] **Run golden path once:** AgriSpray cart → checkout → order; RFQ new → partner quote → accept.
- [ ] **Payments decision:** If Razorpay test keys work, run one test payment; else script **UTR + admin verify** only.
- [ ] **Browser hygiene:** Clear `localStorage` keys `garud_access_token`, `garud_refresh_token` OR use fresh incognito profiles labeled Buyer / Partner / Admin.
- [ ] **Network:** Presentation machine on stable power; disable sleep; close unrelated apps.
- [ ] **Optional backend tests:** `cd backend && npm test` (unit) — not required for demo but catches regressions.

### Morning of presentation (~15 min)

- [ ] `docker compose up -d` + confirm postgres healthy
- [ ] Start backend + frontend (same terminals as rehearsal)
- [ ] Open three incognito windows to login URLs (pre-type bookmarks)
- [ ] Open tabs: `/about-us`, `/marketplace`, `/admin/orders` (admin logged in)
- [ ] Verify **Garud AgriSpray X1** visible on marketplace
- [ ] Phone/laptop **Do Not Disturb**

### If something breaks 5 min before

1. Restart frontend + backend (keep DB).
2. Re-login all profiles.
3. Fall back to **pre-recorded screenshots** + narrative from §1 (keep laptop on `/marketplace`).

---

## 5. Quick wins (impact vs hours) — before vs after presentation

**Budget:** ~4–6 hours total realistic tonight.

| Priority | Task | Impact | Effort | When |
|----------|------|--------|--------|------|
| **P0** | **Full demo dry-run** on feature branch + document tab bookmarks | Prevents live embarrassment | 1 h | **Tonight must** |
| **P0** | **`migrate + seed` + verify AgriSpray + partner verified** | Catalog empty = dead demo | 0.5 h | **Tonight must** |
| **P0** | **Three incognito profiles + scripted RFQ quote** (create RFQ tonight; partner quote so buyer screen shows matrix **before** client) | RFQ segment reliable | 1 h | **Tonight must** |
| **P0** | **Commit or stash WIP** (`about-us`, `services`, `b2b-partners`, header) so demo machine matches rehearsal | Nav jumps / missing pages | 0.5–1 h | **Tonight must** |
| **P1** | **Wire `CartNavLink` in `MarketingHeader`** (import exists, unused) | Buyer finds cart faster | 0.5 h | **Nice** |
| **P1** | **Hide/skip enquiry CTAs in demo script only** (no code) | Cohesion | 0 h | **Tonight must** (process) |
| **P1** | **`/services` marketplace pillar CTA → `/marketplace` or `/buyer/rfqs/new`** instead of enquiry (one link) | One less broken journey | 0.5 h | **Nice** |
| **P2** | **DB reset + fresh seed** (`prisma migrate reset` — destructive) | Clean orders/RFQ state | 0.5 h | **Nice** if data messy |
| **P2** | **Merge feature → main** | Client repo clarity | 2–4 h | **After presentation** |
| **P2** | Native enquiry API + admin queue | Spec alignment | 2–3 d | **After presentation** |
| **P3** | PlatformShell for `/partner`, `/buyer`, `/admin` | Less marketing chrome on ops | 4–8 h | **After presentation** |
| **P3** | Marketplace search API | Spec browse | 1–2 d | **After presentation** |

---

## 6. Slide outline (8–10 bullets) — slides vs live

Use slides for **vision and roadmap**; live demo for **proof**.

1. **Title:** GarudHub — India’s B2B Drone Ecosystem · *Connect. Partner. Sell. Service. Grow.*
2. **Problem:** Fragmented drone B2B in India — trust, procurement, distribution.
3. **Vision (spec):** One platform — marketplace, 8 services, partners, RFQ, leads (diagram from spec ecosystem).
4. **Phase 1 delivered (honest):** Verified partners · moderated catalog · marketplace · RFQ w/ drone specs · cart/checkout · payments pilot · admin GMV.
5. **Trust model:** KYC + listing moderation (two gates) — *show admin slide screenshot optional*.
6. **Who it’s for:** Manufacturers, buyers, gov, distributors — account types on register screen.
7. **Live demo agenda:** Marketplace → RFQ compare → order → payment/reconciliation — *switch to laptop*.
8. **Phase 2 (next 4–8 weeks):** Native enquiries & lead inbox · email notifications · production Razorpay · one service vertical workflow · vendor discovery/search.
9. **Not in Phase 1:** Messaging, partner subscriptions, training batches, tender portal — explicitly listed to manage expectations.
10. **Ask / next steps:** Feedback on Phase 2 priority (services vs leads vs gov); deployment timeline; payment go-live requirements.

---

## 7. FAQ — likely client questions + honest answers

| Question | Honest answer |
|----------|---------------|
| “Is the full ecosystem live?” | **Vision is documented; Phase 1 is the commerce + RFQ spine.** Eight service verticals are represented on `/services`; operational workflows roll out phase-by-phase. |
| “Can service providers get matched jobs?” | **Not yet.** They can register and list **service-type catalog items**; buyers use RFQ/enquiry. Service matching is Phase 2. |
| “Do training institutes manage batches?” | **No.** Training is marketing + listings category; no courses/batches/leads model. |
| “Government tenders?” | **Gov buyer role** can use cart/RFQ like enterprise; **no tender/scheme module.** |
| “Where do enquiries go?” | **Legacy form** (`/enquiry.php`) proxied to existing site — **not** in partner dashboard yet. Native enquiry is prioritized post-demo. |
| “Is RFQ connected to orders?” | **Yes** for **priced** quotations — accept creates an order. Price-on-request quotes need manual follow-up today. |
| “Payments production-ready?” | **Pilot:** Razorpay test + NEFT/UTR with admin verification. Production keys, webhooks on public URL, and hardening are next. |
| “Why does home look different from marketplace?” | **Hybrid migration:** home is production HTML snapshot; flagship pages and platform are React — converging. |
| “Can one cart have multiple vendors?” | **No** — single-vendor cart by design for Phase 1. |
| “Data security / auth?” | JWT with refresh; tokens in **localStorage** today — **httpOnly cookies** on security roadmap. |
| “When can we go live?” | After merge, hosting, S3/durable uploads, production payments, and enquiry native — **estimate after Phase 2 scope sign-off** (not tonight). |
| “What’s on GitHub `main`?” | **Not representative** — active platform is on the feature branch until merge. |

---

## 8. After presentation — one week roadmap (5 bullets)

1. **Merge `feature/task-003-004-payments-workflow` → `main`** with migration runbook; tag release `v0.1-demo` for client re-test.
2. **Native enquiry v1:** Prisma `Enquiry` model, Nest POST, admin list — replace demo dependency on `/enquiry.php` for new leads.
3. **Demo data + ops:** Seed script adds sample RFQ with two quotes; document `DEMO_ACCOUNTS.md` in client handoff pack.
4. **Notifications (minimal):** Email on KYC approve, RFQ quote received, order placed (SendGrid/Resend stub).
5. **Client priority pick:** One vertical (**training leads** *or* **service request matching** *or* **marketplace search + vendors index**) scoped for Phase 2 sprint with dated milestone.

---

## Appendix A — Role redirect reference

| Role | After login | Primary demo URLs |
|------|-------------|-------------------|
| `PLATFORM_ADMIN` | `/admin` | `/admin`, `/admin/listings`, `/admin/orders` |
| `PARTNER` | `/partner` | `/partner/catalog`, `/partner/rfqs`, `/partner/orders` |
| `BUYER` / `GOVERNMENT` | `/marketplace` | `/buyer/cart`, `/buyer/rfqs`, `/buyer/orders` |

Login: `http://localhost:3001/auth/login`

---

## Appendix B — Key listing for checkout demo

| Product | SKU | Price | Partner org |
|---------|-----|-------|-------------|
| Garud AgriSpray X1 | `GD-AGRI-X1` | ₹2,85,000 fixed | Demo Drone Manufacturing (`partner@garudhub.local`) |

---

*Rehearse this runbook once end-to-end before the client call. Update after merge to `main` or when routes change — regenerate from `docs/CODE_LEVEL_STATUS.md`.*
