# Admin P0 — Listing moderation & publish gates

**Status:** **Implemented** (listing review workflow, admin `/admin/listings`, partner submit-for-review, marketplace/cart gates). Use §9 below for manual QA; some P1 items (global audit viewer, user admin) remain out of scope.  
**Code verified:** October 2026; re-checked after implementation on branch `feature/task-003-004-payments-workflow`.

---

### 1. P0 goal

Before GarudHub marketplace and checkout are treated as production-trustworthy, every **partner catalog listing** that appears to buyers must pass **platform admin review**, not only **partner org verification**. P0 adds a **listing review workflow** (submit → pending → approve/reject with reason), **server-side publish gates** so approved partners cannot flip `isPublished` directly, and **admin + partner UI** to operate the queue—while keeping marketplace/cart behavior aligned with “visible = admin-approved live listing from a verified seller.”

---

### 2. What exists today (admin + catalog publish)

**Admin (partner verification only)**

- `GET /admin/applications` — list orgs, optional `?status=` (`VerificationStatus`); includes owner summary, document/listing counts — `backend/src/modules/admin/admin.controller.ts`, `admin.service.ts`
- `GET /admin/applications/:id` — detail + documents — same files
- `GET /admin/documents/:id/download` — stream file via `DocumentsService.downloadForAdmin` — `admin.controller.ts`
- `POST /admin/applications/:id/approve` — `SUBMITTED` or `UNDER_REVIEW` → `APPROVED`; writes `VerificationAuditLog` — `admin.service.ts`
- `POST /admin/applications/:id/reject` — body `RejectApplicationDto` (`reason`, optional `note`); writes audit log — `admin.dto.ts`, `admin.service.ts`
- **No** listing/moderation endpoints; `AdminModule` only wires applications — `backend/src/modules/admin/admin.module.ts`
- **No** API to set org → `UNDER_REVIEW` (enum exists; approve/reject accept `UNDER_REVIEW` if already set) — `backend/prisma/schema.prisma`, `PROJECT_STATUS_DETAILED.md` Table 4

**Admin UI**

- `/admin` — application table + status filter — `frontend/app/(platform)/admin/page.tsx`
- `/admin/applications/[id]` — detail, doc download, approve/reject — `frontend/app/(platform)/admin/applications/[id]/page.tsx`
- Admin nav entry for `PLATFORM_ADMIN` only — `frontend/components/platform/PlatformShell.tsx`, `AuthProvider.tsx`
- **No** `/admin/listings` — `PROJECT_STATUS_DETAILED.md` Table 4 row “Listing moderation”

**Catalog & publish (partner self-serve)**

- `PartnerListing.isPublished` boolean, default `false` — `backend/prisma/schema.prisma` (`PartnerListing`)
- Partner CRUD: `GET/POST/PATCH/DELETE /partner/catalog/listings` (+ image upload) — `partner-catalog.controller.ts`, `catalog.service.ts`
- **Guards:** `JwtAuthGuard`, `RolesGuard` (`PARTNER`), `VerifiedPartnerGuard` (JWT `user.verification === APPROVED`) — `verified-partner.guard.ts`, `partner-catalog.controller.ts`
- **Service gate:** `requireApprovedPartnerOrg` — org `verificationStatus === APPROVED` — `catalog.service.ts`
- **Create/update:** partner may set `isPublished` via `CreateListingDto` / `UpdateListingDto` — `listing.dto.ts`; create defaults `isPublished ?? false`
- **No** admin hooks in catalog module

**Marketplace & commerce visibility**

- Browse/detail: `isPublished: true` **and** org `verificationStatus: APPROVED` — `catalog.service.ts` (`browsePublic`, `getPublicListing`, `getPublicPartnerProfile`)
- Cart add/checkout: `assertPurchasable` requires `isPublished`, fixed price, approved org — `backend/src/modules/commerce/cart.service.ts`

**Partner UI**

- List/edit/new catalog pages; **“Live on marketplace”** = checkbox → `isPublished` when `canListProducts` — `frontend/app/(platform)/partner/catalog/*.tsx`, `/partner/me` `canListProducts`

**Seed / demo**

- Demo listings upserted with `isPublished: true` for approved partner org — `backend/prisma/seed.ts` (e.g. Garud AgriSpray X1)

**Audit models today**

- `VerificationAuditLog` for **org** verification only — `schema.prisma`; **no** listing audit table

**Docs alignment**

- `PROJECT_STATUS_DETAILED.md` Table 4: listing moderation **Not started**, priority **P0**
- `CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md` §A.7: publish gates = org approved + `is_published`; optional admin queue for quality (P1); legal copy expects accurate listings — `frontend/content/pages/legal.php__page_tos/body.html`

