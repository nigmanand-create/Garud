# Manual URL test list

Generated from `frontend/app` routes, `frontend/middleware.ts`, `frontend/scripts/verify-snapshots.mjs`, `frontend/content/raw`, [`STAGING_SMOKE_GUIDE.md`](./STAGING_SMOKE_GUIDE.md), and [`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md). Paths are **deduplicated by section** (bridge sources live under Snapshots; React targets under Public).

## Bases

| Surface | Local | Staging |
|---------|-------|---------|
| Web (Next) | http://localhost:3001 | https://dev.garudhub.me |
| API direct | http://127.0.0.1:3000/api/v1 | Prefer https://dev.garudhub.me/platform-api/v1 (same origin cookies) |
| API via Next proxy | http://localhost:3001/platform-api/v1 | https://dev.garudhub.me/platform-api/v1 |

**IDs:** Replace `{listingId}`, `{orderId}`, `{rfqId}`, `{orgId}`, `{courseId}`, `{opportunityId}`, `{trackingToken}` from list pages or API responses after `npm run prisma:seed` in `backend/`. Checkout QA listing: **Garud AgriSpray X1** (`GD-AGRI-X1`).

**Local snapshot smoke:** `cd frontend && npm run dev` then `node scripts/verify-snapshots.mjs`.

---

## Public (React / anonymous-friendly)

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/` | http://localhost:3001/ | https://dev.garudhub.me/ | React home (also in snapshot smoke as `/`) |
| `/about-us` | http://localhost:3001/about-us | https://dev.garudhub.me/about-us |  |
| `/b2b-partners` | http://localhost:3001/b2b-partners | https://dev.garudhub.me/b2b-partners |  |
| `/enquiry` | http://localhost:3001/enquiry | https://dev.garudhub.me/enquiry | Lead form; POST via API `/enquiries` |
| `/enquiry?service=repair` | http://localhost:3001/enquiry?service=repair | https://dev.garudhub.me/enquiry?service=repair | Pre-filled service key → repair vertical |
| `/marketplace` | http://localhost:3001/marketplace | https://dev.garudhub.me/marketplace | Browse listings; empty state if unseeded |
| `/marketplace?section=accessories` | http://localhost:3001/marketplace?section=accessories | https://dev.garudhub.me/marketplace?section=accessories | Accessories section (bridge target for `/drone-accessories`) |
| `/marketplace/vendors` | http://localhost:3001/marketplace/vendors | https://dev.garudhub.me/marketplace/vendors |  |
| `/marketplace/distributor` | http://localhost:3001/marketplace/distributor | https://dev.garudhub.me/marketplace/distributor |  |
| `/marketplace/partners/{orgId}` | http://localhost:3001/marketplace/partners/{orgId} | https://dev.garudhub.me/marketplace/partners/{orgId} | Resolve `{orgId}` from listing PDP or `GET /marketplace/vendors` |
| `/marketplace/listings/{listingId}` | http://localhost:3001/marketplace/listings/{listingId} | https://dev.garudhub.me/marketplace/listings/{listingId} | After seed: SKU `GD-AGRI-X1` — open from `/marketplace` |
| `/marketplace/compare?ids={listingId1},{listingId2}` | http://localhost:3001/marketplace/compare?ids={listingId1},{listingId2} | https://dev.garudhub.me/marketplace/compare?ids={listingId1},{listingId2} | Pick two published listing UUIDs from marketplace |
| `/services` | http://localhost:3001/services | https://dev.garudhub.me/services | Service hub with hash anchors (#training, #compliance, …) |
| `/services/compliance` | http://localhost:3001/services/compliance | https://dev.garudhub.me/services/compliance | 307/redirect → `/services/request?category=COMPLIANCE` |
| `/services/repair` | http://localhost:3001/services/repair | https://dev.garudhub.me/services/repair | → `/services/request?category=REPAIR_AMC` |
| `/services/professional` | http://localhost:3001/services/professional | https://dev.garudhub.me/services/professional | → `/services/request?category=PROFESSIONAL` |
| `/services/finance` | http://localhost:3001/services/finance | https://dev.garudhub.me/services/finance | → `/services/request?category=FINANCE_INSURANCE` |
| `/services/recycling` | http://localhost:3001/services/recycling | https://dev.garudhub.me/services/recycling | → `/services/request?category=SCRAP_RECYCLING` |
| `/services/scrap` | http://localhost:3001/services/scrap | https://dev.garudhub.me/services/scrap | → `/services/request?category=SCRAP_RECYCLING` |
| `/services/training` | http://localhost:3001/services/training | https://dev.garudhub.me/services/training | → `/training` |
| `/services/government` | http://localhost:3001/services/government | https://dev.garudhub.me/services/government | → `/government` |
| `/services/projects` | http://localhost:3001/services/projects | https://dev.garudhub.me/services/projects | → `/government` |
| `/services/marketplace` | http://localhost:3001/services/marketplace | https://dev.garudhub.me/services/marketplace | → `/marketplace` |
| `/services/request` | http://localhost:3001/services/request | https://dev.garudhub.me/services/request | Service intake form |
| `/services/request?category=COMPLIANCE` | http://localhost:3001/services/request?category=COMPLIANCE | https://dev.garudhub.me/services/request?category=COMPLIANCE | Category-specific intake |
| `/services/request?category=REPAIR_AMC` | http://localhost:3001/services/request?category=REPAIR_AMC | https://dev.garudhub.me/services/request?category=REPAIR_AMC |  |
| `/services/request?category=PROFESSIONAL` | http://localhost:3001/services/request?category=PROFESSIONAL | https://dev.garudhub.me/services/request?category=PROFESSIONAL |  |
| `/services/request?category=FINANCE_INSURANCE` | http://localhost:3001/services/request?category=FINANCE_INSURANCE | https://dev.garudhub.me/services/request?category=FINANCE_INSURANCE |  |
| `/services/request?category=SCRAP_RECYCLING` | http://localhost:3001/services/request?category=SCRAP_RECYCLING | https://dev.garudhub.me/services/request?category=SCRAP_RECYCLING |  |
| `/services/track/{trackingToken}` | http://localhost:3001/services/track/{trackingToken} | https://dev.garudhub.me/services/track/{trackingToken} | Public tracker; token from service-request email/API |
| `/government` | http://localhost:3001/government | https://dev.garudhub.me/government | Published tenders/schemes |
| `/government/{opportunityId}` | http://localhost:3001/government/{opportunityId} | https://dev.garudhub.me/government/{opportunityId} | Detail; pick ID from list page |
| `/training` | http://localhost:3001/training | https://dev.garudhub.me/training | Published courses |
| `/training/{courseId}` | http://localhost:3001/training/{courseId} | https://dev.garudhub.me/training/{courseId} | Course detail; pick ID from list page |

---

## Snapshots (legacy HTML + bridges)

All `frontend/content/raw` routes (48) plus middleware-only URLs. Bridged paths return **307** to the React target in [`SNAPSHOT_REACT_BRIDGE`](../frontend/lib/snapshot-bridge.ts). Blog (`/blogging`, posts, categories) and legal (`/legal.php/*`) snapshot **bodies** render inside platform **`MarketingShell`** — see `app/(platform)/blogging` and `app/(platform)/legal.php/[page]`.

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/` | http://localhost:3001/ | https://dev.garudhub.me/ | React home; included in `verify-snapshots.mjs` smoke |
| `/about-us` | http://localhost:3001/about-us | https://dev.garudhub.me/about-us | React page **200** (not a bridge; legacy `/about.php` → here) |
| `/blogging` | http://localhost:3001/blogging | https://dev.garudhub.me/blogging | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/agriculture-drones` | http://localhost:3001/blogging/category/agriculture-drones | https://dev.garudhub.me/blogging/category/agriculture-drones | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/commercial-drones` | http://localhost:3001/blogging/category/commercial-drones | https://dev.garudhub.me/blogging/category/commercial-drones | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/commercial-drones-2` | http://localhost:3001/blogging/category/commercial-drones-2 | https://dev.garudhub.me/blogging/category/commercial-drones-2 | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-finance-insurance` | http://localhost:3001/blogging/category/drone-finance-insurance | https://dev.garudhub.me/blogging/category/drone-finance-insurance | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-guides` | http://localhost:3001/blogging/category/drone-guides | https://dev.garudhub.me/blogging/category/drone-guides | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-industry` | http://localhost:3001/blogging/category/drone-industry | https://dev.garudhub.me/blogging/category/drone-industry | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-maintenance-repair` | http://localhost:3001/blogging/category/drone-maintenance-repair | https://dev.garudhub.me/blogging/category/drone-maintenance-repair | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-recycling-sustainability` | http://localhost:3001/blogging/category/drone-recycling-sustainability | https://dev.garudhub.me/blogging/category/drone-recycling-sustainability | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-regulations-dgca` | http://localhost:3001/blogging/category/drone-regulations-dgca | https://dev.garudhub.me/blogging/category/drone-regulations-dgca | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-technology` | http://localhost:3001/blogging/category/drone-technology | https://dev.garudhub.me/blogging/category/drone-technology | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/category/drone-training-careers` | http://localhost:3001/blogging/category/drone-training-careers | https://dev.garudhub.me/blogging/category/drone-training-careers | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/10-things-to-know-before-buying-a-drone-in-india` | http://localhost:3001/blogging/post/10-things-to-know-before-buying-a-drone-in-india | https://dev.garudhub.me/blogging/post/10-things-to-know-before-buying-a-drone-in-india | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/agriculture-drones-in-india-how-drone-technology-is-transforming-modern-farming` | http://localhost:3001/blogging/post/agriculture-drones-in-india-how-drone-technology-is-transforming-modern-farming | https://dev.garudhub.me/blogging/post/agriculture-drones-in-india-how-drone-technology-is-transforming-modern-farming | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/commercial-drones-in-india-how-businesses-are-using-drone-technology` | http://localhost:3001/blogging/post/commercial-drones-in-india-how-businesses-are-using-drone-technology | https://dev.garudhub.me/blogging/post/commercial-drones-in-india-how-businesses-are-using-drone-technology | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/dgca-drone-rules-in-india-what-you-need-to-know-before-flying-a-drone` | http://localhost:3001/blogging/post/dgca-drone-rules-in-india-what-you-need-to-know-before-flying-a-drone | https://dev.garudhub.me/blogging/post/dgca-drone-rules-in-india-what-you-need-to-know-before-flying-a-drone | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-industry-in-india-career-opportunities-and-the-future-of-drone-technology` | http://localhost:3001/blogging/post/drone-industry-in-india-career-opportunities-and-the-future-of-drone-technology | https://dev.garudhub.me/blogging/post/drone-industry-in-india-career-opportunities-and-the-future-of-drone-technology | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-insurance-and-financing-in-india-what-drone-owners-and-businesses-should-know` | http://localhost:3001/blogging/post/drone-insurance-and-financing-in-india-what-drone-owners-and-businesses-should-know | https://dev.garudhub.me/blogging/post/drone-insurance-and-financing-in-india-what-drone-owners-and-businesses-should-know | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-recycling-and-sustainability-what-to-do-with-old-or-damaged-drones` | http://localhost:3001/blogging/post/drone-recycling-and-sustainability-what-to-do-with-old-or-damaged-drones | https://dev.garudhub.me/blogging/post/drone-recycling-and-sustainability-what-to-do-with-old-or-damaged-drones | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-repair-and-maintenance-how-to-keep-your-drone-safe-and-performing-better` | http://localhost:3001/blogging/post/drone-repair-and-maintenance-how-to-keep-your-drone-safe-and-performing-better | https://dev.garudhub.me/blogging/post/drone-repair-and-maintenance-how-to-keep-your-drone-safe-and-performing-better | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-surveying-and-mapping-how-drones-are-changing-land-surveying-in-india` | http://localhost:3001/blogging/post/drone-surveying-and-mapping-how-drones-are-changing-land-surveying-in-india | https://dev.garudhub.me/blogging/post/drone-surveying-and-mapping-how-drones-are-changing-land-surveying-in-india | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drone-technology-in-india-from-flying-machines-to-a-new-generation-of-professionals` | http://localhost:3001/blogging/post/drone-technology-in-india-from-flying-machines-to-a-new-generation-of-professionals | https://dev.garudhub.me/blogging/post/drone-technology-in-india-from-flying-machines-to-a-new-generation-of-professionals | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/drones-in-disaster-management-how-india-is-using-drone-technology-for-search-rescue-and-relief` | http://localhost:3001/blogging/post/drones-in-disaster-management-how-india-is-using-drone-technology-for-search-rescue-and-relief | https://dev.garudhub.me/blogging/post/drones-in-disaster-management-how-india-is-using-drone-technology-for-search-rescue-and-relief | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/blogging/post/how-to-become-a-professional-drone-pilot-in-india-a-complete-career-guide` | http://localhost:3001/blogging/post/how-to-become-a-professional-drone-pilot-in-india-a-complete-career-guide | https://dev.garudhub.me/blogging/post/how-to-become-a-professional-drone-pilot-in-india-a-complete-career-guide | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/business-setup-in-india` | http://localhost:3001/business-setup-in-india | https://dev.garudhub.me/business-setup-in-india | **307 bridge** → `/b2b-partners` (see Public) |
| `/dgca-compliance` | http://localhost:3001/dgca-compliance | https://dev.garudhub.me/dgca-compliance | **307 bridge** → `/services#compliance` (see Public) |
| `/drone-accessories` | http://localhost:3001/drone-accessories | https://dev.garudhub.me/drone-accessories | **307 bridge** → `/marketplace?section=accessories` (see Public) |
| `/drone-jobs-career` | http://localhost:3001/drone-jobs-career | https://dev.garudhub.me/drone-jobs-career | **307 bridge** → `/services#training` (see Public) |
| `/drone-marketplace` | http://localhost:3001/drone-marketplace | https://dev.garudhub.me/drone-marketplace | **307 bridge** → `/marketplace` (see Public) |
| `/drone-operations-setup` | http://localhost:3001/drone-operations-setup | https://dev.garudhub.me/drone-operations-setup | **307 bridge** → `/services#compliance` (see Public) |
| `/drone-training` | http://localhost:3001/drone-training | https://dev.garudhub.me/drone-training | **307 bridge** → `/services#training` (see Public) |
| `/edp-professional-services` | http://localhost:3001/edp-professional-services | https://dev.garudhub.me/edp-professional-services | **307 bridge** → `/services#professional` (see Public) |
| `/enquiry.php` | http://localhost:3001/enquiry.php | https://dev.garudhub.me/enquiry.php | **307 bridge** → `/enquiry` (see Public) |
| `/finance-insurance` | http://localhost:3001/finance-insurance | https://dev.garudhub.me/finance-insurance | **307 bridge** → `/services#finance` (see Public) |
| `/government-projects-schemes` | http://localhost:3001/government-projects-schemes | https://dev.garudhub.me/government-projects-schemes | **307 bridge** → `/services#government` (see Public) |
| `/india-market-entry` | http://localhost:3001/india-market-entry | https://dev.garudhub.me/india-market-entry | **307 bridge** → `/b2b-partners` (see Public) |
| `/industries-we-serve` | http://localhost:3001/industries-we-serve | https://dev.garudhub.me/industries-we-serve | **307 bridge** → `/#home-industries` (see Public) |
| `/legal.php/privacy` | http://localhost:3001/legal.php/privacy | https://dev.garudhub.me/legal.php/privacy | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/legal.php/refund` | http://localhost:3001/legal.php/refund | https://dev.garudhub.me/legal.php/refund | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/legal.php/tos` | http://localhost:3001/legal.php/tos | https://dev.garudhub.me/legal.php/tos | Legacy HTML (`frontend/scripts/verify-snapshots.mjs`) |
| `/loan-calculators.php` | http://localhost:3001/loan-calculators.php | https://dev.garudhub.me/loan-calculators.php | **307 bridge** → `/services#finance` (see Public) |
| `/manufacturing-technology-collaboration` | http://localhost:3001/manufacturing-technology-collaboration | https://dev.garudhub.me/manufacturing-technology-collaboration | **307 bridge** → `/b2b-partners` (see Public) |
| `/market-entry-consultancy` | http://localhost:3001/market-entry-consultancy | https://dev.garudhub.me/market-entry-consultancy | **307 bridge** → `/b2b-partners` (see Public) |
| `/partner-with-us` | http://localhost:3001/partner-with-us | https://dev.garudhub.me/partner-with-us | **307 bridge** → `/b2b-partners` (see Public) |
| `/repairs-maintenance` | http://localhost:3001/repairs-maintenance | https://dev.garudhub.me/repairs-maintenance | **307 bridge** → `/services#repair` (see Public) |
| `/scrap-recycling` | http://localhost:3001/scrap-recycling | https://dev.garudhub.me/scrap-recycling | **307 bridge** → `/services#recycling` (see Public) |

### Middleware query aliases (`frontend/middleware.ts`)

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/blogging?slug=10-things-to-know-before-buying-a-drone-in-india` | http://localhost:3001/blogging?slug=10-things-to-know-before-buying-a-drone-in-india | https://dev.garudhub.me/blogging?slug=10-things-to-know-before-buying-a-drone-in-india | Rewrites → `/blogging/post/10-things-to-know-before-buying-a-drone-in-india` |
| `/blogging?category=drone-guides` | http://localhost:3001/blogging?category=drone-guides | https://dev.garudhub.me/blogging?category=drone-guides | Rewrites → `/blogging/category/drone-guides` |
| `/legal.php?page=tos` | http://localhost:3001/legal.php?page=tos | https://dev.garudhub.me/legal.php?page=tos | Rewrites → `/legal.php/tos` |
| `/legal.php?page=privacy` | http://localhost:3001/legal.php?page=privacy | https://dev.garudhub.me/legal.php?page=privacy | Rewrites → `/legal.php/privacy` |
| `/legal.php?page=refund` | http://localhost:3001/legal.php?page=refund | https://dev.garudhub.me/legal.php?page=refund | Rewrites → `/legal.php/refund` |

### Bridge-only paths (no standalone snapshot HTML file)

- `/about.php` → `/about-us` (http://localhost:3001/about.php)
- `/blog` → `/blogging` (http://localhost:3001/blog)
- `/legal/privacy` → `/legal.php/privacy` (http://localhost:3001/legal/privacy)
- `/legal/refund` → `/legal.php/refund` (http://localhost:3001/legal/refund)
- `/legal/terms` → `/legal.php/tos` (http://localhost:3001/legal/terms)
- `/legal/tos` → `/legal.php/tos` (http://localhost:3001/legal/tos)

---

## Buyer (session: buyer / checkout-test / government)

Login: [`DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md) — prefer `checkout-test@garudhub.local` for cart/checkout.

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/buyer/cart` | http://localhost:3001/buyer/cart | https://dev.garudhub.me/buyer/cart | buyer@ / checkout-test@ |
| `/buyer/checkout` | http://localhost:3001/buyer/checkout | https://dev.garudhub.me/buyer/checkout | Razorpay test on staging/local |
| `/buyer/orders` | http://localhost:3001/buyer/orders | https://dev.garudhub.me/buyer/orders |  |
| `/buyer/orders/{orderId}` | http://localhost:3001/buyer/orders/{orderId} | https://dev.garudhub.me/buyer/orders/{orderId} | After checkout; receipt link on order row |
| `/buyer/rfqs` | http://localhost:3001/buyer/rfqs | https://dev.garudhub.me/buyer/rfqs |  |
| `/buyer/rfqs/new` | http://localhost:3001/buyer/rfqs/new | https://dev.garudhub.me/buyer/rfqs/new |  |
| `/buyer/rfqs/{rfqId}` | http://localhost:3001/buyer/rfqs/{rfqId} | https://dev.garudhub.me/buyer/rfqs/{rfqId} | Create RFQ first |
| `/buyer/messages` | http://localhost:3001/buyer/messages | https://dev.garudhub.me/buyer/messages | Conversations UI |

---

## Partner (session: partner@garudhub.local)

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/partner` | http://localhost:3001/partner | https://dev.garudhub.me/partner | partner@garudhub.local |
| `/partner/application` | http://localhost:3001/partner/application | https://dev.garudhub.me/partner/application | Draft/submitted application |
| `/partner/catalog` | http://localhost:3001/partner/catalog | https://dev.garudhub.me/partner/catalog |  |
| `/partner/catalog/new` | http://localhost:3001/partner/catalog/new | https://dev.garudhub.me/partner/catalog/new |  |
| `/partner/catalog/{listingId}` | http://localhost:3001/partner/catalog/{listingId} | https://dev.garudhub.me/partner/catalog/{listingId} | Includes draft SKUs e.g. GD-DRAFT-PROT |
| `/partner/documents` | http://localhost:3001/partner/documents | https://dev.garudhub.me/partner/documents |  |
| `/partner/orders` | http://localhost:3001/partner/orders | https://dev.garudhub.me/partner/orders |  |
| `/partner/orders/{orderId}` | http://localhost:3001/partner/orders/{orderId} | https://dev.garudhub.me/partner/orders/{orderId} |  |
| `/partner/rfqs` | http://localhost:3001/partner/rfqs | https://dev.garudhub.me/partner/rfqs |  |
| `/partner/rfqs/{rfqId}` | http://localhost:3001/partner/rfqs/{rfqId} | https://dev.garudhub.me/partner/rfqs/{rfqId} |  |
| `/partner/leads` | http://localhost:3001/partner/leads | https://dev.garudhub.me/partner/leads |  |
| `/partner/enquiries` | http://localhost:3001/partner/enquiries | https://dev.garudhub.me/partner/enquiries |  |
| `/partner/messages` | http://localhost:3001/partner/messages | https://dev.garudhub.me/partner/messages |  |
| `/partner/analytics` | http://localhost:3001/partner/analytics | https://dev.garudhub.me/partner/analytics |  |
| `/partner/activity` | http://localhost:3001/partner/activity | https://dev.garudhub.me/partner/activity |  |
| `/partner/partnerships` | http://localhost:3001/partner/partnerships | https://dev.garudhub.me/partner/partnerships |  |
| `/partner/services` | http://localhost:3001/partner/services | https://dev.garudhub.me/partner/services | Coverage / vertical links |
| `/partner/service-requests` | http://localhost:3001/partner/service-requests | https://dev.garudhub.me/partner/service-requests | Matched requests inbox |
| `/partner/subscription` | http://localhost:3001/partner/subscription | https://dev.garudhub.me/partner/subscription | Billing / plans |
| `/partner/training` | http://localhost:3001/partner/training | https://dev.garudhub.me/partner/training | Institute courses & leads |

