# GarudHub — Detailed Project Status

**Date:** October 20, 2026  
**Repository:** [github.com/nigmanand-create/Garud](https://github.com/nigmanand-create/Garud)  
**Method:** Code-verified inventory across **30 platform `page.tsx` routes**, 50 static marketing HTML snapshots, 15 NestJS API controllers, 15 `schema.prisma` models, 8 database migrations, and verified execution logs.

---

## Executive Summary

GarudHub operates as a **unified single-origin web application** on port `3001` bridging two distinct layers:
1. **Marketing Track:** 50 static HTML snapshot documents (`frontend/content/pages/`) served via Next.js catch-all routes with relative URL rewriting and platform CTA localization.
2. **Platform Track:** **30 dynamic React platform routes** (`frontend/app/(platform)/*`) covering Authentication, Public Marketplace, Buyer Cart/Checkout/Orders/RFQ, Partner Onboarding/Catalog Studio/Orders/RFQs, and the Platform Admin Console.

The backend is built on **NestJS 11 + Prisma 6 + PostgreSQL 16** across 8 feature modules: `identity`, `partner`, `documents`, `catalog`, `commerce`, `payments`, `rfq`, and `admin`.

**Recent Major Milestones Implemented & Verified:**
- **Admin P0 (Listing Moderation Console):** Implemented dual-gate moderation (`reviewStatus: DRAFT, PENDING_REVIEW, APPROVED, REJECTED, UNPUBLISHED`), audit logging in `ListingModerationAuditLog`, partner listing studio live card preview, and admin review screens at `/admin/listings` and `/admin/listings/[id]`.
- **Admin P1 (Order Oversight & Disputes):** Implemented admin order tracking, real-time Gross Merchandise Value (GMV) metric calculation, dispute cancellation at `/admin/orders/[id]/cancel`, and manual payment status override at `/admin/orders/[id]/payment`.
- **Phase 3 (Hybrid Payment Engine):** Integrated Razorpay Test API gateway (`POST /payments/intent`, `POST /payments/verify-razorpay`), corporate B2B NEFT/RTGS UTR wire transfer submission (`POST /payments/bank-transfer`), admin UTR bank reconciliation (`POST /payments/admin/verify-utr`), payment transaction audit ledger (`payment_transactions` table), and the interactive frontend modal `PaymentGatewayModal.tsx`.
- **Saved Delivery Address System:** Implemented `GET /buyer/checkout/saved-address` to pre-fill the buyer's default shipping/billing address on `/buyer/checkout` with an inline "Change / Edit Address" toggle.

---

## Admin — Current Status (Snapshot)

| Area | Status | What Exists in Code |
|---|---|---|
| **Routes** | **Done** | Exactly 6 admin routes: `/admin`, `/admin/applications/[id]`, `/admin/listings`, `/admin/listings/[id]`, `/admin/orders`, `/admin/orders/[id]` (+ dispute sub-routes `/cancel` and `/payment`). |
| **Partner Verification (KYC)** | **Done** | Application queue with status filter, detail review with GST/CIN/description, document download, and Approve/Reject with audit logging (`VerificationAuditLog`). |
| **Listing Moderation** | **Done** | Dedicated listing moderation queue at `/admin/listings`, detail review at `/admin/listings/[id]`, Approve (publishes to marketplace), Reject (with feedback), and Unpublish. Logged in `ListingModerationAuditLog`. |
| **Order Oversight & Disputes** | **Done** | Order dashboard at `/admin/orders` with live GMV metrics, order inspection at `/admin/orders/[id]`, dispute cancellation at `/admin/orders/[id]/cancel`, and payment status update at `/admin/orders/[id]/payment`. |
| **B2B Bank Reconciliation** | **Done** | Admin approves or rejects corporate NEFT/RTGS UTR wire transfers via `POST /payments/admin/verify-utr`, automatically updating the order to `PAID`. |
| **User / Role Management** | **Not Started** | No admin user CRUD UI; user accounts are managed via registration or seed scripts. |
| **Audit Log Visibility** | **Partial** | Verification and listing moderation audit logs are written to database tables; direct UI viewer for audit history is partially surfaced. |

---

## Table 1 — Backend Modules

| Module | APIs & Endpoints | Status | Implementation Notes & Gaps |
|---|---|---|---|
| **Health** (`app.controller.ts`) | `GET /health` | **Done** | Returns service liveness (`garudhub-api`). |
| **Identity** (`auth.controller.ts`) | `POST /auth/register`, `login`, `refresh`, `logout`; `GET /auth/me` | **Done** | JWT access (15m) + refresh (7d) rotation; `RolesGuard`; tokens currently stored in `localStorage`. |
| **Partner** (`partner.controller.ts`) | `GET /partner/me`; `PATCH /partner/application`; `POST /partner/application/submit` | **Done** | Manages partner organization profile and KYC submission lifecycle. |
| **Documents** (`partner-documents.controller.ts`) | `GET/POST/DELETE /partner/documents`; `GET /partner/documents/:id/download` | **Done** | Local filesystem storage (`./uploads`); secure streaming via NestJS controller. |
| **Catalog — Partner** (`partner-catalog.controller.ts`) | `GET/POST/PATCH/DELETE /partner/catalog/listings`; `POST .../images`; `POST .../submit-for-review` | **Done** | `VerifiedPartnerGuard` enforced; live preview card; multi-image upload. |
| **Catalog — Media** (`listing-media.controller.ts`) | `GET /media/listings/:orgId/:fileName` | **Done** | Public streaming of listing images from local disk. |
| **Catalog — Marketplace** (`marketplace.controller.ts`) | `GET /marketplace/listings`, `listings/:id`, `partners/:orgId` | **Done** | Public catalog with category/type filters; returns only approved and published listings. |
| **Commerce — Cart** (`buyer-cart.controller.ts`) | `GET/DELETE /buyer/cart`; `POST/PATCH/DELETE /buyer/cart/items` | **Done** | Single `partnerOrganizationId` per cart enforced; throws HTTP 409 on vendor mixing. |
| **Commerce — Checkout** (`buyer-checkout.controller.ts`) | `GET /buyer/checkout/saved-address`; `POST /buyer/checkout/place` | **Done** | Address pre-fill; order creation with line item price snapshots. |
| **Commerce — Buyer Orders** (`buyer-orders.controller.ts`) | `GET /buyer/orders`, `GET /buyer/orders/:id` | **Done** | Read-only purchase order history for buyers. |
| **Commerce — Partner Orders** (`partner-orders.controller.ts`) | `GET /partner/orders`, `GET :id`, `PATCH :id/fulfillment` | **Done** | Fulfillment stage progression (`PENDING` → `PROCESSING` → `SHIPPED` → `FULFILLED`). |
| **Payments** (`payments.controller.ts`) | `POST /payments/intent`, `verify-razorpay`, `bank-transfer`, `admin/verify-utr`, `webhook` | **Done** | Hybrid payment gateway (Razorpay Test API + NEFT/RTGS UTR wire transfer + sandbox fallback). |
| **RFQ — Buyer** (`buyer-rfq.controller.ts`) | `POST/GET /rfq`, `GET /rfq/:id`, `GET /rfq/:id/quotations`, `POST .../close`, `.../cancel` | **Done** | Auto-invites verified vendors in matching category upon creation. |
| **RFQ — Partner** (`partner-rfq.controller.ts`) | `GET /partner/rfqs`, `GET :id`, `POST :id/quotations`, `POST :id/decline`, `POST quotations/:id/withdraw` | **Done** | Binding quotations with price, MOQ, lead time, and validity date. |
| **Admin** (`admin.controller.ts`) | Applications KYC, Listing Moderation, Order Oversight, GMV Metrics | **Done** | Complete admin console covering KYC, listing publishing gates, and order disputes. |

---

## Table 2 — Platform UI (by Persona)

| Persona / Area | Routes & Screens | Status | Completed Capabilities | Remaining Work |
|---|---|---|---|---|
| **Public / Marketing** | Snapshots: `/`, `/about-us`, 9 service landings, partner pages, `/blogging/*`, `/legal.php/*`, `/enquiry.php` (50 pages) | **Partial** | Full snapshot fidelity; CTA localization to platform routes; legacy redirects. | Eventual native React migration; dynamic enquiry form. |
| **Auth** | `/auth/login`, `/auth/register` | **Done** | Multi-role registration (10 account types), JWT authentication, role redirects. | Migrate token storage from `localStorage` to `httpOnly` cookies. |
| **Marketplace** | `/marketplace`, `/marketplace/listings/[id]`, `/marketplace/partners/[orgId]` | **Done** | Category filter tabs, listing cards, detail page, specs, partner storefront, add to cart. | Full-text search bar; price range facets; pagination. |
| **Buyer** | `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]` | **Done** | Single-vendor cart; saved address pre-fill; checkout; order detail with payment trigger; RFQ creation & quote comparison. | Direct "Orders" link in header nav; one-click "Accept Quote → Create Order" conversion. |
| **Partner** | `/partner`, `/partner/application`, `/partner/documents`, `/partner/catalog`, `/partner/catalog/new`, `/partner/catalog/[id]`, `/partner/orders`, `/partner/orders/[id]`, `/partner/rfqs`, `/partner/rfqs/[id]` | **Done** | Onboarding status checklist; KYC profile; document upload; listing studio with live preview; fulfillment updater; RFQ quoting. | Payouts management; lead management module. |
| **Admin** | `/admin`, `/admin/applications/[id]`, `/admin/listings`, `/admin/listings/[id]`, `/admin/orders`, `/admin/orders/[id]` (+ cancel & payment overrides) | **Done** | Partner KYC queue; listing moderation; order oversight with GMV calculation; dispute cancellation; bank UTR reconciliation. | User/role management console; dedicated audit log viewer. |

**Platform Route Count:** Exactly **30** `page.tsx` routes under `frontend/app/(platform)/`.

---

## Table 3 — PRD & Development Phase Alignment

| Phase | Scope Description | Repo Status | Verification Evidence |
|---|---|---|---|
| **Phase A — Foundation** | Repo structure, env, auth, roles, partner application, admin KYC approval | **Complete** | Identity module, partner module, admin KYC endpoints, `VerificationAuditLog`. |
| **Phase B — Partner Core** | Partner profile, listings CRUD, document uploads, catalog studio | **Complete** | `/partner/*`, `DocumentsModule`, `CatalogModule`, live preview studio. |
| **Phase C — Marketplace & RFQ** | Marketplace catalog, filters, RFQ creation, auto-matching, quotations | **Complete** | `MarketplaceController`, `BuyerRfqController`, `PartnerRfqController`, `RfqMatchingService`. |
| **Commerce Phase 1–2** | Single-vendor cart, checkout, saved address memory, partner order fulfillment | **Complete** | `CartService`, `CheckoutService`, `OrdersService`, `/buyer/checkout`. |
| **Admin P0 — Listing Moderation** | Listing review status enum, admin moderation queue, approve/reject/unpublish | **Complete** | `ListingReviewStatus`, `ListingModerationAuditLog`, `/admin/listings/*`. |
| **Admin P1 — Order Oversight** | Platform GMV metrics, order inspection, dispute cancellation, settlement update | **Complete** | `AdminService#getOrders`, `cancelOrder`, `/admin/orders/*`. |
| **Phase 3 — Payment Engine** | Hybrid payment gateway (Razorpay Test API + corporate NEFT/RTGS UTR wire) | **Complete** | `PaymentsModule`, `PaymentTransaction` table, `PaymentGatewayModal.tsx`. |

---

## Table 4 — Data Model Summary (15 Models, 15 Enums)

| Model Name | Table Name | Key Relations & Responsibilities |
|---|---|---|
| `User` | `users` | Core credentials, role (`UserRole`), account type (`AccountType`). Owns `Organization`, `Cart`, `RefreshToken`s, `Order`s, `Rfq`s. |
| `RefreshToken` | `refresh_tokens` | SHA-256 hashed refresh tokens, expiry timestamp, revocation timestamp. |
| `Organization` | `organizations` | Legal business entity, GST, CIN, verification status (`VerificationStatus`). Owns listings, documents, orders. |
| `VerificationAuditLog` | `verification_audit_logs` | Immutable audit log of KYC approvals and rejections with admin notes. |
| `OrganizationDocument` | `organization_documents` | File metadata for KYC uploads (GST, CIN, registration certificates). |
| `PartnerListing` | `partner_listings` | Products/services, SKU, technical specs, pricing, review status (`ListingReviewStatus`). |
| `ListingModerationAuditLog` | `listing_moderation_audit_logs` | Immutable audit log of admin listing reviews. |
| `Cart` | `carts` | Active buyer shopping cart bound to a single vendor organization (`partnerOrganizationId`). |
| `CartItem` | `cart_items` | Cart line items linking listing ID and quantity. |
| `Order` | `orders` | B2B purchase orders, shipping/billing address, GSTIN, PO number, total INR, status, fulfillment status, payment status. |
| `OrderLineItem` | `order_line_items` | Immutable price snapshot of items purchased in an order. |
| `PaymentTransaction` | `payment_transactions` | Payment audit ledger (Razorpay order ID, payment ID, signature, UTR number, status, failure reason). |
| `Rfq` | `rfqs` | Procurement requirements posted by buyers, category, quantity, deadline. |
| `RfqInvite` | `rfq_invites` | Invitations automatically dispatched to matching verified vendors. |
| `Quotation` | `quotations` | Binding vendor proposals against an RFQ (price INR, MOQ, lead time, validity). |

---

## Local Verification Commands

1. **Start Database:** `docker compose up -d` (PostgreSQL on port `5434`).
2. **Backend API:** `cd backend && npm run prisma:migrate && npm run prisma:seed && npm run start:dev` (runs on `:3000`).
3. **Frontend:** `cd frontend && npm run dev` (runs on `:3001`).
4. **Compile Checks:**
   - Backend compilation: `npm --prefix backend run build` (Verified: PASS, 0 errors).
   - Frontend TypeScript check: `npx tsc --noEmit` inside `frontend` (Verified: PASS, 0 errors).
