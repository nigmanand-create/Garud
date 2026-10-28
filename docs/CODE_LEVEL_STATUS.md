# GarudHub — Code-Level Current Status

**Generated:** 2026-10-22 (filesystem + git verified)  
**Repository:** `/Users/blackstar/Desktop/dev/client/garud`  
**Supersedes:** `docs/PROJECT_STATUS_DETAILED.md` (2026-10-20) — treat that file as stale for route counts, migrations, RFQ→order, fulfillment, and marketing mix.

**Method:** Glob of all `frontend/app/(platform)/**/page.tsx`, grep of NestJS `@Controller` + HTTP decorators, full `schema.prisma` read, chronological `prisma/migrations/*`, `git status` / `git diff --stat origin/main`, and spot-read of key UI modules (`PaymentGatewayModal`, `AdminSubnav`, RFQ buyer detail).

---

## 1. Executive Summary (vs `PROJECT_STATUS_DETAILED.md`)

GarudHub remains a **single-origin Next.js app (:3001)** plus **NestJS API (:3000, prefix `api/v1`)** on PostgreSQL. The product surface is materially ahead of the Oct-20 status doc.

### What changed since the old detailed summary

| Area | Old doc claim | Code today |
|------|---------------|------------|
| Platform `page.tsx` count | **30** routes | **33** under `app/(platform)/` (+3 native React marketing pages) |
| DB migrations | **8** folders | **11** SQL migrations (see §5) |
| RFQ → Order | Listed as **remaining work** (“Accept Quote → Create Order”) | **Implemented:** `POST /rfq/:id/quotations/:quotationId/accept` creates order; buyer UI `handleAcceptQuotation` on `/buyer/rfqs/[id]` |
| Order / fulfillment | Basic partner PATCH | **Extended:** carrier, tracking URL, serial numbers, ETA, dispatched/delivered timestamps; UI stepper + `ShipmentTrackingCard` |
| RFQ “Phase 3” drone specs | Not documented | **Schema + UI:** payload kg, endurance, DGCA flag, budget, specs doc URL on `Rfq`; quoted payload/endurance/DGCA/warranty on `Quotation`; comparison badges on buyer RFQ detail |
| Payments | Described as complete | Still **Razorpay + NEFT/RTGS UTR + admin verify**; **`CASH_ON_DELIVERY` enum only** — no controller/UI path |
| Admin order sub-routes | Separate cancel/payment pages | **`/admin/orders/[id]/cancel` and `/payment` are redirects** to unified `/admin/orders/[id]` (dispute + payment on one screen) |
| Marketing | Snapshots only, “Partial” | **Hybrid:** ~47 HTML snapshots via `app/[...slug]/route.ts` + **new React** `/about-us`, `/services`, `/b2b-partners` (under `(platform)` layout with `MarketingShell`) — **last three uncommitted at report time** |
| Tests | Compile checks only | **`orders.service.spec.ts`**, **`payments.service.spec.ts`**, **`rfq.service.spec.ts`**, **`test/e2e-workflow.e2e-spec.ts`** on feature branch |
| Git baseline | Implied `main` | Active work on **`feature/task-003-004-payments-workflow`** (~99 files vs `origin/main`, +15k LOC) |

### Major inaccuracies in `PROJECT_STATUS_DETAILED.md` (fix mentally when reading it)

1. **Route count 30** — missing `/about-us`, `/services`, `/b2b-partners`.
2. **Migration count 8** — omits listing media, moderation, payments, fulfillment, RFQ-order link, fulfillment tracking, RFQ drone specs migrations.
3. **RFQ accept → order** — incorrectly listed under “Remaining Work” for buyers; backend + frontend exist.
4. **Admin cancel/payment URLs** — documented as full pages; code uses **redirect stubs** only.
5. **Marketing “snapshots only”** — header/footer and three flagship pages are **React** inside `(platform)`; snapshots still serve `/`, legacy service landings, blog, legal, etc.
6. **Data model table** — omits **Order** fields (`rfqId`, `quotationId`, logistics columns) and **Rfq/Quotation Phase 3** columns.
7. **Payment “Complete”** — **COD** is type-level only, not a payment flow.
8. **Date frozen Oct 20** — Oct 22 migrations and RFQ Phase 3 commit (`9e72591`) not reflected.
9. **“50 static pages”** — manifest currently **47** snapshot keys in `content/pages/manifest.json`.
10. **Branch strategy** — doc reads like production-ready `main`; substantial feature work lives on **feature branch** with local WIP.

