# Partial completion backlog (spec → done)

**Sources:** `docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md`, `docs/CODE_LEVEL_STATUS.md`, `docs/DECODE_JWT_SPEC.txt`, `README.md` (Partial bucket)  
**Rule:** Finish **Partial** items before **Not started** mega-features (Leads DB, training batches, React home rewrite, in-app messaging).

**Evidence convention:** Primary file(s) that prove the gap exists today.

---

## Inventory — every Partial / hybrid item (with file evidence)

| ID | Area | Current gap | Evidence |
|----|------|-------------|----------|
| P-UI-01 | Home | Snapshot `/`, not spec React blocks; nav parity ~40% | `frontend/app/route.ts`, gap §2 Home |
| P-UI-02 | Drone Services hub | 8 marketing sections only; per-vertical routes missing | `frontend/app/(platform)/services/page.tsx`, gap §2 |
| P-UI-03 | Marketplace browse | No spec search bar; capped `take` only | `MarketplaceClient.tsx`, `catalog.service.ts` `browsePublic`, gap §2 |
| P-UI-04 | Marketplace PDP | No “Request demo” CTA | `frontend/app/(platform)/marketplace/listings/[id]/page.tsx`, gap §2 |
| P-UI-05 | Marketplace vendors | Storefront only; no vendor directory index | `marketplace.controller.ts` `GET partners/:orgId`, gap §2 |
| P-UI-06 | Join / Register | Split signup + post-login KYC vs single wireframe page | `auth/register`, `partner/application`, gap §2 |
| P-UI-07 | Partner dashboard modules | Spec sidebar 12 modules; ~6 live routes | `PartnerSubnav.tsx`, gap §2 Partner dashboard ~45% |
| P-UI-08 | Partner “Services” module | SERVICE type in catalog only | `partner/catalog/*`, `ListingType.SERVICE`, gap §2 |
| P-UI-09 | Admin console | No enquiry queue, user mgmt, partnership moderation | `AdminSubnav.tsx`, `admin.service.ts`, gap §2 Admin ~70% |
| P-UI-10 | Enquiry surface | Legacy snapshot + PHP proxy | `app/enquiry.php/route.ts`, `app/api/enquiry`, gap §2 Enquiry |
| P-UI-11 | Design / chrome | All platform uses `MarketingShell`; `PlatformShell` unused | `(platform)/layout.tsx`, `PlatformShell.tsx`, gap §6.1 #4 |
| P-UI-12 | Marketing migration | 47 snapshots + 3 React flagship pages | `content/pages/manifest.json`, `about-us`/`services`/`b2b-partners`, CODE_LEVEL §2 |
| P-UI-13 | Audit log UI | DB logs; no global viewer | `CODE_LEVEL_STATUS.md` feature matrix “Audit log UI **Partial**”, admin listing detail only |
| P-UX-01 | Buyer search journey | Weak marketplace search | gap §3 Buyer journey ~78% |
| P-UX-02 | Service vertical journeys | CTAs often → `/enquiry.php` | `services/page.tsx`, gap §3 Service vertical ~30% |
| P-UX-03 | Partner leads story | RFQs/orders only; no enquiry inbox | gap §3 Partner register ~72% |
| P-UX-04 | Cross-surface nav | Cart not in header (import only) | `MarketingHeader.tsx` imports `CartNavLink` unused; runbook P1 |
| P-UX-05 | International / gov journeys | Marketing copy; no dedicated UX | gap §3 |
| P-BE-01 | Marketplace API | Filters only; no `q` / pagination contract | `marketplace.controller.ts`, `browsePublic`, CODE_LEVEL §7 #2 |
| P-BE-02 | Payments | Razorpay + UTR OK; partner subscription ~0% | `payments.service.ts`, gap §4 Payments ~70% |
| P-BE-03 | Enquiries backend | Proxy only; no Prisma model | gap §4 Enquiries ~10% |
| P-BE-04 | Partnerships | Org fields only; no workflow | `partner/application` partnershipTypes, gap §4 |
| P-BE-05 | Training / service matching | Listing category only | gap §4 Training ~10%, Service matching ~0% |
| P-BE-06 | Auth storage | JWT in localStorage | `AuthProvider.tsx`, README Partial bucket |
| P-BE-07 | File uploads | Local disk `./uploads` | README Partial bucket |
| P-INT-01 | Integrations | No CRM/email/subscription billing | gap §4 Integrations ~38% |
| P-INT-02 | Production Razorpay | Sandbox / env-dependent webhook | README Partial payment gateway |