---

### 3. Gap analysis — why P0

| Risk today | Why it matters |
|------------|----------------|
| **Verified partner = instant publish** | Org KYC does not review product claims, images, pricing, or prohibited goods. Misleading or non-compliant listings can go live immediately after partner approval. |
| **No takedown / reject trail** | Admins cannot reject a listing with a reason, unpublish without partner cooperation, or show an audit history for marketplace content. |
| **Trust & ToS** | Platform ToS expects accurate listings; marketplace + cart imply Garud vouches for discoverability of live SKUs. |
| **Compliance narrative** | B2B drone/industrial catalog needs a human gate before public exposure, separate from “company is real” verification. |

Partner verification (existing P0-adjacent work) remains necessary but **not sufficient** for marketplace trust.

---

### 4. Proposed product behavior (rules)

#### 4.1 Listing review states (new)

Introduce **`ListingReviewStatus`** on `PartnerListing` (name can be `reviewStatus` in API):

| Status | Partner sees | On marketplace | `isPublished` (DB) |
|--------|----------------|----------------|---------------------|
| `DRAFT` | Editable draft | Hidden | `false` |
| `PENDING_REVIEW` | “Submitted — awaiting review” | Hidden | `false` |
| `APPROVED` | “Live” (if not admin-unpublished) | Visible (if org approved) | `true` |
| `REJECTED` | Rejection reason; can edit & resubmit | Hidden | `false` |

**Optional P0 stretch (document only, can defer to Slice 2):** `UNPUBLISHED` or admin “suspend” — admin removes from marketplace (`isPublished false`, status `APPROVED` → `UNPUBLISHED` or keep `APPROVED` + `isPublished false`) without deleting partner data.

#### 4.2 Partner actions

1. **Create listing** → `DRAFT`, never live.
2. **Save draft** — PATCH allowed in `DRAFT`, `REJECTED`; policy choice for `PENDING_REVIEW`:
   - **Recommended P0:** block edits while `PENDING_REVIEW` (or auto-withdraw to `DRAFT` on any edit — pick one in implementation).
3. **Submit for review** — `POST …/submit-for-review` (or dedicated field on PATCH): `DRAFT`/`REJECTED` → `PENDING_REVIEW`; set `submittedForReviewAt`.
4. **Remove direct publish:** Partners **cannot** set `isPublished: true` via API. Remove or ignore `isPublished` on partner create/update DTOs; only admin approve sets live flag.
5. **Approved org still required** — keep `VerifiedPartnerGuard` + `requireApprovedPartnerOrg` (no bypass).

#### 4.3 Admin actions

1. Queue: listings with `reviewStatus = PENDING_REVIEW` (filter by category, org, date).
2. **Approve** → `APPROVED`, `isPublished true`, `reviewedAt`, optional note; append **listing audit log**.
3. **Reject** → `REJECTED`, `isPublished false`, `rejectionReason` (required), optional note; audit log.
4. **Unpublish** (recommended in P0): any `APPROVED` listing → `isPublished false` + status `UNPUBLISHED` or `REJECTED` with reason “admin takedown” — product choice: prefer **`UNPUBLISHED`** + reason so partner can fix and resubmit without conflating with content rejection.

#### 4.4 Marketplace & cart (buyer)

- Public queries: `isPublished === true` **and** `reviewStatus === APPROVED` **and** org `APPROVED` (defense in depth if `isPublished` ever drifts).
- Cart/checkout: same rules as today plus `reviewStatus` check when implemented.

#### 4.5 Existing published listings (seed / production DB)

**Recommended migration policy (grandfather):**

```sql
-- Conceptual backfill after adding reviewStatus
UPDATE partner_listings
SET review_status = 'APPROVED'
WHERE is_published = true;
-- All others: review_status = 'DRAFT'
```

- **Seed (`backend/prisma/seed.ts`):** continue upserting demo listings as live; after migration they remain `APPROVED` + `isPublished true` so checkout QA unchanged.
- **New partner-created listings:** always start `DRAFT`; no grandfather.
- **Communicate:** existing live listings stay live; only **new** or **edited-after-P0** flows require review (see §4.6).

#### 4.6 Edits to already-live listings

**P0 recommendation (simplest shippable):**

- **Material change** (name, description, images, price, category): on partner save → `PENDING_REVIEW`, `isPublished false` until re-approved.
- **Non-material** (warranty typo): optional P1; P0 can treat **any** PATCH on `APPROVED` listing as re-review to avoid loopholes.

Alternative (lighter P0): only first publish requires review; edits stay live — **not recommended** for trust.