---

## 2. Platform Routes (verified from filesystem)

All paths are served under the `(platform)` route group (no URL prefix). Layout: `AuthProvider` + `MarketingShell` + shared marketing CSS.

| Route | Purpose (from imports/handlers) |
|-------|----------------------------------|
| `/auth/login` | JWT login; role-based redirect (`redirectPathForRole`) |
| `/auth/register` | Multi–account-type registration; query `?type=partner` support |
| `/about-us` | **React marketing:** industries hero, ecosystem narrative, CTAs to marketplace/register |
| `/services` | **React marketing:** 8 ecosystem service pillars with anchor sections (`#training`, `#finance`, …) |
| `/b2b-partners` | **React marketing:** partner types (OEM, dealers, training, etc.) + register CTA |
| `/marketplace` | Public catalog shell; delegates to `MarketplaceClient` (section tabs, API `GET /marketplace/listings`) |
| `/marketplace/listings/[id]` | Listing detail, specs, add-to-cart (`addToCart`) |
| `/marketplace/partners/[orgId]` | Public partner storefront profile |
| `/buyer/cart` | Cart CRUD via cart API; qty update, clear, checkout link |
| `/buyer/checkout` | Saved address prefill, place order, **`PaymentGatewayModal`** post-place |
| `/buyer/orders` | Buyer order list (`OrderListItem`) |
| `/buyer/orders/[id]` | Order detail, payment modal, **`OrderProgressStepper`**, transactions |
| `/buyer/rfqs` | Buyer RFQ inbox |
| `/buyer/rfqs/new` | Create RFQ with Phase 3 spec fields |
| `/buyer/rfqs/[id]` | Quotations list, **comparison matrix**, accept/reject/close/cancel |
| `/partner` | Partner dashboard, onboarding checklist, verification badge |
| `/partner/application` | KYC profile PATCH + submit |
| `/partner/documents` | Upload/list/delete/download org documents |
| `/partner/catalog` | Listing table, review status, submit-for-review |
| `/partner/catalog/new` | Create listing + image upload + live preview patterns |
| `/partner/catalog/[id]` | Edit, submit for review, delete listing |
| `/partner/orders` | Vendor order queue |
| `/partner/orders/[id]` | Order detail + **`PartnerOrderFulfillmentPanel`** |
| `/partner/rfqs` | RFQ invite inbox |
| `/partner/rfqs/[id]` | View RFQ specs, submit/withdraw quotation, decline invite |
| `/admin` | Partner application queue (KYC) |
| `/admin/applications/[id]` | Approve/reject application, document download |
| `/admin/listings` | Listing moderation queue + status filters; **`AdminSubnav`** |
| `/admin/listings/[id]` | Approve/reject/unpublish + moderation audit log |
| `/admin/orders` | GMV metrics, filters, search; **`AdminSubnav`** |
| `/admin/orders/[id]` | Full order inspect, cancel, payment override, **UTR verify** |
| `/admin/orders/[id]/cancel` | **Redirect** → `/admin/orders/[id]` |
| `/admin/orders/[id]/payment` | **Redirect** → `/admin/orders/[id]` |

### Marketing outside `(platform)` pages

| Mechanism | Path | Purpose |
|-----------|------|---------|
| `app/route.ts` | `/` | HTML snapshot home from `content/pages/` |
| `app/[...slug]/route.ts` | e.g. `/blogging/*`, `/legal.php/*`, legacy PHP-style URLs | Snapshot HTML via `loadSnapshotHtml` |
| `app/enquiry.php/route.ts` | Legacy enquiry entry | Routes to enquiry handling |
| `app/platform-api/v1/[...path]/route.ts` | `/platform-api/v1/*` | Next proxy to backend API |