**Explicitly Not started (defer):** Leads entity, Messages, Analytics, partner Subscription billing, vendor directory page, product compare matrix, React home rewrite, training batches, gov tenders DB, admin user CRUD, httpOnly cookies (security project), COD flow.

---

## Phase A — Surface clarity & demo polish (client-visible, S/M)

| Task | Current gap | Done criteria | Effort | Depends |
|------|-------------|---------------|--------|---------|
| A1 Wire `CartNavLink` in header | Buyers lack cart in global nav | `CartNavLink` rendered for BUYER/GOVERNMENT in `MarketingHeader` | S | — |
| A2 Marketplace search (v1) | No search bar / API `q` | `GET /marketplace/listings?q=` case-insensitive name/description/brand; UI search + URL `q` | S | — |
| A3 Partner dashboard honesty | Spec modules missing | Roadmap modules labeled “Coming soon” in partner subnav; live tabs unchanged | S | — |
| A4 Services platform CTAs | Most pillars → enquiry.php | At least one additional pillar primary CTA → `/marketplace` or `/buyer/rfqs/new` | S | — |
| A5 Buyer header parity | README noted missing orders link | “My Orders” visible for buyers (verify) | S | Done if present |
| A6 Home link parity | Snapshot home vs React nav | Snapshot CTAs point to `/services`, `/marketplace`, `/b2b-partners` (localization) | M | marketing bridge |
| A7 Commit / ship React marketing trio | WIP pages | `/about-us`, `/services`, `/b2b-partners` on main branch | S | git process |

---

## Phase B — Partial backend & lead loop (M/L, still “Partial → Done”)

| Task | Current gap | Done criteria | Effort | Depends |
|------|-------------|---------------|--------|---------|
| B1 Native enquiry API | ~~PHP proxy~~ **Done** | `Enquiry` model + POST + admin list; listing/services POST creates row | L | schema migration |
| B2 Marketplace pagination | ~~`take` cap 50~~ **Done** | `skip`/`take` + total count or cursor in API + UI | M | A2 |
| B3 Vendor directory | No `/marketplace/vendors` | Public list of verified orgs with listing counts | M | — |
| B4 Listing PDP CTAs | No request demo | Demo CTA → enquiry or RFQ with listing context | S | B1 optional |
| B5 Audit log viewer | Partial admin surfacing | Admin page for KYC + listing moderation logs | M | — |
| B6 Platform chrome decision | Unused `PlatformShell` | `/partner`, `/buyer`, `/admin` use platform chrome OR delete dead shell + doc | M | design sign-off |
| B7 Payments hardening | Test keys, webhook | Live webhook validation runbook + env docs | M | ops |
| B8 httpOnly session | localStorage JWT | Cookie-based refresh/access | L | security review |

---

## Phase C — Spec depth (L; after A/B)

| Task | Current gap | Done criteria | Effort | Depends |
|------|-------------|---------------|--------|---------|
| C1 Leads module | ~0% | Lead entity + partner inbox for non-RFQ intents | L | B1 |
| C2 Messages | ~0% | Threaded partner–buyer messages | L | C1 |
| C3 Analytics | ~0% | Listing views, enquiry counts on partner overview | L | B1, tracking |
| C4 Partner subscription | ~0% | Billing plan + Razorpay subscription | L | B7 |
| C5 Training vertical | ~25% UX | Courses/batches/student leads | L | schema |
| C6 Gov tenders | ~35% UX | Tender/scheme modules | L | schema |
| C7 React home | ~40% nav alignment | Spec blocks in React at `/` | L | A6 |
| C8 Service matching workflow | ~0% | Submit requirement → match providers | L | B1, C1 |

---

## Session focus (this pass)

Implemented from Phase A: **A1, A2, A3, A4**; Phase B: **B1** (native enquiry API), **B2** (marketplace `skip`/`take` + total + UI pagination). Next recommended: **B3** (vendor directory) + **A6** (home link parity).

---

*Maintained alongside `SPEC_VS_PROJECT_GAP_ANALYSIS.md`. Re-run inventory when route count or Prisma models change.*