#### 4.7 Out of partner bypass

- Strip `isPublished` from partner DTOs; server enforces.
- `VerifiedPartnerGuard` unchanged — addresses “unapproved partner,” not “unapproved listing.”

---

### 5. Backend work breakdown

| # | Task | Notes |
|---|------|--------|
| B1 | **Prisma schema** | Add `ListingReviewStatus` enum; `PartnerListing.reviewStatus` (default `DRAFT`); `rejectionReason`, `submittedForReviewAt`, `reviewedAt`; optional `reviewedByUserId`. Index `[reviewStatus, updatedAt]`. |
| B2 | **Listing audit log** | New `ListingModerationAuditLog` (mirror `VerificationAuditLog`): `listingId`, `actorUserId`, `fromStatus`, `toStatus`, `note`, `createdAt`. |
| B3 | **Migration + backfill** | Grandfather `is_published = true` → `APPROVED`; else `DRAFT`. |
| B4 | **Catalog service** | Stop honoring partner `isPublished`; implement `submitForReview`; enforce edit rules by status; on approve path only admin sets `isPublished`. |
| B5 | **Admin service** | `listListings`, `getListing`, `approveListing`, `rejectListing`, `unpublishListing`; transactional updates + audit rows. |
| B6 | **Admin controller** | Routes under `admin/listings` (see §7). Reuse `RejectApplicationDto` pattern → `RejectListingDto`. |
| B7 | **Marketplace + cart** | Add `reviewStatus: APPROVED` to `browsePublic`, `getPublicListing`, `assertPurchasable` / cart `findUnique` include if needed. |
| B8 | **DTO / Swagger** | Expose `reviewStatus`, rejection fields on partner GET; hide internal admin-only fields where appropriate. |
| B9 | **Seed** | Set explicit `reviewStatus: APPROVED` on demo listings after schema change. |

**Dependencies:** `AdminModule` may import `CatalogModule` or a thin `ListingModerationService` to avoid circular deps.

---

### 6. Frontend work breakdown

| # | Task | Route / area |
|---|------|----------------|
| F1 | **Admin listing queue** | `/admin/listings` — table, filter `PENDING_REVIEW`, link to detail |
| F2 | **Admin listing detail** | `/admin/listings/[id]` — full listing payload, org link, approve / reject / unpublish |
| F3 | **Admin nav** | Second tab or sub-nav: Applications \| Listings — `PlatformShell` / admin layout |
| F4 | **Partner list** | Show `reviewStatus` badge (not just Draft/Live); disable “live” checkbox |
| F5 | **Partner edit/new** | Replace publish checkbox with **Submit for review**; show rejection reason; disable submit when `PENDING_REVIEW` per policy |
| F6 | **Types** | `frontend/lib/api/types.ts` — `ListingReviewStatus`; update listing types |
| F7 | **StatusBadge** | Map new statuses — `frontend/components/platform/StatusBadge.tsx` |
| F8 | **Marketplace** | No buyer UI change if API gates correctly; optional “unavailable” if stale cache |

---

### 7. API contract table

Base path assumes API prefix as today (e.g. `/admin/...`). Auth: Bearer JWT.

| Method | Path | Role | Body / query | Response (summary) |
|--------|------|------|--------------|-------------------|
| `GET` | `/admin/applications` | `PLATFORM_ADMIN` | `?status=VerificationStatus` | Org list (existing) |
| `GET` | `/admin/applications/:id` | `PLATFORM_ADMIN` | — | Org detail (existing) |
| `POST` | `/admin/applications/:id/approve` | `PLATFORM_ADMIN` | — | Org updated (existing) |
| `POST` | `/admin/applications/:id/reject` | `PLATFORM_ADMIN` | `{ reason, note? }` | Org updated (existing) |
| `GET` | `/admin/documents/:id/download` | `PLATFORM_ADMIN` | — | File stream (existing) |
| **`GET`** | **`/admin/listings`** | **`PLATFORM_ADMIN`** | **`?status=ListingReviewStatus&skip&take`** | **Listings + org summary** |
| **`GET`** | **`/admin/listings/:id`** | **`PLATFORM_ADMIN`** | — | **Listing detail + org + moderation history** |
| **`POST`** | **`/admin/listings/:id/approve`** | **`PLATFORM_ADMIN`** | **`{ note? }`** | **`APPROVED`, `isPublished: true`** |
| **`POST`** | **`/admin/listings/:id/reject`** | **`PLATFORM_ADMIN`** | **`{ reason, note? }`** | **`REJECTED`, reason stored** |
| **`POST`** | **`/admin/listings/:id/unpublish`** | **`PLATFORM_ADMIN`** | **`{ reason, note? }`** | **Off marketplace; status per §4.3** |
| `GET` | `/partner/catalog/listings` | `PARTNER` (verified) | — | Include `reviewStatus`, `rejectionReason` |
| `POST` | `/partner/catalog/listings` | `PARTNER` (verified) | Create DTO **without** `isPublished` | `DRAFT` listing |
| `PATCH` | `/partner/catalog/listings/:id` | `PARTNER` (verified) | Update DTO **without** `isPublished` | Draft save / re-review trigger |
| **`POST`** | **`/partner/catalog/listings/:id/submit-for-review`** | **`PARTNER` (verified)** | **`—`** | **`PENDING_REVIEW`** |
| `GET` | `/marketplace/listings` | Public | filters | Only `APPROVED` + published + org approved |
| `GET` | `/marketplace/listings/:id` | Public | — | Same gates |