**Note:** React routes `/about-us`, `/services`, `/b2b-partners` **take precedence** over snapshot keys for those paths when registered under `(platform)` (Next route resolution). Other marketing URLs remain snapshots.

---

## 3. Backend API Map (by module)

Global prefix: **`/api/v1`**. Swagger enabled via `setupSwagger`.

### Health

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | Public | Liveness |

### Identity — `@Controller('auth')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| POST | `/auth/register` | Public | Creates user + org |
| POST | `/auth/login` | Public | JWT access + refresh |
| POST | `/auth/refresh` | Public | Token rotation |
| POST | `/auth/logout` | Auth | Revoke refresh |
| GET | `/auth/me` | Auth | Current user + org hints |

### Partner — `@Controller('partner')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/partner/me` | PARTNER | Profile + verification |
| PATCH | `/partner/application` | PARTNER | Draft KYC fields |
| POST | `/partner/application/submit` | PARTNER | Submit for review |

### Documents — `@Controller('partner/documents')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/partner/documents` | PARTNER | List metadata |
| POST | `/partner/documents` | PARTNER | Multipart upload |
| DELETE | `/partner/documents/:id` | PARTNER | Remove file |
| GET | `/partner/documents/:id/download` | PARTNER | Stream download |

### Catalog — partner `@Controller('partner/catalog/listings')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/partner/catalog/listings` | Verified partner | Own listings |
| POST | `/partner/catalog/listings` | Verified partner | Create |
| GET | `/partner/catalog/listings/:id` | Verified partner | Detail |
| PATCH | `/partner/catalog/listings/:id` | Verified partner | Update |
| DELETE | `/partner/catalog/listings/:id` | Verified partner | Delete |
| POST | `/partner/catalog/listings/:id/submit-for-review` | Verified partner | → `PENDING_REVIEW` |
| POST | `/partner/catalog/listings/images` | Verified partner | Image upload |

### Catalog — media `@Controller('media/listings')`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/media/listings/:orgId/:fileName` | Public | Disk streaming |

### Catalog — marketplace `@Controller('marketplace')`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/marketplace/listings` | Public | Approved + published only; filters |
| GET | `/marketplace/listings/:id` | Public | Detail |
| GET | `/marketplace/partners/:orgId` | Public | Partner public profile |

### Commerce — cart `@Controller('buyer/cart')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/buyer/cart` | BUYER, GOVERNMENT | Single-vendor cart |
| POST | `/buyer/cart/items` | BUYER, GOVERNMENT | Add line (409 if vendor mix) |
| PATCH | `/buyer/cart/items/:itemId` | BUYER, GOVERNMENT | Qty |
| DELETE | `/buyer/cart/items/:itemId` | BUYER, GOVERNMENT | Remove line |
| DELETE | `/buyer/cart` | BUYER, GOVERNMENT | Clear cart |

### Commerce — checkout `@Controller('buyer/checkout')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/buyer/checkout/saved-address` | BUYER, GOVERNMENT | Pre-fill from org |
| POST | `/buyer/checkout/place` | BUYER, GOVERNMENT | Create order from cart |

### Commerce — buyer orders `@Controller('buyer/orders')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/buyer/orders` | BUYER, GOVERNMENT | List |
| GET | `/buyer/orders/:id` | BUYER, GOVERNMENT | Detail + transactions |

### Commerce — partner orders `@Controller('partner/orders')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/partner/orders` | PARTNER | Vendor list |
| GET | `/partner/orders/:id` | PARTNER | Detail |
| PATCH | `/partner/orders/:id/fulfillment` | PARTNER | Status + logistics payload |

### Payments — `@Controller('payments')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| POST | `/payments/intent` | BUYER, GOVERNMENT, ADMIN | Razorpay / sandbox intent |
| POST | `/payments/verify-razorpay` | BUYER, GOVERNMENT, ADMIN | Signature verify → PAID |
| POST | `/payments/bank-transfer` | BUYER, GOVERNMENT, ADMIN | Submit UTR (global uniqueness enforced) |
| GET | `/payments/order/:orderId` | Auth | Transaction ledger |
| POST | `/payments/admin/verify-utr` | PLATFORM_ADMIN | Approve/reject UTR |
| POST | `/payments/webhook` | Public (signed) | Razorpay webhook |