---

## Admin (session: admin@garudhub.local)

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/admin` | http://localhost:3001/admin | https://dev.garudhub.me/admin | admin@garudhub.local |
| `/admin/analytics` | http://localhost:3001/admin/analytics | https://dev.garudhub.me/admin/analytics |  |
| `/admin/applications` | http://localhost:3001/admin/applications | https://dev.garudhub.me/admin/applications |  |
| `/admin/applications/{applicationId}` | http://localhost:3001/admin/applications/{applicationId} | https://dev.garudhub.me/admin/applications/{applicationId} |  |
| `/admin/audit-log` | http://localhost:3001/admin/audit-log | https://dev.garudhub.me/admin/audit-log |  |
| `/admin/billing` | http://localhost:3001/admin/billing | https://dev.garudhub.me/admin/billing |  |
| `/admin/enquiries` | http://localhost:3001/admin/enquiries | https://dev.garudhub.me/admin/enquiries | Includes `/enquiry` smoke submissions |
| `/admin/gov-opportunities` | http://localhost:3001/admin/gov-opportunities | https://dev.garudhub.me/admin/gov-opportunities |  |
| `/admin/gov-opportunities/{opportunityId}` | http://localhost:3001/admin/gov-opportunities/{opportunityId} | https://dev.garudhub.me/admin/gov-opportunities/{opportunityId} |  |
| `/admin/leads` | http://localhost:3001/admin/leads | https://dev.garudhub.me/admin/leads |  |
| `/admin/listings` | http://localhost:3001/admin/listings | https://dev.garudhub.me/admin/listings |  |
| `/admin/listings/{listingId}` | http://localhost:3001/admin/listings/{listingId} | https://dev.garudhub.me/admin/listings/{listingId} | e.g. pending GD-PEND-REV |
| `/admin/orders` | http://localhost:3001/admin/orders | https://dev.garudhub.me/admin/orders |  |
| `/admin/orders/{orderId}` | http://localhost:3001/admin/orders/{orderId} | https://dev.garudhub.me/admin/orders/{orderId} |  |
| `/admin/orders/{orderId}/payment` | http://localhost:3001/admin/orders/{orderId}/payment | https://dev.garudhub.me/admin/orders/{orderId}/payment |  |
| `/admin/orders/{orderId}/cancel` | http://localhost:3001/admin/orders/{orderId}/cancel | https://dev.garudhub.me/admin/orders/{orderId}/cancel |  |
| `/admin/partnerships` | http://localhost:3001/admin/partnerships | https://dev.garudhub.me/admin/partnerships |  |
| `/admin/service-requests` | http://localhost:3001/admin/service-requests | https://dev.garudhub.me/admin/service-requests |  |
| `/admin/users` | http://localhost:3001/admin/users | https://dev.garudhub.me/admin/users |  |

---

## API GET smoke

Prefix: `/api/v1` on API host, or `/platform-api/v1` through Next. Use browser (cookies) or `curl -b cookies.txt` after login.

### Public GET

| Endpoint | Local direct | Staging (proxy) | Auth |
|----------|--------------|-----------------|------|
| `GET /health` | http://127.0.0.1:3000/api/v1/health | https://dev.garudhub.me/platform-api/v1/health | No auth |
| `GET /marketplace/listings` | http://127.0.0.1:3000/api/v1/marketplace/listings | https://dev.garudhub.me/platform-api/v1/marketplace/listings |  |
| `GET /marketplace/listings/featured` | http://127.0.0.1:3000/api/v1/marketplace/listings/featured | https://dev.garudhub.me/platform-api/v1/marketplace/listings/featured |  |
| `GET /marketplace/listings/compare?ids={uuid},{uuid}` | http://127.0.0.1:3000/api/v1/marketplace/listings/compare?ids={uuid},{uuid} | https://dev.garudhub.me/platform-api/v1/marketplace/listings/compare?ids={uuid},{uuid} |  |
| `GET /marketplace/filters` | http://127.0.0.1:3000/api/v1/marketplace/filters | https://dev.garudhub.me/platform-api/v1/marketplace/filters |  |
| `GET /marketplace/listings/{id}` | http://127.0.0.1:3000/api/v1/marketplace/listings/{id} | https://dev.garudhub.me/platform-api/v1/marketplace/listings/{id} |  |
| `GET /marketplace/vendors` | http://127.0.0.1:3000/api/v1/marketplace/vendors | https://dev.garudhub.me/platform-api/v1/marketplace/vendors |  |
| `GET /marketplace/partners/{orgId}` | http://127.0.0.1:3000/api/v1/marketplace/partners/{orgId} | https://dev.garudhub.me/platform-api/v1/marketplace/partners/{orgId} |  |
| `GET /gov/opportunities` | http://127.0.0.1:3000/api/v1/gov/opportunities | https://dev.garudhub.me/platform-api/v1/gov/opportunities |  |
| `GET /gov/opportunities/{id}` | http://127.0.0.1:3000/api/v1/gov/opportunities/{id} | https://dev.garudhub.me/platform-api/v1/gov/opportunities/{id} |  |
| `GET /training/courses` | http://127.0.0.1:3000/api/v1/training/courses | https://dev.garudhub.me/platform-api/v1/training/courses |  |
| `GET /training/courses/{id}` | http://127.0.0.1:3000/api/v1/training/courses/{id} | https://dev.garudhub.me/platform-api/v1/training/courses/{id} |  |
| `GET /service-requests/track/{token}` | http://127.0.0.1:3000/api/v1/service-requests/track/{token} | https://dev.garudhub.me/platform-api/v1/service-requests/track/{token} | Public tracker token |
| `GET /media/listings/{orgId}/{fileName}` | http://127.0.0.1:3000/api/v1/media/listings/{orgId}/{fileName} | https://dev.garudhub.me/platform-api/v1/media/listings/{orgId}/{fileName} | Listing media asset |

### Authenticated GET

| Endpoint | Local direct | Staging (proxy) | Auth |
|----------|--------------|-----------------|------|
| `GET /auth/me` | http://127.0.0.1:3000/api/v1/auth/me | https://dev.garudhub.me/platform-api/v1/auth/me | Any logged-in role |
| `GET /buyer/cart` | http://127.0.0.1:3000/api/v1/buyer/cart | https://dev.garudhub.me/platform-api/v1/buyer/cart | Buyer |
| `GET /buyer/checkout/saved-address` | http://127.0.0.1:3000/api/v1/buyer/checkout/saved-address | https://dev.garudhub.me/platform-api/v1/buyer/checkout/saved-address | Buyer |
| `GET /buyer/orders` | http://127.0.0.1:3000/api/v1/buyer/orders | https://dev.garudhub.me/platform-api/v1/buyer/orders | Buyer |
| `GET /buyer/orders/{id}` | http://127.0.0.1:3000/api/v1/buyer/orders/{id} | https://dev.garudhub.me/platform-api/v1/buyer/orders/{id} | Buyer |
| `GET /buyer/orders/{id}/receipt.html` | http://127.0.0.1:3000/api/v1/buyer/orders/{id}/receipt.html | https://dev.garudhub.me/platform-api/v1/buyer/orders/{id}/receipt.html | Buyer HTML receipt |
| `GET /rfq` | http://127.0.0.1:3000/api/v1/rfq | https://dev.garudhub.me/platform-api/v1/rfq | Buyer RFQ list |
| `GET /rfq/{id}` | http://127.0.0.1:3000/api/v1/rfq/{id} | https://dev.garudhub.me/platform-api/v1/rfq/{id} | Buyer RFQ detail |
| `GET /rfq/{id}/quotations` | http://127.0.0.1:3000/api/v1/rfq/{id}/quotations | https://dev.garudhub.me/platform-api/v1/rfq/{id}/quotations | Buyer |
| `GET /buyer/service-requests` | http://127.0.0.1:3000/api/v1/buyer/service-requests | https://dev.garudhub.me/platform-api/v1/buyer/service-requests | Buyer |
| `GET /buyer/conversations` | http://127.0.0.1:3000/api/v1/buyer/conversations | https://dev.garudhub.me/platform-api/v1/buyer/conversations | Buyer messages |
| `GET /buyer/conversations/{id}` | http://127.0.0.1:3000/api/v1/buyer/conversations/{id} | https://dev.garudhub.me/platform-api/v1/buyer/conversations/{id} | Buyer |
| `GET /buyer/gov-opportunities/bids/mine` | http://127.0.0.1:3000/api/v1/buyer/gov-opportunities/bids/mine | https://dev.garudhub.me/platform-api/v1/buyer/gov-opportunities/bids/mine | Buyer / GOVERNMENT — all sealed bids |
| `GET /buyer/gov-opportunities/{id}/bids/mine` | http://127.0.0.1:3000/api/v1/buyer/gov-opportunities/{id}/bids/mine | https://dev.garudhub.me/platform-api/v1/buyer/gov-opportunities/{id}/bids/mine | Buyer / GOVERNMENT |
| `GET /notifications` | http://127.0.0.1:3000/api/v1/notifications | https://dev.garudhub.me/platform-api/v1/notifications | Authenticated |
| `GET /notifications/unread-count` | http://127.0.0.1:3000/api/v1/notifications/unread-count | https://dev.garudhub.me/platform-api/v1/notifications/unread-count | Authenticated |
| `GET /partner/me` | http://127.0.0.1:3000/api/v1/partner/me | https://dev.garudhub.me/platform-api/v1/partner/me | Partner |
| `GET /partner/overview` | http://127.0.0.1:3000/api/v1/partner/overview | https://dev.garudhub.me/platform-api/v1/partner/overview | Partner dashboard stats |
| `GET /partner/analytics` | http://127.0.0.1:3000/api/v1/partner/analytics | https://dev.garudhub.me/platform-api/v1/partner/analytics | Partner |
| `GET /partner/analytics/export.csv` | http://127.0.0.1:3000/api/v1/partner/analytics/export.csv | https://dev.garudhub.me/platform-api/v1/partner/analytics/export.csv | Partner CSV download |
| `GET /partner/services` | http://127.0.0.1:3000/api/v1/partner/services | https://dev.garudhub.me/platform-api/v1/partner/services | Partner hub services |
| `GET /partner/audit-log` | http://127.0.0.1:3000/api/v1/partner/audit-log | https://dev.garudhub.me/platform-api/v1/partner/audit-log | Partner org audit |
| `GET /partner/catalog/listings` | http://127.0.0.1:3000/api/v1/partner/catalog/listings | https://dev.garudhub.me/platform-api/v1/partner/catalog/listings | Partner |
| `GET /partner/catalog/listings/{id}` | http://127.0.0.1:3000/api/v1/partner/catalog/listings/{id} | https://dev.garudhub.me/platform-api/v1/partner/catalog/listings/{id} | Partner |
| `GET /partner/documents` | http://127.0.0.1:3000/api/v1/partner/documents | https://dev.garudhub.me/platform-api/v1/partner/documents | Partner |
| `GET /partner/documents/{id}/download` | http://127.0.0.1:3000/api/v1/partner/documents/{id}/download | https://dev.garudhub.me/platform-api/v1/partner/documents/{id}/download | Partner |
| `GET /partner/orders` | http://127.0.0.1:3000/api/v1/partner/orders | https://dev.garudhub.me/platform-api/v1/partner/orders | Partner |
| `GET /partner/orders/{id}` | http://127.0.0.1:3000/api/v1/partner/orders/{id} | https://dev.garudhub.me/platform-api/v1/partner/orders/{id} | Partner |
| `GET /partner/rfqs` | http://127.0.0.1:3000/api/v1/partner/rfqs | https://dev.garudhub.me/platform-api/v1/partner/rfqs | Partner |
| `GET /partner/rfqs/{id}` | http://127.0.0.1:3000/api/v1/partner/rfqs/{id} | https://dev.garudhub.me/platform-api/v1/partner/rfqs/{id} | Partner |
| `GET /partner/leads` | http://127.0.0.1:3000/api/v1/partner/leads | https://dev.garudhub.me/platform-api/v1/partner/leads | Partner |
| `GET /partner/enquiries` | http://127.0.0.1:3000/api/v1/partner/enquiries | https://dev.garudhub.me/platform-api/v1/partner/enquiries | Partner |
| `GET /partner/partnerships` | http://127.0.0.1:3000/api/v1/partner/partnerships | https://dev.garudhub.me/platform-api/v1/partner/partnerships | Partner |
| `GET /partner/partnerships/targets` | http://127.0.0.1:3000/api/v1/partner/partnerships/targets | https://dev.garudhub.me/platform-api/v1/partner/partnerships/targets | Partner |
| `GET /partner/subscription` | http://127.0.0.1:3000/api/v1/partner/subscription | https://dev.garudhub.me/platform-api/v1/partner/subscription | Partner billing |
| `GET /partner/subscription/receipt.html` | http://127.0.0.1:3000/api/v1/partner/subscription/receipt.html | https://dev.garudhub.me/platform-api/v1/partner/subscription/receipt.html | Partner |
| `GET /partner/service-requests` | http://127.0.0.1:3000/api/v1/partner/service-requests | https://dev.garudhub.me/platform-api/v1/partner/service-requests | Partner inbox |
| `GET /partner/service-requests/coverage` | http://127.0.0.1:3000/api/v1/partner/service-requests/coverage | https://dev.garudhub.me/platform-api/v1/partner/service-requests/coverage | Partner |
| `GET /partner/training/profile` | http://127.0.0.1:3000/api/v1/partner/training/profile | https://dev.garudhub.me/platform-api/v1/partner/training/profile | Partner training institute |
| `GET /partner/training/courses` | http://127.0.0.1:3000/api/v1/partner/training/courses | https://dev.garudhub.me/platform-api/v1/partner/training/courses | Partner |
| `GET /partner/training/leads` | http://127.0.0.1:3000/api/v1/partner/training/leads | https://dev.garudhub.me/platform-api/v1/partner/training/leads | Partner |
| `GET /partner/conversations` | http://127.0.0.1:3000/api/v1/partner/conversations | https://dev.garudhub.me/platform-api/v1/partner/conversations | Partner messages |
| `GET /partner/conversations/{id}` | http://127.0.0.1:3000/api/v1/partner/conversations/{id} | https://dev.garudhub.me/platform-api/v1/partner/conversations/{id} | Partner |
| `GET /admin/overview` | http://127.0.0.1:3000/api/v1/admin/overview | https://dev.garudhub.me/platform-api/v1/admin/overview | Admin |
| `GET /admin/analytics` | http://127.0.0.1:3000/api/v1/admin/analytics | https://dev.garudhub.me/platform-api/v1/admin/analytics | Admin |
| `GET /admin/audit-log` | http://127.0.0.1:3000/api/v1/admin/audit-log | https://dev.garudhub.me/platform-api/v1/admin/audit-log | Admin |
| `GET /admin/leads` | http://127.0.0.1:3000/api/v1/admin/leads | https://dev.garudhub.me/platform-api/v1/admin/leads | Admin |
| `GET /admin/applications` | http://127.0.0.1:3000/api/v1/admin/applications | https://dev.garudhub.me/platform-api/v1/admin/applications | Admin |
| `GET /admin/applications/{id}` | http://127.0.0.1:3000/api/v1/admin/applications/{id} | https://dev.garudhub.me/platform-api/v1/admin/applications/{id} | Admin |
| `GET /admin/documents/{id}/download` | http://127.0.0.1:3000/api/v1/admin/documents/{id}/download | https://dev.garudhub.me/platform-api/v1/admin/documents/{id}/download | Admin |
| `GET /admin/listings` | http://127.0.0.1:3000/api/v1/admin/listings | https://dev.garudhub.me/platform-api/v1/admin/listings | Admin |
| `GET /admin/listings/{id}` | http://127.0.0.1:3000/api/v1/admin/listings/{id} | https://dev.garudhub.me/platform-api/v1/admin/listings/{id} | Admin |
| `GET /admin/orders` | http://127.0.0.1:3000/api/v1/admin/orders | https://dev.garudhub.me/platform-api/v1/admin/orders | Admin |
| `GET /admin/orders/{id}` | http://127.0.0.1:3000/api/v1/admin/orders/{id} | https://dev.garudhub.me/platform-api/v1/admin/orders/{id} | Admin |
| `GET /admin/enquiries` | http://127.0.0.1:3000/api/v1/admin/enquiries | https://dev.garudhub.me/platform-api/v1/admin/enquiries | Admin |
| `GET /admin/enquiries/export` | http://127.0.0.1:3000/api/v1/admin/enquiries/export | https://dev.garudhub.me/platform-api/v1/admin/enquiries/export | Admin CSV |
| `GET /admin/users` | http://127.0.0.1:3000/api/v1/admin/users | https://dev.garudhub.me/platform-api/v1/admin/users | Admin |
| `GET /admin/billing/plans` | http://127.0.0.1:3000/api/v1/admin/billing/plans | https://dev.garudhub.me/platform-api/v1/admin/billing/plans | Admin |
| `GET /admin/billing/subscriptions` | http://127.0.0.1:3000/api/v1/admin/billing/subscriptions | https://dev.garudhub.me/platform-api/v1/admin/billing/subscriptions | Admin |
| `GET /admin/partnerships` | http://127.0.0.1:3000/api/v1/admin/partnerships | https://dev.garudhub.me/platform-api/v1/admin/partnerships | Admin |
| `GET /admin/gov-opportunities` | http://127.0.0.1:3000/api/v1/admin/gov-opportunities | https://dev.garudhub.me/platform-api/v1/admin/gov-opportunities | Admin |
| `GET /admin/gov-opportunities/{id}` | http://127.0.0.1:3000/api/v1/admin/gov-opportunities/{id} | https://dev.garudhub.me/platform-api/v1/admin/gov-opportunities/{id} | Admin |
| `GET /admin/gov-opportunities/{opportunityId}/bids/{bidId}/document` | http://127.0.0.1:3000/api/v1/admin/gov-opportunities/{opportunityId}/bids/{bidId}/document | https://dev.garudhub.me/platform-api/v1/admin/gov-opportunities/{opportunityId}/bids/{bidId}/document | Admin sealed bid download |
| `GET /admin/service-requests` | http://127.0.0.1:3000/api/v1/admin/service-requests | https://dev.garudhub.me/platform-api/v1/admin/service-requests | Admin |
| `GET /payments/order/{orderId}` | http://127.0.0.1:3000/api/v1/payments/order/{orderId} | https://dev.garudhub.me/platform-api/v1/payments/order/{orderId} | Payment status (auth rules apply) |

### Swagger (local dev / non-prod API)

- http://127.0.0.1:3000/api/docs
- http://127.0.0.1:3000/api/docs-json

---

## Auth

### Pages

| Path | Local | Staging | Notes |
|------|-------|---------|-------|
| `/auth/login` | http://localhost:3001/auth/login | https://dev.garudhub.me/auth/login | All roles (generic sign in) |
| `/auth/login/partner` | http://localhost:3001/auth/login/partner | https://dev.garudhub.me/auth/login/partner | Partner portal bookmark |
| `/auth/login/buyer` | http://localhost:3001/auth/login/buyer | https://dev.garudhub.me/auth/login/buyer | Buyer / marketplace bookmark |
| `/auth/login/admin` | http://localhost:3001/auth/login/admin | https://dev.garudhub.me/auth/login/admin | Platform admin bookmark |
| `/auth/login/government` | http://localhost:3001/auth/login/government | https://dev.garudhub.me/auth/login/government | Government buyer bookmark |
| `/auth/register` | http://localhost:3001/auth/register | https://dev.garudhub.me/auth/register | New org signup |
| `/auth/change-password` | http://localhost:3001/auth/change-password | https://dev.garudhub.me/auth/change-password | Requires session |

### API (via proxy recommended for browser sessions)

| Action | Local proxy | Staging proxy | Body / notes |
|--------|-------------|---------------|--------------|
| `POST /auth/register` | http://localhost:3001/platform-api/v1/auth/register | https://dev.garudhub.me/platform-api/v1/auth/register | JSON body; sets httpOnly cookies via proxy |
| `POST /auth/login` | http://localhost:3001/platform-api/v1/auth/login | https://dev.garudhub.me/platform-api/v1/auth/login | Demo: checkout-test@garudhub.local / ChangeMeDemo123! |
| `POST /auth/refresh` | http://localhost:3001/platform-api/v1/auth/refresh | https://dev.garudhub.me/platform-api/v1/auth/refresh | Cookie or body refreshToken |
| `POST /auth/logout` | http://localhost:3001/platform-api/v1/auth/logout | https://dev.garudhub.me/platform-api/v1/auth/logout | Requires session |
| `POST /auth/change-password` | http://localhost:3001/platform-api/v1/auth/change-password | https://dev.garudhub.me/platform-api/v1/auth/change-password | Requires session |
| `GET /auth/me` | http://localhost:3001/platform-api/v1/auth/me | https://dev.garudhub.me/platform-api/v1/auth/me | Session check |

### Demo credentials (local & staging if seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@garudhub.local` | `ADMIN_PASSWORD` in host `.env` (often `ChangeMeAdmin123!`) |
| Partner | `partner@garudhub.local` | `ChangeMeDemo123!` |
| Buyer | `buyer@garudhub.local` | `ChangeMeDemo123!` |
| Checkout QA | `checkout-test@garudhub.local` | `ChangeMeDemo123!` |
| Government | `government@garudhub.local` | `ChangeMeDemo123!` |

Direct API login (no cookies): `POST http://127.0.0.1:3000/api/v1/auth/login` with JSON `{ "email": "...", "password": "..." }`.

---

## Related checks (not browser URLs)

- Razorpay test webhook: `POST https://dev.garudhub.me/platform-api/v1/payments/webhook` ([`STAGING_SMOKE_GUIDE.md`](./STAGING_SMOKE_GUIDE.md))
- Post-deploy: `BASE_URL=https://dev.garudhub.me bash deploy/scripts/post-deploy-health-check.sh`