---

### 8. Phased slices for implementation

#### Slice 1 — Smallest shippable (backend gate, no admin UI)

- Schema + migration + grandfather backfill (B1–B3).
- Partner API: remove self-publish; `submit-for-review`; catalog + marketplace + cart gates (B4, B7).
- Partner UI: status text + submit button; remove publish checkbox (F4–F5 partial).
- **Shippable outcome:** New listings cannot go live; demo seed stays live; partners see pending state (via API/errors) even without admin UI if using DB/admin script temporarily.

#### Slice 2 — Operable moderation

- Admin listing APIs + audit log (B5–B6, B2).
- Admin UI queue + detail (F1–F3).
- Re-review on edit of live listing (§4.6).
- Polish: pagination on admin list, moderation history on detail.

---

### 9. Test checklist

**Admin**

- [ ] `PLATFORM_ADMIN` can list pending listings; non-admin gets 403.
- [ ] Approve pending → listing appears on `GET /marketplace/listings`.
- [ ] Reject with reason → hidden from marketplace; partner GET shows reason.
- [ ] Unpublish live listing → hidden from marketplace; cart add fails.
- [ ] Audit log rows created for approve/reject/unpublish.

**Partner**

- [ ] Unverified partner still blocked from catalog (`VerifiedPartnerGuard`).
- [ ] Verified partner cannot set `isPublished` via API (ignored or 400).
- [ ] Submit for review → `PENDING_REVIEW`; not on marketplace.
- [ ] Edit while pending follows chosen policy (block or withdraw).
- [ ] After reject, edit + resubmit works.

**Buyer**

- [ ] Marketplace browse/detail only shows approved + published + verified org.
- [ ] Add to cart / checkout only for approved listings (regression on Garud AgriSpray X1 seed).

**Regression**

- [ ] Partner application approve/reject unchanged.
- [ ] RFQ / POR listings still not cart-eligible.
- [ ] Seed re-run keeps demo listings public.

**Automation note:** Repo has no `*.spec.ts` today; P0 tests are manual or first e2e suite addition (optional).

---

### 10. Out of scope for P0 (explicit)

- Partner org **UNDER_REVIEW** transition API (Table 4 P2).
- **Catalog quality gates** — mandatory primary image, MOQ/specs validation before submit (`CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md` P1).
- **Flagged / reported** listings, search moderation, bulk actions.
- **Listing documents** / compliance attachments admin review.
- **User/org admin**, order disputes, analytics, notifications (email on approve/reject).
- **Auto-approve** rules, SLA timers, assign reviewer.
- **Guest** moderation tools, marketing site CMS.
- Changing **partner org verification** rules or `VerificationAuditLog` UI.

---

## Appendix — File reference index

| Area | Path |
|------|------|
| Admin API | `backend/src/modules/admin/admin.controller.ts`, `admin.service.ts`, `dto/admin.dto.ts` |
| Catalog | `backend/src/modules/catalog/catalog.service.ts`, `partner-catalog.controller.ts`, `marketplace.controller.ts`, `dto/listing.dto.ts` |
| Partner guard | `backend/src/modules/partner/guards/verified-partner.guard.ts` |
| Commerce | `backend/src/modules/commerce/cart.service.ts` |
| Schema | `backend/prisma/schema.prisma` |
| Seed | `backend/prisma/seed.ts` |
| Admin UI | `frontend/app/(platform)/admin/page.tsx`, `applications/[id]/page.tsx` |
| Partner catalog UI | `frontend/app/(platform)/partner/catalog/` |
| Status doc | `docs/PROJECT_STATUS_DETAILED.md` (Table 4) |
| Catalog design | `docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md` (§A.7, Phase 1 admin queue note) |