### RFQ — buyer `@Controller('rfq')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| POST | `/rfq` | BUYER, GOVERNMENT | Create + auto-invite vendors |
| GET | `/rfq` | BUYER, GOVERNMENT | List own RFQs |
| GET | `/rfq/:id` | BUYER, GOVERNMENT | Detail |
| GET | `/rfq/:id/quotations` | BUYER, GOVERNMENT | Compare quotes |
| POST | `/rfq/:id/quotations/:quotationId/accept` | BUYER, GOVERNMENT | **Creates order** |
| POST | `/rfq/:id/quotations/:quotationId/reject` | BUYER, GOVERNMENT | Reject quote |
| POST | `/rfq/:id/close` | BUYER, GOVERNMENT | Close RFQ |
| POST | `/rfq/:id/cancel` | BUYER, GOVERNMENT | Cancel RFQ |

### RFQ — partner `@Controller('partner/rfqs')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/partner/rfqs` | PARTNER | Invites |
| GET | `/partner/rfqs/:id` | PARTNER | Invite + RFQ detail |
| POST | `/partner/rfqs/:id/quotations` | PARTNER | Submit quote |
| POST | `/partner/rfqs/:id/decline` | PARTNER | Decline invite |
| POST | `/partner/rfqs/quotations/:quotationId/withdraw` | PARTNER | Withdraw quote |

### Admin — `@Controller('admin')`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/admin/applications` | ADMIN | KYC queue |
| GET | `/admin/applications/:id` | ADMIN | Detail |
| GET | `/admin/documents/:id/download` | ADMIN | Org doc download |
| POST | `/admin/applications/:id/approve` | ADMIN | KYC approve |
| POST | `/admin/applications/:id/reject` | ADMIN | KYC reject |
| GET | `/admin/listings` | ADMIN | Moderation queue |
| GET | `/admin/listings/:id` | ADMIN | Listing detail + logs |
| POST | `/admin/listings/:id/approve` | ADMIN | Publish gate |
| POST | `/admin/listings/:id/reject` | ADMIN | Reject with reason |
| POST | `/admin/listings/:id/unpublish` | ADMIN | Unpublish |
| GET | `/admin/orders` | ADMIN | Orders + GMV metrics |
| GET | `/admin/orders/:id` | ADMIN | Order detail |
| POST | `/admin/orders/:id/cancel` | ADMIN | Dispute cancel |
| POST | `/admin/orders/:id/payment` | ADMIN | Manual payment status |

---

## 4. Data Model Map (Prisma)

**15 models, 15 enums** in `backend/prisma/schema.prisma`.

### Enums

