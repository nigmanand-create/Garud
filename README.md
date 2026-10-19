# GarudHub — Project Context, Technical Architecture & Status Documentation

> **Documentation Purpose:** Single source of truth for the technical and functional state of GarudHub. Designed for developers, technical consultants, and AI coding assistants to onboard, understand, run, debug, and safely extend the platform without relying on undocumented assumptions.  
> **Production Website:** [https://garudhub.com/](https://garudhub.com/)  
> **Repository:** `github.com/nigmanand-create/Garud` (Local workspace: `/Users/blackstar/Desktop/dev/client/garud`)  
> **Last Inspected Date:** October 20, 2026  
> **Git Tracking:** Branch `main` | Commit Hash: `10482628ff213e25464e23ad93a04c44dc788005` (`1048262`)  
> **Verification Scope:** Complete filesystem trace across backend (NestJS 11 + Prisma 6 + PostgreSQL 16), frontend (Next.js 15.5 + React 19), 30 dynamic platform routes, 50 static marketing pages, 15 API controllers, 15 database models, 8 database migrations, compilation verification, and test suite execution.  
> **Inspection Status Banner:** ⚠️ *All statuses, paths, and behaviors documented herein reflect verified code and execution results as of commit `1048262`. Features must not be assumed complete unless verified against code.*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Project Status](#2-current-project-status)
3. [Technology Stack](#3-technology-stack)
4. [Architecture and System Design](#4-architecture-and-system-design)
5. [Repository Structure](#5-repository-structure)
6. [Complete Feature Inventory](#6-complete-feature-inventory)
7. [Page and Route Inventory](#7-page-and-route-inventory)
8. [Backend and API Documentation](#8-backend-and-api-documentation)
9. [Database and Data Model](#9-database-and-data-model)
10. [Authentication and Authorization](#10-authentication-and-authorization)
11. [External Integrations](#11-external-integrations)
12. [Environment Setup](#12-environment-setup)
13. [Testing and Quality Assurance](#13-testing-and-quality-assurance)
14. [Deployment and Production Status](#14-deployment-and-production-status)
15. [Known Issues and Technical Debt](#15-known-issues-and-technical-debt)
16. [Pending Work and Development Roadmap](#16-pending-work-and-development-roadmap)
17. [Important Technical Decisions](#17-important-technical-decisions)
18. [Client Requirements and Open Questions](#18-client-requirements-and-open-questions)
19. [AI Assistant Handoff Context](#19-ai-assistant-handoff-context)
20. [Immediate Next Actions](#20-immediate-next-actions)

---

## 1. Project Overview

### 1.1 Business Purpose and Target Users
GarudHub is designed as **India's B2B Drone Ecosystem Platform**, anchored around the positioning statement:  
> *"Connect. Partner. Sell. Service. Grow."*

The commercial drone industry in India is highly fragmented across unmanned aerial vehicle (UAV) manufacturers, component suppliers, DGCA-certified training institutes, service/maintenance technicians, enterprise buyers (agriculture, infrastructure, mining, energy, surveying), and government agencies (PSUs, defense, state departments). GarudHub addresses this fragmentation by replacing unverified listings and manual procurement with a structured business-generation platform.

**Target Personas:**
1. **Drone Manufacturers & OEMs:** List DGCA-compliant drones, components, and payloads; manage multi-image catalogs; respond to enterprise RFQs; fulfill direct online B2B purchase orders.
2. **Enterprise Buyers:** Browse verified drone catalogs; filter by applications (agriculture, mapping, surveillance); request custom quotes (RFQ) with quantity and timeline parameters; purchase directly via single-vendor cart checkout.
3. **Distributors & Dealers:** Expand regional distribution networks across India; submit enterprise bulk pricing.
4. **Service, Maintenance & Training Providers:** Offer drone pilot training (RPTO), maintenance, repair, and overhaul (MRO), and consultancy.
5. **Government & PSU Buyers:** Procure equipment via formal procurement workflows adhering to Indian GST and Purchase Order (PO) compliance.
6. **Platform Administrators:** Gatekeep ecosystem quality through two-stage verification (partner KYC verification + listing content moderation), supervise platform GMV, resolve dispute cancellations, and reconcile B2B banking transactions.

### 1.2 Core Value Proposition
- **Verified Partner Directory:** Mandatory business verification (GST, CIN, company registration, authorization letters) before public listing or quoting privileges are granted.
- **Two-Gate Quality Assurance:** Partner organizations must be approved by Platform Admins; individual product/service listings must subsequently pass listing moderation before public marketplace publication.
- **Structured RFQ Quoting Engine:** Enterprise buyers post requirements; verified vendors receive automated category invites, submit binding quotations with lead times and validity dates, and negotiate terms.
- **Indian B2B Commerce & Hybrid Payments:** Native support for Indian corporate procurement including GSTIN, Purchase Order numbers, split shipping/billing addresses, single-vendor order integrity, Razorpay test gateway for retail/card transactions, and offline NEFT/RTGS wire settlement with admin UTR reconciliation.
- **Unified Single-Origin Web Experience:** Transparent bridge between existing static marketing lifecycle pages and the interactive Next.js React platform without domain switching.

### 1.3 Current Development Stage
- **Stage:** **Active Alpha / Late MVP** (Core B2B functionality is implemented and functional end-to-end; secondary features such as automated email/SMS dispatch, cloud S3 object storage, multi-vendor cart splitting, and comprehensive automated test suites remain pending).
- **Scope Confirmed by Evidence:**
  - Full JWT authentication with access/refresh rotation.
  - Multi-step partner onboarding with document uploads.
  - Admin partner KYC review and verification audit logging.
  - Partner catalog studio with live preview and multi-image upload.
  - Admin listing moderation console (Approve, Reject, Unpublish) with audit logging.
  - Public marketplace browsing and partner storefronts.
  - Single-vendor buyer cart and order placement checkout with saved address memory.
  - Hybrid payment engine (Razorpay intent + signature verification, NEFT/RTGS UTR wire submission, admin reconciliation).
  - Admin order oversight, GMV metric tracking, and dispute cancellation.
  - Buyer RFQ creation, vendor matching invites, and quotation submission/withdrawal.
- **Scope Inferred / Pending Client Confirmation:**
  - Conversion of accepted RFQ quotation directly into a payable commerce order.
  - Monetization model (commission percentage vs subscription tier vs lead fee).
  - Production cloud hosting topology and S3 bucket provisioning.

---

## 2. Current Project Status

### Executive Summary

| Status Bucket | Definition | Modules / Features Included |
|---|---|---|
| **What Currently Works** | Fully verified through code execution, build checks, and runtime tracing. | • Multi-role Authentication (Register, Login, JWT access 15m / refresh 7d rotation, Logout, Me).<br>• Partner Onboarding & Document Uploads (GST, CIN, Registration, Auth letter; local disk storage).<br>• Admin Partner Verification Console (`/admin`, `/admin/applications/[id]`, Approve/Reject with audit logs).<br>• Partner Catalog Studio (`/partner/catalog`, `/partner/catalog/new`, edit, live preview, image uploads).<br>• Admin Listing Moderation (`/admin/listings`, `/admin/listings/[id]`, review gates, audit logs).<br>• Public Marketplace Catalog (`/marketplace`, category/type filters, detail page, partner storefront).<br>• Buyer Cart (`/buyer/cart`, single-vendor constraint enforcement, quantity update, item deletion).<br>• Buyer Checkout (`/buyer/checkout`, saved address pre-fill, address toggle, GST/PO fields).<br>• Hybrid Payment Engine (Razorpay order intent, signature verify, NEFT/RTGS wire UTR submission).<br>• Admin Order Oversight (`/admin/orders`, `/admin/orders/[id]`, real-time GMV calculation, dispute cancellation, UTR bank transfer approval).<br>• Partner Order Fulfillment (`/partner/orders`, fulfillment status progression: PENDING → PROCESSING → SHIPPED → FULFILLED).<br>• Buyer & Partner RFQ Engine (Create RFQ, auto-invite matching vendors, submit quote, decline, withdraw).<br>• Single-origin proxy bridge (`/platform-api/v1/*` → NestJS `:3000`). |
| **What is Partially Implemented** | Code exists and runs, but functional gaps or non-production patterns exist. | • Payment Gateway: Razorpay test keys integrated; UPI omitted for orders > ₹1L due to NPCI statutory cap; webhook endpoint exists but lacks live signature validation against a deployed URL.<br>• File Uploads: Uploads work via multer but write to local filesystem (`./uploads`), which does not survive multi-container cloud deployments.<br>• Auth Session: Token refresh queue works, but tokens are stored in browser `localStorage` rather than secure `httpOnly` cookies.<br>• Marketing Surface: 50 static HTML snapshot pages served via Next.js route handlers with CTA link bridging; not yet converted to native React components. |
| **What is Incomplete** | UI or backend partially stubbed without full round-trip flow. | • RFQ Acceptance to Order: Buyer can compare quotes, but clicking "Accept" does not automatically spawn a payable commerce `Order`.<br>• Notifications: No transactional email (SendGrid/Resend) or SMS (Twilio/MSG91) dispatched when orders are placed, listings are approved, or RFQ quotes arrive.<br>• Buyer Orders Header Link: Navigation bar shows "My RFQs" but lacks a direct "Orders" link for buyers.<br>• Pagination: Marketplace, order lists, and admin queues fetch capped results (`take: 50`) without cursor or page pagination. |
| **What is Broken or Blocked** | Known failures verified by test or build execution. | • Jest E2E Test Suite: `npm run test:e2e` in `backend` fails immediately because `@nestjs/config` v12 is packaged as an ES Module and Jest's CommonJS environment cannot import it without transform configuration.<br>• Backend ESLint: `npm run lint` in `backend` fails with 41 errors (unused imports, unused parameters, unsafe `any` mappings in checkout service).<br>• Frontend ESLint: `npm run lint` in `frontend` fails non-interactively because Next.js 15 requires an explicit ESLint configuration file. |
| **What Has Not Been Started** | Planned in blueprint or audit reports, but zero code exists. | • Automated Unit Tests (0 unit test files in `backend/src` or `frontend`).<br>• Admin User & Role Management Console (no UI to edit user accounts or reassign roles).<br>• Cloud Object Storage Adapter (AWS S3, Cloudflare R2, or GCP Cloud Storage).<br>• Multi-vendor cart split-order checkout.<br>• Multilingual support (Hindi i18n). |

### Major Risks & Immediate Priorities
1. **Security Risk (P0):** JWT access and refresh tokens stored in `localStorage` (`garud_access_token`, `garud_refresh_token`). Vulnerable to XSS token exfiltration. Must be migrated to `httpOnly`, `SameSite=Lax`, `Secure` cookies.
2. **Storage Risk (P0):** KYC documents and listing media stored on the local disk container filesystem (`backend/uploads/`). Any cloud deployment with ephemeral filesystems (Render, AWS ECS, Kubernetes) will wipe uploaded files on redeployment or restart.
3. **Quality & CI Risk (P1):** Zero unit test coverage, broken E2E test runner, and 41 backend lint errors prevent reliable CI/CD automation.

---

## 3. Technology Stack

| Layer / Service | Technology | Version (Verified) | Where Used | Why Used | Evidence File | Known Concerns |
|---|---|---|---|---|---|---|
| **Runtime Environment** | Node.js | `>=20.11.0` | Backend & Frontend | JavaScript/TypeScript server runtime | `backend/package.json#engines` | Requires Node 20+ on host/server. |
| **Backend Framework** | NestJS | `11.0.1` | `backend/src/` | Modular enterprise architecture, DI, decorators | `backend/package.json` | Modern v11 with v12 ConfigModule ESM quirks. |
| **API Documentation** | Swagger / OpenAPI | `11.4.7` | `backend/src/shared/swagger/` | Interactive API documentation at `/api/docs` | `backend/src/shared/swagger/swagger.setup.ts` | Fully operational; generates `/api/docs-json`. |
| **Database ORM** | Prisma Client & CLI | `6.19.3` | `backend/prisma/` | Type-safe schema migrations, queries, and seeding | `backend/prisma/schema.prisma` | Uses deprecated `package.json#prisma` property. |
| **Database** | PostgreSQL | `16-alpine` | Containerized DB | Relational data integrity, JSONB support, ACID transactions | `docker-compose.yml` | Port mapped to `5434` on host to prevent 5432 collisions. |
| **Password Hashing** | Bcrypt | `6.0.0` | `backend/src/modules/identity/` | Secure one-way hashing with 12 salt rounds | `backend/src/modules/identity/auth.service.ts` | Computationally expensive; properly isolated in service. |
| **Authentication** | Passport & Passport-JWT | `passport: 0.7.0`, `passport-jwt: 4.0.1` | `backend/src/modules/identity/` | Stateless Bearer token extraction and validation | `backend/src/modules/identity/strategies/jwt.strategy.ts` | Strategy reads Bearer header; frontend uses localStorage. |
| **Validation** | class-validator & class-transformer | `class-validator: 0.15.1`, `class-transformer: 0.5.1` | Backend DTOs | Request payload validation and type coercion | `backend/src/main.ts` | Global `ValidationPipe` with whitelist and forbidNonWhitelisted. |
| **Frontend Framework** | Next.js (App Router) | `15.5.4` | `frontend/app/` | React SSR, hybrid static routing, API reverse proxy | `frontend/package.json` | Next.js 15 async request parameters requirement followed. |
| **UI Library** | React & React-DOM | `19.1.0` | `frontend/` | Component rendering and client state management | `frontend/package.json` | React 19 canary/latest features. |
| **Styling** | Vanilla CSS / CSS Modules | Standard CSS3 | `frontend/app/styles/platform.css` | Design system tokens, responsive grid, zero-runtime overhead | `frontend/app/styles/platform.css` | Adheres strictly to project rules (no TailwindCSS). |
| **Payment Gateway** | Razorpay SDK / API | Direct REST API integration | `backend/src/modules/payments/` | Card, Netbanking, and UPI payment intents & verification | `backend/src/modules/payments/payments.service.ts` | Razorpay Test API keys integrated; sandbox simulation fallback. |
| **File Handling** | Multer | Express built-in (`@types/multer: 2.3.0`) | `backend/src/modules/documents/`, `catalog/` | Multipart form uploads for KYC PDFs and listing images | `backend/src/modules/documents/partner-documents.controller.ts` | Writes to local filesystem (`./uploads`); not cloud-durable. |
| **Testing** | Jest & Supertest | `jest: 30.0.0`, `supertest: 7.0.0` | `backend/test/` | Automated unit and integration testing | `backend/test/jest-e2e.json` | CommonJS Jest incompatible with ESM `@nestjs/config`. |

---

## 4. Architecture and System Design

### 4.1 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Clients["Client Access Surfaces"]
        B[Buyer Browser]
        P[Partner Browser]
        A[Admin Browser]
        M[Public Guest]
    end

    subgraph NextJS["Frontend: Next.js (Port 3001)"]
        Edge["App Router / Edge Engine"]
        MktgSnapshots["Marketing Static Pages\n(content/pages/ 50 snapshots)"]
        PlatformShell["React Platform Shell\n((platform)/* 30 routes)"]
        ReverseProxy["API Proxy Route\n(/platform-api/v1/*)"]
        LocalStorage["Browser LocalStorage\n(Tokens: garud_access_token)"]
    end

    subgraph NestJS["Backend: NestJS REST API (Port 3000)"]
        GlobalPrefix["Global Prefix: /api/v1"]
        Pipes["ValidationPipe (whitelist, forbidNonWhitelisted)"]
        Swagger["Swagger UI (/api/docs)"]

        subgraph Guards["Security & Role Guards"]
            JwtGuard["JwtAuthGuard"]
            RoleGuard["RolesGuard"]
            PartnerGuard["VerifiedPartnerGuard"]
        end

        subgraph Modules["Functional Domain Modules"]
            ModIdent["IdentityModule\n(Auth, JWT Refresh, Roles)"]
            ModPartner["PartnerModule\n(Profile, KYC Application)"]
            ModDocs["DocumentsModule\n(KYC Document Uploads)"]
            ModCat["CatalogModule\n(Listings, Media, Marketplace)"]
            ModComm["CommerceModule\n(Cart, Checkout, Orders)"]
            ModPay["PaymentsModule\n(Razorpay, NEFT/RTGS UTR Wire)"]
            ModRfq["RfqModule\n(RFQ, Vendor Invites, Quotes)"]
            ModAdmin["AdminModule\n(KYC, Listing Mod, Order Oversight)"]
        end
    end

    subgraph Storage["Data & Storage Layer"]
        PG[("PostgreSQL 16 (Port 5434)\nPrisma ORM (15 Models, 8 Migrations)")]
        LocalDisk[("Local Filesystem Disk\n./uploads/ (KYC & Listing Images)")]
    end

    subgraph External["External Integrations"]
        RZP["Razorpay Payment Gateway API\n(Test Mode / Sandbox Fallback)"]
        PublicSite["https://garudhub.com/\n(Legacy Reference Site)"]
    end

    %% Client Interactions
    M -->|Browse Marketing| Edge
    Edge -->|Route Handler| MktgSnapshots
    B -->|Browse / Buy| PlatformShell
    P -->|Manage Catalog / Orders| PlatformShell
    A -->|Moderate / Reconcile| PlatformShell
    PlatformShell <--> LocalStorage

    %% Frontend Proxy
    PlatformShell -->|fetch('/platform-api/v1/*')| ReverseProxy
    ReverseProxy -->|Forward HTTP / Bearer JWT| GlobalPrefix

    %% Backend Flow
    GlobalPrefix --> Pipes
    Pipes --> Guards
    Guards --> Modules

    %% Module DB Interactions
    ModIdent --> PG
    ModPartner --> PG
    ModCat --> PG
    ModComm --> PG
    ModPay --> PG
    ModRfq --> PG
    ModAdmin --> PG

    %% File Storage
    ModDocs --> LocalDisk
    ModCat --> LocalDisk

    %% Payments
    ModPay -->|Create Order / Verify Sig| RZP
```

### 4.2 Application Architecture: The Two-Surface Single-Origin Model
The repository implements a unified frontend architecture:
1. **Marketing Surface:** Serves 50 original HTML snapshots (`frontend/content/pages/`) via catch-all route handlers `app/route.ts` and `app/[...slug]/route.ts`. The helper `lib/snapshot-html.ts` inspects incoming HTML, converts absolute links to relative paths, and bridges CTAs (e.g., rewriting `/drone-marketplace` to `/marketplace`, and Join Partner to `/auth/register`).
2. **Platform Surface:** Serves 30 dynamic React routes (`frontend/app/(platform)/*`) styled with modern CSS design tokens in `frontend/app/styles/platform.css`. Both surfaces share the unified `MarketingHeader` and `MarketingFooter` inside `MarketingShell`.
3. **API Proxy Layer:** Browser calls target `/platform-api/v1/*` on port 3001. The Next.js route handler `frontend/app/platform-api/v1/[...path]/route.ts` proxies requests to the NestJS API on port 3000 (`http://127.0.0.1:3000/api/v1/*`), forwarding headers, query parameters, and streaming request/response bodies without CORS issues.

### 4.3 Data Flow and Lifecycle Paths
- **Partner Verification Flow:**
  `Partner Register` → Account created (`UserRole.PARTNER`, `VerificationStatus.DRAFT`) → Partner fills company profile (`PATCH /partner/application`) → Uploads GST/CIN documents (`POST /partner/documents`) → Submits application (`POST /partner/application/submit` → status `SUBMITTED`) → Admin reviews in `/admin/applications/[id]` → Admin clicks Approve (`POST /admin/applications/:id/approve` → status `APPROVED`, audit log written) → Partner gains `VerifiedPartnerGuard` access to publish listings and receive RFQs.
- **Listing Lifecycle & Dual-Gate Moderation Flow:**
  `Verified Partner` creates listing (`POST /partner/catalog/listings` → `reviewStatus: DRAFT`) → Uploads product images (`POST .../images`) → Submits for review (`POST .../submit-for-review` → `reviewStatus: PENDING_REVIEW`) → Admin inspects in `/admin/listings/[id]` → Admin clicks Approve (`POST /admin/listings/:id/approve` → `reviewStatus: APPROVED`, `isPublished: true`, `ListingModerationAuditLog` created) → Listing becomes visible on public `/marketplace`.
- **Commerce & Hybrid Payment Flow:**
  `Buyer` adds fixed-price listing to cart (`POST /buyer/cart/items`) → Cart enforces single-vendor constraint → Buyer proceeds to `/buyer/checkout` → Pre-fills saved address (`GET /buyer/checkout/saved-address`) → Places order (`POST /buyer/checkout/place` → `status: CONFIRMED`, `paymentStatus: PENDING`, `fulfillmentStatus: PENDING`) → Checkout UI triggers `PaymentGatewayModal`:
  - *Option A (Razorpay Gateway):* Calls `POST /payments/intent` → Opens Razorpay Checkout modal → On payment success, sends payment ID, order ID, and signature to `POST /payments/verify-razorpay` → Signature verified via HMAC-SHA256 → `payment_transactions` record marked `SUCCESS`, Order `paymentStatus` updated to `PAID`.
  - *Option B (Corporate NEFT/RTGS Wire):* Buyer inputs bank UTR reference number and bank name → Calls `POST /payments/bank-transfer` → Transaction recorded as `PROCESSING` → Admin reviews UTR under `/admin/orders/[id]` → Admin clicks Verify Bank Transfer (`POST /payments/admin/verify-utr`) → Order updated to `PAID`.
  - *Partner Fulfillment:* Vendor sees order in `/partner/orders/[id]` → Advances fulfillment status: `PENDING` → `PROCESSING` → `SHIPPED` → `FULFILLED`.

---

## 5. Repository Structure

```
garud/
├── README.md                                  # Root documentation (this single source of truth)
├── DEMO_ACCOUNTS.md                           # Local seed accounts and test credentials
├── PROJECT_TWO_TRACKS.md                      # Guide for the single-origin marketing/platform architecture
├── PROJECT_WORKING_PRINCIPLES.md              # Engineering principles, phase map, and source of truth rules
├── docker-compose.yml                         # Docker service for PostgreSQL 16 (port 5434)
├── decode_jwt.docx                            # Blueprint specification and requirements doc
├── GarudHub_Drone_Website_UI_Wireframe_Blueprint.docx # Original UI wireframe document
├── docs/                                      # Specialized architectural and design artifacts
│   ├── ADMIN_P0_PLAN.md                       # Listing moderation specification and implementation plan
│   ├── CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md # Detailed commerce catalog and cart specifications
│   ├── PROJECT_STATUS_DETAILED.md             # Detailed status ledger
│   └── UI_UX_AND_SCALE_AUDIT_REPORT.md        # UI/UX audit and scalability recommendations
│
├── backend/                                   # NestJS REST API application
│   ├── .env.example                           # Template for backend environment variables
│   ├── LOCAL_DEVELOPMENT.md                   # Local backend setup and migration instructions
│   ├── package.json                           # Dependencies: NestJS 11, Prisma 6, Passport, Bcrypt
│   ├── tsconfig.json                          # TypeScript configuration
│   ├── uploads/                               # Local storage for KYC documents and listing images
│   ├── prisma/                                # Database schemas, migrations, and seed scripts
│   │   ├── schema.prisma                      # Complete Prisma schema (15 models, 15 enums)
│   │   ├── seed.ts                            # Seed script with demo accounts, listings, and orders
│   │   └── migrations/                        # 8 verified Prisma SQL migrations
│   ├── test/                                  # Testing directory
│   │   ├── app.e2e-spec.ts                    # Liveness health E2E test
│   │   └── jest-e2e.json                      # E2E Jest configuration
│   └── src/                                   # Application source code
│       ├── main.ts                            # Entry point: global prefix api/v1, ValidationPipe
│       ├── app.module.ts                      # Root Nest module importing all feature modules
│       ├── app.controller.ts                  # Health endpoint: GET /api/v1/health
│       ├── shared/                            # Cross-cutting concerns
│       │   ├── prisma/                        # PrismaService database lifecycle management
│       │   └── swagger/                       # OpenAPI Swagger configuration (/api/docs)
│       └── modules/                           # Domain feature modules
│           ├── identity/                      # Auth, JWT access/refresh, Bcrypt, RolesGuard
│           ├── partner/                       # Partner profile, KYC onboarding application
│           ├── documents/                     # KYC document upload and secure streaming
│           ├── catalog/                       # Listings CRUD, image upload, public marketplace
│           ├── commerce/                      # Cart (single-vendor), checkout, orders, fulfillment
│           ├── payments/                      # Razorpay gateway, NEFT/RTGS UTR wire, reconciliation
│           ├── rfq/                           # Buyer RFQ creation, vendor matching, quotation engine
│           └── admin/                         # KYC moderation, listing review, order oversight, GMV
│
└── frontend/                                  # Next.js 15 App Router web application
    ├── .env.example                           # Template for frontend environment variables
    ├── README.md                              # Frontend developer guide and route overview
    ├── package.json                           # Dependencies: Next.js 15.5, React 19, TypeScript
    ├── next.config.ts                         # Next.js configuration and rewrite rules
    ├── middleware.ts                          # URL rewrite rules for legacy PHP parameters
    ├── public/                                # Static assets (images, icons, flags)
    ├── content/pages/                         # 50 static marketing HTML snapshots
    ├── lib/                                   # Shared client utilities
    │   ├── api/                               # Typed API client, localStorage auth storage
    │   ├── platform/                          # Status label formatters, category helpers
    │   └── snapshot-html.ts                   # HTML snapshot rewriting and CTA bridge
    ├── components/                            # React component library
    │   ├── marketing/                         # MarketingHeader, MarketingFooter, MarketingShell
    │   └── platform/                          # AdminSubnav, PaymentGatewayModal, StatusBadge
    └── app/                                   # Next.js App Router root
        ├── layout.tsx                         # Root HTML layout with viewport and metadata
        ├── route.ts                           # Root '/' marketing snapshot renderer
        ├── [...slug]/                         # Marketing snapshot catch-all router
        ├── platform-api/v1/[...path]/route.ts # Reverse proxy to NestJS backend (:3000)
        ├── styles/platform.css                # Core design system tokens and platform styles
        └── (platform)/                        # 30 Authenticated & public platform routes
            ├── admin/                         # Admin dashboard, KYC, listings, orders
            ├── auth/                          # Login and registration pages
            ├── buyer/                         # Cart, checkout, orders, RFQs
            ├── marketplace/                   # Public marketplace catalog and partner profiles
            └── partner/                       # Partner dashboard, catalog studio, orders, RFQs
```

---

## 6. Complete Feature Inventory

| Feature / Module | Intended Purpose | Implementation Status | Evidence File(s) | Missing Work / Gaps | Dependencies |
|---|---|---|---|---|---|
| **Multi-role Auth** | Register, login, refresh tokens, role gating. | **Complete** | `backend/src/modules/identity/auth.service.ts`<br>`frontend/app/(platform)/auth/` | Token storage in `localStorage` needs migration to `httpOnly` cookies. | PostgreSQL, Bcrypt |
| **Partner KYC Onboarding** | Profile data collection, GST/CIN input, document upload. | **Complete** | `backend/src/modules/partner/`<br>`frontend/app/(platform)/partner/application/` | OCR/automated GST validation; currently manual admin review. | `IdentityModule`, Multer |
| **Admin KYC Verification** | Admin approves or rejects partner applications with audit trail. | **Complete** | `backend/src/modules/admin/admin.controller.ts`<br>`frontend/app/(platform)/admin/applications/` | Automatic email notification to partner upon decision. | `PartnerModule` |
| **Partner Catalog Studio** | Verified partners create/edit listings, upload images, preview live cards. | **Complete** | `backend/src/modules/catalog/partner-catalog.controller.ts`<br>`frontend/app/(platform)/partner/catalog/new/page.tsx` | Batch upload, CSV import. | `VerifiedPartnerGuard` |
| **Admin Listing Moderation** | Admin reviews, approves, rejects, or unpublishes listings. | **Complete** | `backend/src/modules/admin/admin.controller.ts`<br>`frontend/app/(platform)/admin/listings/` | Automated image policy scanning. | `CatalogModule` |
| **Public Marketplace** | Public browsing of approved drone listings with category filtering. | **Complete** | `backend/src/modules/catalog/marketplace.controller.ts`<br>`frontend/app/(platform)/marketplace/` | Full-text search engine (Elastic/Meilisearch), faceted filters. | `PartnerListing` |
| **Single-Vendor Cart** | B2B buyer cart preventing multi-vendor item mixing. | **Complete** | `backend/src/modules/commerce/buyer-cart.controller.ts`<br>`frontend/app/(platform)/buyer/cart/` | Multi-vendor cart splitting into separate orders. | `CommerceModule` |
| **Buyer Checkout & Address** | Checkout form with saved default address pre-fill and edit toggle. | **Complete** | `backend/src/modules/commerce/buyer-checkout.controller.ts`<br>`frontend/app/(platform)/buyer/checkout/` | Dynamic live shipping rate calculation. | `Cart`, `Order` |
| **Hybrid Payment Engine** | Dual-mode payment: Razorpay test gateway + corporate NEFT/RTGS wire. | **Complete** | `backend/src/modules/payments/payments.service.ts`<br>`frontend/components/platform/PaymentGatewayModal.tsx` | Production webhook signature verification; UPI capped at ₹1L by NPCI. | Razorpay API |
| **Admin Order Oversight** | Real-time GMV calculation, dispute cancellation, UTR reconciliation. | **Complete** | `backend/src/modules/admin/admin.controller.ts`<br>`frontend/app/(platform)/admin/orders/` | Automated refund trigger to Razorpay on cancellation. | `PaymentsModule` |
| **Partner Order Fulfillment** | Vendor updates order stages (PENDING → PROCESSING → SHIPPED → FULFILLED). | **Complete** | `backend/src/modules/commerce/partner-orders.controller.ts`<br>`frontend/app/(platform)/partner/orders/` | Shipping carrier tracking webhook integration (Delhivery/Bluedart). | `Order` |
| **Buyer RFQ Submission** | Enterprise buyers submit requirements with deadline and specs. | **Complete** | `backend/src/modules/rfq/buyer-rfq.controller.ts`<br>`frontend/app/(platform)/buyer/rfqs/new/` | File attachments on RFQ posts. | `RfqModule` |
| **Vendor RFQ Matching** | Auto-matching verified vendors in category and dispatching invites. | **Complete** | `backend/src/modules/rfq/rfq-matching.service.ts`<br>`frontend/app/(platform)/partner/rfqs/` | Geolocation matching by state/city. | `Organization` |
| **Quotation Engine** | Vendors submit binding quotations with price, MOQ, lead time. | **Complete** | `backend/src/modules/rfq/partner-rfq.controller.ts`<br>`frontend/app/(platform)/buyer/rfqs/[id]/` | One-click "Accept Quote → Create Order" conversion. | `RfqInvite` |
| **Marketing Snapshot Bridge** | Serves 50 original HTML snapshots and bridges CTAs to platform. | **Complete** | `frontend/lib/snapshot-html.ts`<br>`frontend/app/[...slug]/route.ts` | Eventual migration of static snapshots to native React components. | Local HTML files |
| **Automated Testing Suite** | Comprehensive unit, integration, and E2E regression tests. | **Broken** | `backend/test/app.e2e-spec.ts` | 0 unit tests exist; single E2E test fails on ESM import. | Jest, NestJS |

---

## 7. Page and Route Inventory

### 7.1 Platform Routes (`frontend/app/(platform)/`) — Exactly 30 Routes

| Route Path | Page Component File | Purpose | Access Role | Data Sources & Connected APIs | Current Status | Known Issues / Gaps |
|---|---|---|---|---|---|
| `/auth/login` | `auth/login/page.tsx` | Platform user sign-in | Public (Guest) | `POST /platform-api/v1/auth/login` | **Complete** | Tokens stored in `localStorage`. |
| `/auth/register` | `auth/register/page.tsx` | Multi-role user & company registration | Public (Guest) | `POST /platform-api/v1/auth/register` | **Complete** | Captures 10 B2B account types. |
| `/marketplace` | `marketplace/page.tsx` | Public marketplace catalog | Public | `GET /platform-api/v1/marketplace/listings` | **Complete** | Results capped at 50; no search bar. |
| `/marketplace/listings/[id]` | `marketplace/listings/[id]/page.tsx` | Listing product details & Add to Cart | Public | `GET /platform-api/v1/marketplace/listings/:id` | **Complete** | Add-to-cart requires BUYER login. |
| `/marketplace/partners/[orgId]` | `marketplace/partners/[orgId]/page.tsx` | Partner storefront and catalog | Public | `GET /platform-api/v1/marketplace/partners/:orgId` | **Complete** | Verified partner public profile. |
| `/buyer/cart` | `buyer/cart/page.tsx` | Buyer shopping cart review | `BUYER`, `GOVERNMENT` | `GET/PATCH/DELETE /platform-api/v1/buyer/cart/*` | **Complete** | Strict single-vendor validation. |
| `/buyer/checkout` | `buyer/checkout/page.tsx` | B2B checkout & order placement | `BUYER`, `GOVERNMENT` | `GET .../saved-address`<br>`POST .../buyer/checkout/place` | **Complete** | Saved address pre-fills default; edit toggle. |
| `/buyer/orders` | `buyer/orders/page.tsx` | Buyer purchase history list | `BUYER`, `GOVERNMENT` | `GET /platform-api/v1/buyer/orders` | **Complete** | Missing direct link in header nav. |
| `/buyer/orders/[id]` | `buyer/orders/[id]/page.tsx` | Buyer order detail & payment status | `BUYER`, `GOVERNMENT` | `GET /platform-api/v1/buyer/orders/:id`<br>`GET /platform-api/v1/payments/order/:id` | **Complete** | Triggers payment modal if PENDING. |
| `/buyer/rfqs` | `buyer/rfqs/page.tsx` | Buyer RFQ requirements list | `BUYER`, `GOVERNMENT` | `GET /platform-api/v1/rfq` | **Complete** | Filterable by status (OPEN/CLOSED). |
| `/buyer/rfqs/new` | `buyer/rfqs/new/page.tsx` | Create new procurement RFQ | `BUYER`, `GOVERNMENT` | `POST /platform-api/v1/rfq` | **Complete** | Triggers auto-invite matching. |
| `/buyer/rfqs/[id]` | `buyer/rfqs/[id]/page.tsx` | RFQ detail & quotation comparison | `BUYER`, `GOVERNMENT` | `GET /platform-api/v1/rfq/:id`<br>`GET .../quotations` | **Complete** | Lacks one-click convert-to-order. |
| `/partner` | `partner/page.tsx` | Partner dashboard overview | `PARTNER` | `GET /platform-api/v1/partner/me` | **Complete** | Onboarding status checklist. |
| `/partner/application` | `partner/application/page.tsx` | Partner profile & KYC company details | `PARTNER` | `GET/PATCH /platform-api/v1/partner/application` | **Complete** | Editable until submitted. |
| `/partner/documents` | `partner/documents/page.tsx` | KYC document upload interface | `PARTNER` | `GET/POST/DELETE /platform-api/v1/partner/documents` | **Complete** | Uploads GST, CIN, Reg certificates. |
| `/partner/catalog` | `partner/catalog/page.tsx` | Partner listings catalog management | `PARTNER` | `GET /platform-api/v1/partner/catalog/listings` | **Complete** | Displays reviewStatus badges. |
| `/partner/catalog/new` | `partner/catalog/new/page.tsx` | Create listing studio with live preview | `PARTNER` (Verified) | `POST /platform-api/v1/partner/catalog/listings` | **Complete** | Live card preview updates in real-time. |
| `/partner/catalog/[id]` | `partner/catalog/[id]/page.tsx` | Edit listing, upload gallery images | `PARTNER` (Verified) | `PATCH .../listings/:id`<br>`POST .../images` | **Complete** | Dual submit: Save Draft or Submit Review. |
| `/partner/orders` | `partner/orders/page.tsx` | Vendor incoming purchase orders | `PARTNER` | `GET /platform-api/v1/partner/orders` | **Complete** | Filterable by fulfillment status. |
| `/partner/orders/[id]` | `partner/orders/[id]/page.tsx` | Vendor order fulfillment processor | `PARTNER` | `GET/PATCH /platform-api/v1/partner/orders/:id/*` | **Complete** | Allows advancing shipping stages. |
| `/partner/rfqs` | `partner/rfqs/page.tsx` | Vendor invited RFQs list | `PARTNER` (Verified) | `GET /platform-api/v1/partner/rfqs` | **Complete** | Shows quotation status. |
| `/partner/rfqs/[id]` | `partner/rfqs/[id]/page.tsx` | Submit or withdraw quotation | `PARTNER` (Verified) | `POST .../quotations`<br>`POST .../decline` | **Complete** | Price, lead time, and validity inputs. |
| `/admin` | `admin/page.tsx` | Admin overview & KYC queue | `PLATFORM_ADMIN` | `GET /platform-api/v1/admin/applications` | **Complete** | Includes AdminSubnav navigation. |
| `/admin/applications/[id]` | `admin/applications/[id]/page.tsx` | Admin KYC application decision | `PLATFORM_ADMIN` | `GET .../applications/:id`<br>`POST .../approve`, `.../reject` | **Complete** | Audit trail note logged on action. |
| `/admin/listings` | `admin/listings/page.tsx` | Admin listing moderation list | `PLATFORM_ADMIN` | `GET /platform-api/v1/admin/listings` | **Complete** | Filters: ALL, PENDING_REVIEW, APPROVED, REJECTED. |
| `/admin/listings/[id]` | `admin/listings/[id]/page.tsx` | Admin listing moderation review | `PLATFORM_ADMIN` | `GET .../admin/listings/:id`<br>`POST .../approve`, `.../reject`, `.../unpublish` | **Complete** | Logs to `ListingModerationAuditLog`. |
| `/admin/orders` | `admin/orders/page.tsx` | Admin order oversight & GMV metrics | `PLATFORM_ADMIN` | `GET /platform-api/v1/admin/orders` | **Complete** | Displays real-time Gross Merchandise Value. |
| `/admin/orders/[id]` | `admin/orders/[id]/page.tsx` | Admin order detail & UTR review | `PLATFORM_ADMIN` | `GET .../admin/orders/:id`<br>`POST /payments/admin/verify-utr` | **Complete** | Reconciles B2B wire transfers. |
| `/admin/orders/[id]/cancel` | `admin/orders/[id]/cancel/page.tsx` | Admin order dispute cancellation | `PLATFORM_ADMIN` | `POST /platform-api/v1/admin/orders/:id/cancel` | **Complete** | Sets CANCELLED; prompts refund note. |
| `/admin/orders/[id]/payment` | `admin/orders/[id]/payment/page.tsx` | Admin manual payment status override | `PLATFORM_ADMIN` | `PATCH /platform-api/v1/admin/orders/:id/payment` | **Complete** | Manual payment status override for ops. |

### 7.2 Marketing Snapshots (`frontend/content/pages/`) — 50 Documented Pages
Served via Next.js catch-all routes (`app/route.ts` and `app/[...slug]/route.ts`):
- **Core Pages:** `/` (Home), `/about-us`, `/industries-we-serve`, `/dgca-compliance`, `/drone-training`, `/repairs-maintenance`, `/finance-insurance`, `/edp-professional-services`, `/scrap-recycling`, `/drone-jobs-career`, `/government-projects-schemes`, `/india-market-entry`, `/partner-with-us`.
- **Legacy Redirects:** `/drone-marketplace` (redirects to `/marketplace`), `/drone-accessories` (redirects to `/marketplace?section=accessories`).
- **Legal & Compliance:** `legal.php?page=tos`, `legal.php?page=privacy`, `legal.php?page=refund`.
- **Blog Articles:** 12 in-depth articles on DGCA rules, pilot training, agriculture drones, surveying, insurance, disaster management.
- **Form Snapshots:** `enquiry.php`, `loan-calculators.php`.

---

## 8. Backend and API Documentation

All endpoints are prefixed with `/api/v1` and documented in Swagger at `/api/docs`.

### 8.1 Health Module (`app.controller.ts`)
- `GET /health` — Liveness check. Returns `{ status: 'ok', service: 'garudhub-api' }`.

### 8.2 Identity Module (`auth.controller.ts`)
- `POST /auth/register` — Register new user and organization. Payload: `RegisterDto` (email, password, role, accountType, companyName, country, state, city, contact info). Returns JWT tokens + user object.
- `POST /auth/login` — Sign in. Payload: `LoginDto` (email, password). Returns `{ accessToken, refreshToken, user }`.
- `POST /auth/refresh` — Rotate tokens. Payload: `RefreshTokenDto` (refreshToken). Returns new token pair.
- `POST /auth/logout` — Revoke refresh token. Requires Bearer JWT.
- `GET /auth/me` — Get authenticated user details. Requires Bearer JWT.

### 8.3 Partner Module (`partner.controller.ts`)
- `GET /partner/me` — Get current partner profile and application status. Requires `PARTNER` role.
- `PATCH /partner/application` — Update draft organization details (GST, CIN, contact info).
- `POST /partner/application/submit` — Submit application for admin review (`DRAFT` → `SUBMITTED`).

### 8.4 Documents Module (`partner-documents.controller.ts`)
- `GET /partner/documents` — List uploaded KYC documents.
- `POST /partner/documents` — Upload KYC file (PDF/JPEG/PNG, max 10MB). Multipart form field: `file`, `documentType`.
- `GET /partner/documents/:id/download` — Stream document securely.
- `DELETE /partner/documents/:id` — Delete document (only while application is in `DRAFT` or `REJECTED`).

### 8.5 Catalog Module (`partner-catalog.controller.ts`, `listing-media.controller.ts`, `marketplace.controller.ts`)
- `GET /marketplace/listings` — Public catalog browse. Query params: `listingType`, `category`, `take`, `skip`.
- `GET /marketplace/listings/:id` — Public listing details by ID.
- `GET /marketplace/partners/:orgId` — Public partner profile and approved listings.
- `GET /media/listings/:orgId/:fileName` — Public streaming of listing images from disk.
- `GET /partner/catalog/listings` — Partner listing management list. Requires `PARTNER`.
- `POST /partner/catalog/listings` — Create listing. Requires `VerifiedPartnerGuard`.
- `GET /partner/catalog/listings/:id` — Partner get listing by ID.
- `PATCH /partner/catalog/listings/:id` — Update listing details.
- `DELETE /partner/catalog/listings/:id` — Delete listing.
- `POST /partner/catalog/listings/:id/images` — Upload listing image (max 5MB).
- `POST /partner/catalog/listings/:id/submit-for-review` — Transition listing to `PENDING_REVIEW`.

### 8.6 Commerce Module (`buyer-cart.controller.ts`, `buyer-checkout.controller.ts`, `buyer-orders.controller.ts`, `partner-orders.controller.ts`)
- `GET /buyer/cart` — Get buyer active cart and line items. Requires `BUYER` / `GOVERNMENT`.
- `POST /buyer/cart/items` — Add listing to cart. Payload: `{ listingId, quantity }`. Throws 409 Conflict if adding item from different partner organization.
- `PATCH /buyer/cart/items/:id` — Update item quantity.
- `DELETE /buyer/cart/items/:id` — Remove item from cart.
- `DELETE /buyer/cart` — Clear entire cart.
- `GET /buyer/checkout/saved-address` — Retrieve shipping/billing address from buyer's most recent order.
- `POST /buyer/checkout/place` — Convert cart to confirmed order. Payload: `PlaceOrderDto` (shipping/billing address, GSTIN, PO number).
- `GET /buyer/orders` — List buyer orders.
- `GET /buyer/orders/:id` — Get buyer order details.
- `GET /partner/orders` — List vendor orders. Requires `PARTNER`.
- `GET /partner/orders/:id` — Get vendor order details.
- `PATCH /partner/orders/:id/fulfillment` — Advance order fulfillment stage.

### 8.7 Payments Module (`payments.controller.ts`)
- `POST /payments/intent` — Create gateway order intent (Razorpay order or sandbox). Payload: `{ orderId }`.
- `POST /payments/verify-razorpay` — Verify Razorpay HMAC-SHA256 signature and mark order `PAID`.
- `POST /payments/bank-transfer` — Submit corporate NEFT/RTGS UTR wire transfer reference.
- `GET /payments/order/:orderId` — Audit list of payment transactions for an order.
- `POST /payments/admin/verify-utr` — Admin approves or rejects bank transfer. Requires `PLATFORM_ADMIN`.
- `POST /payments/webhook` — Public webhook listener for asynchronous Razorpay capture events.

### 8.8 RFQ Module (`buyer-rfq.controller.ts`, `partner-rfq.controller.ts`)
- `POST /rfq` — Buyer post RFQ requirement. Automatically matches verified vendors in category.
- `GET /rfq` — Buyer list RFQs.
- `GET /rfq/:id` — Buyer view RFQ details.
- `GET /rfq/:id/quotations` — Buyer compare submitted quotations for an RFQ.
- `POST /rfq/:id/close` — Buyer close RFQ to further quotations.
- `POST /rfq/:id/cancel` — Buyer cancel RFQ.
- `GET /partner/rfqs` — Partner list invited RFQs. Requires `VerifiedPartnerGuard`.
- `GET /partner/rfqs/:id` — Partner view RFQ invitation details.
- `POST /partner/rfqs/:id/quotations` — Partner submit quotation (price, MOQ, lead time, validity).
- `POST /partner/rfqs/:id/decline` — Partner decline RFQ invitation.
- `POST /partner/rfqs/quotations/:id/withdraw` — Partner withdraw submitted quotation.

### 8.9 Admin Module (`admin.controller.ts`)
- `GET /admin/applications` — Queue of partner KYC applications. Filter: `VerificationStatus`.
- `GET /admin/applications/:id` — Partner application details and uploaded documents.
- `POST /admin/applications/:id/approve` — Approve partner KYC and write audit log.
- `POST /admin/applications/:id/reject` — Reject partner KYC with mandatory reason note.
- `GET /admin/documents/:id/download` — Admin download of partner KYC documents.
- `GET /admin/listings` — Listing moderation queue. Filter: `ListingReviewStatus`.
- `GET /admin/listings/:id` — Listing moderation detail and audit history.
- `POST /admin/listings/:id/approve` — Approve listing (`reviewStatus: APPROVED`, `isPublished: true`).
- `POST /admin/listings/:id/reject` — Reject listing with reason.
- `POST /admin/listings/:id/unpublish` — Unpublish listing (`reviewStatus: UNPUBLISHED`, `isPublished: false`).
- `GET /admin/orders` — All platform orders + real-time calculated Gross Merchandise Value (GMV).
- `GET /admin/orders/:id` — Admin order details and transaction audit trail.
- `POST /admin/orders/:id/cancel` — Cancel order due to dispute or stockout.
- `PATCH /admin/orders/:id/payment` — Override payment status (`PAID`, `PENDING`, `REFUNDED`).

---

## 9. Database and Data Model

### 9.1 Database Configuration
- **Database Engine:** PostgreSQL 16 Alpine running in Docker container `garudhub-postgres`.
- **Host Port Mapping:** `5434:5432` (avoids port collisions with local host Postgres).
- **ORM:** Prisma 6.19.3.
- **Connection URL:** `postgresql://garud:garud@127.0.0.1:5434/garudhub?schema=public`

### 9.2 Prisma Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| Organization : "owns"
    User ||--o{ RefreshToken : "has"
    User ||--o{ Rfq : "creates (Buyer)"
    User ||--o| Cart : "owns"
    User ||--o{ Order : "places (Buyer)"

    Organization ||--o{ VerificationAuditLog : "logged in"
    Organization ||--o{ OrganizationDocument : "holds"
    Organization ||--o{ PartnerListing : "publishes"
    Organization ||--o{ Rfq : "creates (Buyer Org)"
    Organization ||--o{ RfqInvite : "receives"
    Organization ||--o{ Quotation : "submits"
    Organization ||--o{ Cart : "supplies (CartVendor)"
    Organization ||--o{ Order : "receives (Vendor)"

    PartnerListing ||--o{ ListingModerationAuditLog : "moderated by"
    PartnerListing ||--o{ CartItem : "contains"
    PartnerListing ||--o{ OrderLineItem : "ordered in"

    Cart ||--o{ CartItem : "contains"
    Order ||--o{ OrderLineItem : "contains"
    Order ||--o{ PaymentTransaction : "settled via"

    Rfq ||--o{ RfqInvite : "invites"
    Rfq ||--o{ Quotation : "receives"
```

### 9.3 Models and Table Schema Summary

1. `users` — Authentication credentials, role (`PLATFORM_ADMIN`, `PARTNER`, `BUYER`, `GOVERNMENT`), account type.
2. `refresh_tokens` — Hashed refresh tokens (`SHA-256`), expiry timestamp, revocation timestamp.
3. `organizations` — Legal entity profiles, GST, CIN, verification status (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
4. `verification_audit_logs` — Immutable audit log of KYC status changes with actor user ID and notes.
5. `organization_documents` — File metadata for KYC uploads (GST certificate, CIN, company registration).
6. `partner_listings` — Drone products/services, SKU, technical specs, pricing, review status (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `UNPUBLISHED`).
7. `listing_moderation_audit_logs` — Audit log of admin listing reviews.
8. `carts` — Active buyer shopping cart bound to a single vendor organization (`partnerOrganizationId`).
9. `cart_items` — Cart line items linking listing ID and quantity.
10. `orders` — B2B purchase orders, shipping/billing addresses, GSTIN, PO number, total INR, status, fulfillment status, payment status.
11. `order_line_items` — Immutable price snapshot of items purchased in an order.
12. `payment_transactions` — Payment audit ledger (Razorpay order ID, payment ID, signature, UTR number, bank reference, status: `CREATED`, `PROCESSING`, `SUCCESS`, `FAILED`, `REFUNDED`).
13. `rfqs` — Procurement requirements posted by buyers, deadline, quantity, category.
14. `rfq_invites` — Auto-generated invitations dispatched to matching verified vendors.
15. `quotations` — Formal vendor proposals against an RFQ (price INR, MOQ, lead time days, validity).

### 9.4 Migrations History
1. `20260930220606_init` — Core identity, users, refresh tokens, organizations, verification audit logs.
2. `20260930221515_phase_b_documents_catalog` — Organization documents, partner listings.
3. `20260930223527_phase_c_rfq` — RFQ requirements, vendor invites, quotations.
4. `20261006120000_listing_media_sku` — Listing SKU and image gallery URLs.
5. `20261006165823_phase2_cart_orders` — Cart, CartItem, Order, OrderLineItem.
6. `20261007084251_order_fulfillment_and_listing_media` — Order fulfillment status and performance indexes.
7. `20261012120000_listing_moderation` — Dual-gate listing moderation columns and audit logging table.
8. `20261012145714_add_payment_transactions` — Hybrid payment engine transaction ledger table.

---

## 10. Authentication and Authorization

### 10.1 Mechanism and Token Strategy
- **Access Tokens:** Signed JWT containing `sub` (userId), `email`, `role`, `accountType`, `orgId`, and `verification`. Valid for **15 minutes** (configured via `JWT_ACCESS_EXPIRES_IN`).
- **Refresh Tokens:** Cryptographically signed JWT containing `sub` and unique `jti`. Stored in the database as a SHA-256 hash. Valid for **7 days** (configured via `JWT_REFRESH_EXPIRES_IN`).
- **Token Rotation:** Every invocation of `POST /auth/refresh` immediately revokes the old refresh token record (`revokedAt = new Date()`) and issues a fresh token pair.

### 10.2 Roles and Role-Based Access Control (RBAC)
- `PLATFORM_ADMIN` — Unrestricted access to partner KYC approval, listing moderation, order dispute cancellation, and banking reconciliation.
- `PARTNER` — Access to partner dashboard, KYC application, catalog studio, vendor orders, and RFQ invitations.
- `BUYER` — Access to marketplace, single-vendor cart, checkout, buyer orders, and RFQ creation.
- `GOVERNMENT` — Equal to `BUYER` role with enterprise PSU designation.

### 10.3 Guard Stack
- `JwtAuthGuard` — Extracts `Bearer <token>` from the HTTP `Authorization` header, validates signature and expiration, and attaches `req.user`.
- `RolesGuard` — Enforces `@Roles(...)` metadata against `user.role`.
- `VerifiedPartnerGuard` — Enforces that `user.role === PARTNER` AND `user.organization.verificationStatus === APPROVED`. Prevents unverified partners from creating public listings or quoting on RFQs.

### 10.4 Critical Security Gaps
1. **LocalStorage Token Storage:** The frontend stores JWTs in browser `localStorage` (`garud_access_token` and `garud_refresh_token`). Any Cross-Site Scripting (XSS) vulnerability would allow an attacker to extract both tokens.  
   *Remediation:* Migrate token issuance to secure, `httpOnly`, `SameSite=Lax`, `Secure` cookies.
2. **Missing Rate Limiting:** No rate limiting or brute-force throttling is currently configured on `POST /auth/login` or `POST /auth/register`.  
   *Remediation:* Implement `@nestjs/throttler`.

---

## 11. External Integrations

| Service / System | Purpose | Status | Config Key(s) | Error Handling & Fallback |
|---|---|---|---|---|
| **Razorpay Payment Gateway** | Online B2B payments (Cards, Netbanking, UPI). | **Configured (Test Mode)** | `RAZORPAY_KEY_ID`<br>`RAZORPAY_KEY_SECRET`<br>`RAZORPAY_WEBHOOK_SECRET` | Graceful fallback to sandbox simulation mode if keys are omitted or invalid. |
| **Corporate NEFT/RTGS Wire** | High-value B2B wire settlement. | **Complete (Offline)** | Internal banking reconciliation | Transactions recorded as `PROCESSING` pending admin UTR verification. |
| **Local File Storage** | Storage of KYC PDFs and listing images. | **Complete (Local Disk)** | `UPLOAD_DIR=./uploads` | Validates MIME types (PDF, JPEG, PNG) and file sizes (5MB–10MB). Not durable for cloud. |
| **DGCA / Drone Federation** | Informational compliance rules. | **Not Integrated (Static)** | None | Educational static pages only; no live API connection to DigitalSky. |
| **Transactional Email / SMS** | Order and RFQ status alerts. | **Not Started** | None | Logged to console; no SMTP or SMS provider configured. |

---

## 12. Environment Setup

### 12.1 Prerequisites
- **Node.js:** `>= 20.11.0` (Verify with `node -v`)
- **Docker & Docker Compose:** Docker Desktop or CLI running (Verify with `docker ps`)
- **Git:** Standard git CLI

### 12.2 Step-by-Step Local Setup

#### Step 1: Start PostgreSQL via Docker
From repository root:
```bash
docker compose up -d
```
*Note:* PostgreSQL runs on port `5434` (mapped to container port `5432`). Verify with `docker ps`.

#### Step 2: Configure & Start Backend
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```
*Verification:* Open `http://localhost:3000/api/v1/health` in your browser. It should return:
```json
{"status":"ok","service":"garudhub-api"}
```
Open Swagger docs at `http://localhost:3000/api/docs`.

#### Step 3: Configure & Start Frontend
From a new terminal window:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
*Verification:* Open `http://localhost:3001` in your browser. The application should render the GarudHub homepage.

### 12.3 Environment Variables Reference

#### Backend (`backend/.env`)
| Variable | Required | Default / Example Value | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port for the NestJS HTTP server |
| `NODE_ENV` | No | `development` | Runtime environment mode |
| `DATABASE_URL` | **Yes** | `postgresql://garud:garud@127.0.0.1:5434/garudhub?schema=public` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | `[Redacted Secret >= 32 chars]` | Secret used to sign access JWTs |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifespan |
| `JWT_REFRESH_SECRET` | **Yes** | `[Redacted Secret >= 32 chars]` | Secret used to sign refresh JWTs |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifespan |
| `DEMO_PASSWORD` | No | `ChangeMeDemo123!` | Default password for seeded accounts |
| `ADMIN_EMAIL` | No | `admin@garudhub.local` | Email for default platform administrator |
| `ADMIN_PASSWORD` | No | `ChangeMeAdmin123!` | Password for default platform administrator |
| `UPLOAD_DIR` | No | `./uploads` | Directory for uploaded files |
| `RAZORPAY_KEY_ID` | No | `rzp_test_...` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | No | `[Redacted Secret]` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | No | `[Redacted Secret]` | Razorpay webhook secret |

#### Frontend (`frontend/.env.local`)
| Variable | Required | Default / Example Value | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port for Next.js dev server |
| `BACKEND_URL` | No | `http://127.0.0.1:3000` | Target URL for the `/platform-api/v1` reverse proxy |
| `NEXT_PUBLIC_API_URL` | No | `/platform-api/v1` | Base API URL called by browser client code |

### 12.4 Seeded Demo Accounts (from `DEMO_ACCOUNTS.md`)
Login URL: `http://localhost:3001/auth/login`

| Email | Password | Role | Primary Landing Route |
|---|---|---|---|
| `admin@garudhub.local` | `ChangeMeAdmin123!` | `PLATFORM_ADMIN` | `/admin` |
| `partner@garudhub.local` | `ChangeMeDemo123!` | `PARTNER` (Verified) | `/partner` |
| `buyer@garudhub.local` | `ChangeMeDemo123!` | `BUYER` | `/marketplace` |
| `checkout-test@garudhub.local` | `ChangeMeDemo123!` | `BUYER` (Dedicated QA) | `/buyer/cart` |
| `government@garudhub.local` | `ChangeMeDemo123!` | `GOVERNMENT` | `/marketplace` |

---

## 13. Testing and Quality Assurance

### 13.1 Verified Execution Status

| Check / Test Command | Execution Result | Exit Code | Notes / Evidence |
|---|---|---|---|
| `npm run build` in `backend` | **PASS** | `0` | NestJS compiles cleanly into `dist/`. |
| `npx tsc --noEmit` in `frontend` | **PASS** | `0` | Next.js and React 19 TypeScript types check with zero errors. |
| `npm run prisma migrate status` | **PASS** | `0` | All 8 database migrations applied; schema is up to date. |
| `npm run lint` in `backend` | **FAIL** | `1` | 41 ESLint errors: unused variables (`adminUserId`, `reason`), unused imports, and unsafe `any` in `checkout.service.ts`. |
| `npm run lint` in `frontend` | **FAIL (Interactive)** | Canceled | Next.js 15 requires an explicit ESLint configuration file; prompts interactively on execution. |
| `npm test` in `backend` | **FAIL** | `1` | Zero unit test files match `.*\.spec\.ts$`. Jest exits code 1. |
| `npm run test:e2e` in `backend` | **FAIL** | `1` | Jest CommonJS loader fails to import ESM `@nestjs/config` v12 in `app.e2e-spec.ts`. |

### 13.2 Manual Verification Checklist (End-to-End Golden Paths)
- [x] **Path 1: Partner Onboarding & KYC Approval**
  1. Register at `/auth/register` with account type `MANUFACTURER`.
  2. Navigate to `/partner/application`, fill company profile, and upload GST PDF at `/partner/documents`.
  3. Submit application. Status changes to `SUBMITTED`.
  4. Login as `admin@garudhub.local`, navigate to `/admin`, open application, click **Approve Application**.
  5. Relogin as partner. Verify catalog creation is now unlocked.
- [x] **Path 2: Catalog Creation & Dual-Gate Publishing**
  1. As verified partner, open `/partner/catalog/new`.
  2. Enter title, price ₹2,85,000, SKU, and upload image. Observe live card preview update.
  3. Click **Submit for Review**. Status changes to `PENDING_REVIEW`.
  4. As admin, open `/admin/listings`, select listing, click **Approve & Publish**.
  5. As unauthenticated guest, open `/marketplace`. Verify listing is visible.
- [x] **Path 3: Cart, Checkout & Hybrid Payment**
  1. Login as `checkout-test@garudhub.local`.
  2. Add published drone to cart. Open `/buyer/cart`.
  3. Click **Proceed to Checkout** (`/buyer/checkout`).
  4. Observe saved address pre-filled. Toggle address edit.
  5. Click **Place Order**.
  6. In `PaymentGatewayModal`, select Razorpay (Test) or Bank Transfer (UTR). Complete transaction.
  7. Confirm order status under `/buyer/orders/[id]`.
- [x] **Path 4: RFQ Quoting & Matching**
  1. As buyer, submit RFQ under `/buyer/rfqs/new`.
  2. Log in as partner in matching category. Open `/partner/rfqs`.
  3. Submit quotation with price and lead time.
  4. As buyer, open `/buyer/rfqs/[id]`, review quotation table.

---

## 14. Deployment and Production Status

### 14.1 Production State
- **Live Public URL:** [https://garudhub.com/](https://garudhub.com/)
- **Nature of Live Site:** The live URL is currently hosted on an external WordPress/legacy server serving static marketing pages. The Next.js platform and NestJS API in this repository have **not yet been deployed to production**.
- **Containerization Status:** Docker is currently used only for local development database hosting (`docker-compose.yml`). No production `Dockerfile` currently exists for the NestJS backend or Next.js frontend.

### 14.2 Production Readiness Assessment: **Not Yet Ready**
Before deploying to production, the following infrastructure must be established:
1. **Cloud Object Storage:** Transition `./uploads` to AWS S3, Cloudflare R2, or Google Cloud Storage with pre-signed upload URLs.
2. **Secure Cookie Auth:** Transition JWT storage from `localStorage` to `httpOnly` secure cookies.
3. **Containerization:** Create multi-stage production `Dockerfile`s for NestJS and Next.js.
4. **CI/CD Pipeline:** Configure GitHub Actions for linting, testing, and automated deployment.
5. **Domain Routing:** Configure reverse proxy (Nginx or Cloudflare) to route marketing and platform traffic cleanly.

---

## 15. Known Issues and Technical Debt

| Issue ID | Description | Severity | Evidence File / Line | User / Business Impact | Root Cause | Recommended Fix |
|---|---|---|---|---|---|---|
| **ISS-01** | JWT stored in browser `localStorage` | **P0** | `frontend/lib/api/auth-storage.ts:6-16` | Security vulnerability: tokens exposed to XSS attacks. | Convenience implementation during Phase A MVP. | Migrate to `httpOnly`, `SameSite=Lax`, `Secure` cookies. |
| **ISS-02** | File uploads stored on local disk | **P0** | `backend/src/modules/documents/partner-documents.controller.ts:47` | Ephemeral cloud containers will lose KYC documents and listing media. | Used local disk `./uploads` for local development simplicity. | Implement S3/R2 storage adapter using `@aws-sdk/client-s3`. |
| **ISS-03** | Jest E2E runner broken by ESM `@nestjs/config` | **P1** | `backend/test/app.e2e-spec.ts:2` | Automated testing cannot run in CI/CD pipeline. | `@nestjs/config` v12 is pure ESM; Jest runs CommonJS. | Add `transformIgnorePatterns` in `jest-e2e.json` or configure Jest ESM mode. |
| **ISS-04** | 41 ESLint errors in backend | **P1** | `backend/src/modules/admin/admin.service.ts:572`<br>`backend/src/modules/commerce/checkout.service.ts:217` | Code quality degradation; CI lint step fails. | Unused parameters and unsafe `any` mappings in order transactions. | Remove unused variables; add explicit TypeScript type interfaces in `checkout.service.ts`. |
| **ISS-05** | Zero automated unit tests | **P1** | `backend/src/` | Risk of silent regressions when refactoring. | Team prioritized feature velocity over unit tests. | Add unit test specs for `AuthService`, `CartService`, and `PaymentsService`. |
| **ISS-06** | Missing transactional email/SMS notifications | **P2** | `backend/src/modules/commerce/checkout.service.ts` | Users do not receive order confirmation or quotation alerts. | Notification service deferred to future phase. | Integrate Resend/SendGrid and Twilio/MSG91. |
| **ISS-07** | Next.js interactive ESLint prompt | **P2** | `frontend/package.json#scripts` | `npm run lint` fails in non-interactive CI environments. | Missing `.eslintrc.json` or `eslint.config.mjs` for Next.js 15. | Initialize flat ESLint configuration in `frontend/`. |
| **ISS-08** | Hardcoded demo listing image CDN URLs | **P3** | `backend/prisma/seed.ts:117` | Demo listings rely on external image host (`i.ibb.co`). | Temporary placeholder for development seed. | Bundle default placeholder assets inside `frontend/public/`. |

---

## 16. Pending Work and Development Roadmap

### Phase 0: Stabilization, Security & CI (Immediate Priority)
- **TASK-001 [P0]:** Migrate JWT token handling from `localStorage` to `httpOnly` secure cookies.
- **TASK-002 [P0]:** Implement cloud object storage adapter (AWS S3 / Cloudflare R2) for KYC documents and listing media.
- **TASK-003 [P1]:** Resolve backend ESLint 41 errors and add non-interactive ESLint config in frontend.
- **TASK-004 [P1]:** Fix Jest E2E test configuration to support `@nestjs/config` ESM imports.

### Phase 1: Marketplace & RFQ Polishing
- **TASK-101 [P1]:** Implement "Accept Quotation → Create Commerce Order" flow.
- **TASK-102 [P2]:** Add full-text search bar and faceted filters (price range, payload capacity) on `/marketplace`.
- **TASK-103 [P2]:** Implement cursor or offset pagination for marketplace catalog and admin tables.

### Phase 2: Operations, Notifications & Moderation Expansion
- **TASK-201 [P1]:** Implement transactional email notifications (order placed, KYC approved, RFQ quote received).
- **TASK-202 [P2]:** Build Admin User & Role Management Console (`/admin/users`).
- **TASK-203 [P2]:** Expose `VerificationAuditLog` and `ListingModerationAuditLog` directly in the admin UI.

### Phase 3: Production Deployment & Cloud Infrastructure
- **TASK-301 [P1]:** Create production multi-stage `Dockerfile`s for NestJS and Next.js.
- **TASK-302 [P1]:** Set up GitHub Actions CI workflow (lint, typecheck, migrate, test).
- **TASK-303 [P2]:** Set up production database backups, connection pooling, and SSL certificates.

### Phase 4: Platform Enhancements (Future)
- **TASK-401 [P3]:** Multi-vendor shopping cart with automatic order splitting.
- **TASK-402 [P3]:** Integration with DGCA DigitalSky pilot certificate verification API.
- **TASK-403 [P3]:** Multilingual platform localization (Hindi i18n).

---

## 17. Important Technical Decisions

1. **Two-Surface Single-Origin Frontend:** Next.js serves both legacy static marketing HTML snapshots and interactive React platform routes on the same origin (`:3001`), bridging CTAs dynamically via `lib/snapshot-html.ts`. This avoids maintaining two separate domains during the transition.
2. **Reverse Proxy API Strategy:** Next.js proxies all API requests via `/platform-api/v1/*` to the NestJS server on `:3000`. This completely eliminates cross-origin resource sharing (CORS) complications and preflight delays in the browser.
3. **Single-Vendor Cart Enforcement:** B2B commercial drone transactions involve high invoice amounts, vendor-specific shipping logistics, and distinct GSTIN tax compliance. The cart strictly enforces items from a single vendor, throwing HTTP 409 if a buyer attempts to mix vendors.
4. **Dual-Gate Publishing Model:** Prevents unverified or fraudulent listings on the public marketplace. Gate 1 verifies the legal business entity (`VerificationStatus = APPROVED`). Gate 2 reviews and moderates the specific product listing (`ListingReviewStatus = APPROVED`).
5. **Hybrid Payment Architecture:** Direct online card/netbanking payments are processed via Razorpay SDK (with an automated sandbox fallback for test environments). High-value enterprise purchases (> ₹1,00,000) support offline corporate NEFT/RTGS wire transfer submissions with admin UTR reconciliation.

---

## 18. Client Requirements and Open Questions

### 18.1 Confirmed Client Requirements
- Connect Indian drone manufacturers, buyers, distributors, service providers, and government entities.
- Mandatory business verification (GST, CIN, company registration) before vendor trading.
- Support for RFQ procurement matching and quotation negotiation.
- Direct marketplace checkout adhering to Indian B2B purchasing standards (GSTIN, PO number).
- Dual payment capabilities: online gateway + offline bank transfer wire settlement.

### 18.2 Open Business Decisions Requiring Client Clarification
1. **RFQ Order Conversion:** When an enterprise buyer accepts a vendor's quotation, should the platform automatically generate a standard commerce `Order` and initiate the checkout/payment flow, or should it remain an offline contract negotiation?
2. **Platform Monetization Model:** Will GarudHub take a percentage commission on online order transactions (e.g., 2–5% platform fee), or will it operate on a flat SaaS vendor subscription model?
3. **Cloud Storage Provider:** Which cloud provider does the client prefer for production file storage (AWS S3, Cloudflare R2, or Google Cloud Storage)?
4. **Transactional Email / SMS Gateway:** Which Indian SMS / OTP gateway provider should be integrated (e.g., MSG91, Twilio, Kaleyra) for order and KYC notifications?
5. **Live Domain Migration Strategy:** When should `garudhub.com` DNS records be cut over from the legacy host to the Next.js frontend?

---

## 19. AI Assistant Handoff Context

### 19.1 Orientation for Incoming AI Assistants
GarudHub is a full-stack TypeScript project structured into `backend/` (NestJS 11 + Prisma 6 + PostgreSQL 16) and `frontend/` (Next.js 15.5 App Router + React 19).

**Key Architectural Rules:**
1. **Never break the reverse proxy:** Frontend components call `/platform-api/v1/...` which routes to NestJS at `http://127.0.0.1:3000/api/v1/...`. Do not hardcode port 3000 into browser fetch calls.
2. **Never allow multi-vendor carts:** `CartService` enforces single-vendor carts by design. Do not bypass or remove the `partnerOrganizationId` validation.
3. **Preserve the Dual Publish Gates:** Listings require both `organization.verificationStatus === APPROVED` AND `listing.reviewStatus === APPROVED` before appearing in `/marketplace`. Do not bypass either gate.
4. **Database Port is 5434:** When connecting directly to PostgreSQL from the host, port `5434` must be used (container port `5432` is mapped to `5434` in `docker-compose.yml`).
5. **Styling Rules:** Vanilla CSS design tokens in `frontend/app/styles/platform.css` are used across the platform. Do not introduce TailwindCSS without explicit instructions.

### 19.2 Safest Next Development Task
The safest, highest-leverage next task to execute is **TASK-003 / TASK-004: Fixing the backend ESLint errors and Jest E2E test configuration**. This stabilizes the CI/CD pipeline and establishes automated testing without altering any runtime user behavior.

---

## 20. Immediate Next Actions

### 1. Fix Jest E2E Configuration for ESM `@nestjs/config`
- **Why Now:** Automated regression testing is completely blocked.
- **Action:** Update `backend/test/jest-e2e.json` with appropriate `transformIgnorePatterns` or module mapper so Jest can import `@nestjs/config` v12.
- **Verification:** Run `npm run test:e2e` in `backend` and confirm tests pass with code 0.

### 2. Clean Up 41 Backend ESLint Errors
- **Why Now:** Unused variables and unsafe `any` mappings degrade maintainability and prevent CI pipelines from succeeding.
- **Action:** Fix unused parameters in `admin.service.ts:572`, remove unused imports in `partner-catalog.controller.ts`, and provide explicit type annotations in `checkout.service.ts:217`.
- **Verification:** Run `npm run lint` in `backend` and verify 0 errors.

### 3. Transition JWT Authentication from LocalStorage to HttpOnly Cookies
- **Why Now:** Critical security vulnerability (P0) exposing access and refresh tokens to potential XSS exfiltration.
- **Action:** Update `AuthService` to set `Set-Cookie` headers for `accessToken` and `refreshToken`, update `JwtStrategy` to extract tokens from cookies, and update frontend fetch client.
- **Verification:** Verify login, dashboard access, and token refresh in browser devtools with zero tokens in `localStorage`.

### 4. Implement S3/R2 Cloud Object Storage Adapter
- **Why Now:** Uploaded partner KYC documents and listing media currently reside on local disk (`backend/uploads/`), which will be destroyed upon container restart in production.
- **Action:** Create a storage provider abstraction with an AWS S3 / Cloudflare R2 implementation using `@aws-sdk/client-s3`.
- **Verification:** Upload a listing image and verify it streams from the cloud bucket.

### 5. Add Direct "Orders" Link in Buyer Navigation Header
- **Why Now:** Buyers currently have no direct link in the top navigation bar to access their purchase history (`/buyer/orders`).
- **Action:** Update `frontend/components/marketing/MarketingHeader.tsx` to include an "Orders" link for users with `BUYER` or `GOVERNMENT` role.
- **Verification:** Log in as `buyer@garudhub.local` and confirm "Orders" appears in the top navigation.