| Enum | Values | Notes |
|------|--------|-------|
| `UserRole` | PLATFORM_ADMIN, PARTNER, BUYER, GOVERNMENT | |
| `AccountType` | 10 B2B account types | Manufacturer → GOVERNMENT_PSU |
| `VerificationStatus` | DRAFT → REJECTED | Partner KYC |
| `ApplicationDocumentType` | GST, CIN, etc. | |
| `ListingType` | PRODUCT, SERVICE | |
| `ListingReviewStatus` | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, UNPUBLISHED | Moderation gate |
| `CatalogCategory` | 11 drone/commerce categories | |
| `OrderStatus` | CONFIRMED, CANCELLED | |
| `FulfillmentStatus` | PENDING, PROCESSING, SHIPPED, FULFILLED | |
| `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED | |
| `PaymentGateway` | RAZORPAY, BANK_TRANSFER_NEFT_RTGS, **CASH_ON_DELIVERY** | COD unused in services |
| `TransactionStatus` | CREATED → REFUNDED | Payment ledger |
| `RfqStatus` | OPEN, CLOSED, CANCELLED | |
| `RfqInviteStatus` | INVITED, QUOTED, DECLINED | |
| `QuotationStatus` | SUBMITTED, WITHDRAWN, ACCEPTED, REJECTED | |

### Models (highlights / deltas since commerce baseline)

| Model | Table | Key responsibilities |
|-------|-------|----------------------|
| `User` | `users` | Auth, role, cart, orders, RFQs |
| `RefreshToken` | `refresh_tokens` | Hashed refresh rotation |
| `Organization` | `organizations` | KYC entity, listings, RFQ, orders both sides |
| `VerificationAuditLog` | `verification_audit_logs` | KYC transitions |
| `OrganizationDocument` | `organization_documents` | KYC files |
| `PartnerListing` | `partner_listings` | Catalog + `reviewStatus`, SKU, media URLs |
| `ListingModerationAuditLog` | `listing_moderation_audit_logs` | Admin listing actions |
| `Cart` / `CartItem` | `carts`, `cart_items` | Single vendor per cart |
| `Order` | `orders` | **+** `rfqId`, `quotationId`; **+** logistics: carrier, tracking, serials, fulfillment notes, timestamps |
| `OrderLineItem` | `order_line_items` | Price snapshots + optional `listingId` |
| `PaymentTransaction` | `payment_transactions` | Razorpay IDs, UTR, advisory-lock uniqueness |
| `Rfq` | `rfqs` | **Phase 3:** payloadCapacityKg, enduranceMinutes, isDgcaRequired, targetBudgetInr, specsDocumentUrl |
| `RfqInvite` | `rfq_invites` | Vendor invites |
| `Quotation` | `quotations` | **Phase 3:** quotedPayloadKg, quotedEnduranceMin, dgcaModelNumber, warrantyMonths |

### Migrations (chronological folder names)

1. `20260930220606_init`
2. `20260930221515_phase_b_documents_catalog`
3. `20260930223527_phase_c_rfq`
4. `20261006165823_phase2_cart_orders`
5. `20261006120000_listing_media_sku`
6. `20261007084251_order_fulfillment_and_listing_media`
7. `20261012120000_listing_moderation`
8. `20261012145714_add_payment_transactions`
9. `20261022015012_rfq_to_order_link`
10. `20261022022904_order_fulfillment_tracking`
11. `20261022032400_rfq_drone_rfp_specs`

---

## 5. Feature Matrix

| Feature | Primary files | Status | Notes |
|---------|---------------|--------|-------|
| JWT auth + roles | `identity/*`, `AuthProvider.tsx` | **Done** | Tokens in **localStorage** (not httpOnly cookies) |
| Partner KYC | `partner/*`, `/admin/applications/*` | **Done** | Audit log DB-only |
| Listing moderation | `admin.service.ts`, `/admin/listings/*`, `ListingReviewStatus` | **Done** | Dual gate: review + `isPublished` |
| Partner catalog studio | `/partner/catalog/*`, `partner-catalog.controller.ts` | **Done** | Submit-for-review, images |
| Marketplace | `marketplace.controller.ts`, `MarketplaceClient.tsx` | **Done** | Section tabs; **no full-text search API** |
| Cart / checkout | `cart.service.ts`, `/buyer/cart`, `/buyer/checkout` | **Done** | Single vendor; saved address |
| Payments Razorpay | `payments.service.ts`, `PaymentGatewayModal.tsx`, `lib/api/payments.ts` | **Done** | Test/sandbox + webhook |
| UTR bank transfer | `payments.service.ts`, TASK-003 report | **Done** | Global UTR uniqueness + admin verify |
| Admin orders + GMV | `/admin/orders/*`, `AdminOrderListItem` types | **Done** | Cancel + payment on detail page |
| Order fulfillment | `partner-orders.controller.ts`, `PartnerOrderFulfillmentPanel.tsx`, `OrderProgressStepper.tsx` | **Done** | Tracking + serials |
| RFQ lifecycle | `rfq.service.ts`, buyer/partner RFQ pages | **Done** | Hardened deadlines (TASK-005) |
| RFQ Phase 3 specs | `rfq.dto.ts`, `/buyer/rfqs/new`, partner quote form | **Done** | Comparison UI on buyer detail |
| RFQ → Order | `rfq.service acceptQuotation`, buyer accept handler | **Done** | Requires priced quote (not POR) |
| Admin subnav | `AdminSubnav.tsx` | **Done** | Applications / listings / orders |
| Marketing React pages | `/about-us`, `/services`, `/b2b-partners` | **WIP (uncommitted)** | Replace snapshot equivalents for nav CTAs |
| Marketing snapshots | `[...slug]/route.ts`, `content/pages/` | **Done** | 47 manifest paths |
| Marketing header/footer | `MarketingHeader.tsx`, `MarketingFooter.tsx` | **Modified (uncommitted)** | Mega menus point to React routes |
| E2E workflow test | `backend/test/e2e-workflow.e2e-spec.ts` | **Done** | Multi-role path |
| User admin CRUD | — | **Not started** | Seed/register only |
| COD payments | enum only in schema/types | **Not started** | |
| Audit log UI | partial on listing detail | **Partial** | No global audit viewer |
| httpOnly cookies | — | **Not started** | Documented gap |

### Frontend API types (`frontend/lib/api/types.ts`) — notable exports

New or expanded since early commerce docs:

- Moderation: `ListingReviewStatus`, `ListingModerationAuditLog`, `AdminListingSummary`, `AdminListingsResponse`, `AdminListingDetail`
- Payments: `PaymentGateway`, `TransactionStatus`, `PaymentTransaction`
- Admin orders: `AdminOrderListItem`, `AdminOrdersResponse`, `AdminOrderDetail` (incl. `transactions`)
- Orders: extended `OrderDetail` (RFQ link, logistics, `transactions`, line item thumbnails)
- Fulfillment: `UpdateOrderFulfillmentPayload`
- RFQ Phase 3: `PartnerQuotation` (+ payload/endurance/DGCA/warranty), `PartnerRfqInviteDetail` (+ buyer spec fields)

---

## 6. WIP / Uncommitted / Branch Strategy

**Current branch:** `feature/task-003-004-payments-workflow` @ `9e72591`  
**Tracking:** `origin/feature/task-003-004-payments-workflow`  
**`main`:** `1048262` (root README only — feature branch is far ahead)

### Uncommitted at report time (`git status -sb`)

- **Modified:** `docs/ADMIN_P0_PLAN.md`, auth login/register, `(platform)/layout.tsx`, marketplace client + listing detail, `platform.css`, marketing header/footer/site config
- **Untracked:** `docs/DECODE_JWT_SPEC.txt`, `frontend/app/(platform)/about-us/`, `b2b-partners/`, `services/`

### Diff vs `origin/main` (high level)

~**99 files**, **+15,047 / −1,044** lines — includes payments module, admin listings/orders UI, RFQ Phase 3, fulfillment UI, tests, seed extensions, migrations, and large README.

**Suggested merge strategy:** Finish marketing React pages + header alignment → run backend unit + e2e tests → PR feature branch → `main` with migration runbook.

---

## 7. Gaps Still Open (code-verified)

1. **httpOnly cookie auth** — still `localStorage` in `AuthProvider`.
2. **Marketplace search / pagination** — client filters by section/category only; no server full-text search.
3. **COD (`CASH_ON_DELIVERY`)** — enum present; no `payments` handler or UI.
4. **Admin user/role management** — no routes or pages.
5. **Dedicated audit log viewer** — logs written for KYC + listings; limited UI surfacing.
6. **Price-on-request RFQ accept** — accept path **rejects** quotes without numeric price.
7. **Marketing migration** — majority of site still HTML snapshots; only 3 flagship React pages (+ WIP).
8. **Production Razorpay** — test/sandbox patterns; webhook secret env-dependent.
9. **Separate admin cancel/payment screens** — product URLs exist but **redirect**; bookmark-only legacy.
10. **`main` branch** — not representative of platform feature completeness.

---

## 8. How to Test New Features

### Prerequisites

```bash
# repo root
docker compose up -d
cd backend && npm run prisma:migrate && npm run prisma:seed && npm run start:dev
cd frontend && npm run dev
```

- Frontend: **http://localhost:3001**
- API: **http://localhost:3000/api/v1**
- Swagger: **http://localhost:3000/api** (if enabled in swagger setup)

### Demo accounts (`DEMO_ACCOUNTS.md`, `backend/prisma/seed.ts`)

| Email | Password | Role | Start URL |
|-------|----------|------|-----------|
| `admin@garudhub.local` | `ChangeMeAdmin123!` (if set in `.env`) | ADMIN | http://localhost:3001/admin |
| `partner@garudhub.local` | `ChangeMeDemo123!` | PARTNER | http://localhost:3001/partner |
| `buyer@garudhub.local` | `ChangeMeDemo123!` | BUYER | http://localhost:3001/marketplace |
| `checkout-test@garudhub.local` | `ChangeMeDemo123!` | BUYER | Cart/checkout QA |

### Scenario checklist

| Scenario | URL / action |
|----------|----------------|
| Listing moderation | Admin → http://localhost:3001/admin/listings → open pending → approve |
| Partner submit listing | Partner → http://localhost:3001/partner/catalog/new → submit for review |
| Cart checkout + Razorpay | Login buyer → listing **Garud AgriSpray X1** → `/buyer/cart` → `/buyer/checkout` → pay modal |
| UTR submit + admin verify | Buyer order detail → bank transfer UTR → Admin http://localhost:3001/admin/orders/[id] → verify UTR |
| Fulfillment | Partner → http://localhost:3001/partner/orders/[id] → update fulfillment + tracking |
| RFQ Phase 3 + compare | http://localhost:3001/buyer/rfqs/new (spec fields) → partner quotes → http://localhost:3001/buyer/rfqs/[id] |
| RFQ → order | On RFQ detail → accept priced quotation → order appears in `/buyer/orders` |
| Admin GMV / cancel | http://localhost:3001/admin/orders → metrics header → open order → cancel or payment override |
| React marketing | http://localhost:3001/about-us , `/services` , `/b2b-partners` |
| Legacy marketing | http://localhost:3001/ (snapshot), `/blogging/...`, `/legal.php/...` via slug route |
| Automated regression | `cd backend && npm test` (unit specs); `npm run test:e2e` for `e2e-workflow.e2e-spec.ts` |

---

## 9. Docs Folder Index

| File | One-line summary |
|------|------------------|
| `PROJECT_STATUS_DETAILED.md` | Oct-20 snapshot; **stale** on routes, migrations, RFQ-order, marketing — use **this file** instead |
| `CODE_LEVEL_STATUS.md` | **This document** — live code inventory |
| `ADMIN_P0_PLAN.md` | Listing moderation + admin console planning/implementation notes |
| `CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md` | Draft design for checkout path and catalog studio (Oct-6) |
| `TASK_003_UTR_UNIQUENESS_REPORT.md` | UTR global uniqueness + advisory locks — completed |
| `TASK_004_ORDER_WORKFLOW_AUDIT.md` | Order/fulfillment state machine audit — completed |
| `TASK_005_RFQ_LIFECYCLE_AUDIT.md` | RFQ bidding hardening + e2e verification — completed |
| `PHASE_0_VERIFICATION_REPORT.md` | Early phase verification checklist |
| `IMPLEMENTATION_VERIFICATION_AUDIT.md` | Cross-module implementation audit |
| `UI_UX_AND_SCALE_AUDIT_REPORT.md` | Static UX/scaling review of platform + marketing bridge |
| `DECODE_JWT_SPEC.txt` | JWT decode notes (untracked helper spec) |

---

## 10. Key Component / Module Index (grep highlights)

| Symbol | Path |
|--------|------|
| `AdminSubnav` | `frontend/components/platform/AdminSubnav.tsx` |
| `PaymentGatewayModal` | `frontend/components/platform/PaymentGatewayModal.tsx` |
| `OrderProgressStepper` | `frontend/components/platform/OrderProgressStepper.tsx` |
| `ShipmentTrackingCard` | `frontend/components/platform/ShipmentTrackingCard.tsx` |
| `PartnerOrderFulfillmentPanel` | `frontend/components/platform/PartnerOrderFulfillmentPanel.tsx` |
| `PaymentsModule` | `backend/src/modules/payments/` |
| `payments.ts` client | `frontend/lib/api/payments.ts` |

---

*End of code-level status. Regenerate after major merges to `main` or when migration count / platform route glob changes.*
