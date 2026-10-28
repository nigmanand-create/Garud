# Drone Assistant Chat — Implementation Plan

**Project:** Garud client (`/Users/blackstar/Desktop/dev/client/garud`)  
**Date:** 2026-10-28  
**Status:** Plan only (no implementation in this phase)

---

## 1. Context & codebase findings

### 1.1 Catalog / marketplace data model

There is no Prisma model named `CatalogListing`. Public marketplace inventory is **`PartnerListing`** (`partner_listings`):

| Field | Use for assistant |
|--------|-------------------|
| `listingType` | `PRODUCT` vs `SERVICE` |
| `category` | `CatalogCategory` enum (agri, survey, industrial, camera, component, accessory, payload, training, etc.) |
| `name`, `brand`, `sku` | Keyword match; SKU field labeled “Model / DGCA code” in partner editor |
| `description`, `technicalSpecs` | Free-text relevance, payload/endurance **regex** (not structured) |
| `applications[]` | Tag overlap with `COMMON_APPLICATIONS` in `frontend/lib/platform/catalog-listing-form.ts` |
| `priceInr`, `priceOnRequest`, `minOrderQuantity` | Budget scoring, cart vs RFQ guidance |
| `isPublished` + `reviewStatus === APPROVED` + org `verificationStatus === APPROVED` | Same gate as public API |

**Gap (Phase 0 addressed):** Demo seed now upserts `technicalSpecs` and `applications[]` for published partner listings so assistant scoring can use payload/endurance regex and application-tag overlap — re-run `cd backend && npm run prisma:seed` after pulling.

### 1.2 Public API (existing)

Nest **`MarketplaceController`** (`backend/src/modules/catalog/marketplace.controller.ts`):

- `GET /marketplace/listings` — filters: `listingType`, `category`, `skip`, `take` (max **50** per request)
- `GET /marketplace/listings/:id` — full detail including `technicalSpecs`, `applications`
- `GET /marketplace/partners/:orgId`

No text search, no budget/DGCA filters on listings. Frontend marketplace (`MarketplaceClient.tsx`) loads up to **48** listings for “All” and uses **client-side** section filters aligned with `frontend/lib/platform/marketplace-sections.ts` and `frontend/lib/platform/catalog-categories.ts`.

### 1.3 UI reuse

- **`ListingCard`** (`frontend/components/platform/ListingCard.tsx`) — card data shape matches list API; ideal for in-chat recommendation bubbles.
- **Listing PDP CTAs:** RFQ → `/buyer/rfqs/new?listing={id}` (prefills title, description, category, MOQ, location); enquiry → legacy `/enquiry.php`; cart when fixed price.

### 1.4 Chat / leads today

- **No** in-app chat, assistant, or message models (see `docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md` §6 — Lead loop v1 still enquiry.php + RFQ).
- RFQ model already has **`payloadCapacityKg`**, **`enduranceMinutes`**, **`isDgcaRequired`**, **`targetBudgetInr`** — good targets for assistant → RFQ handoff (URL/session prefill in v2; MVP can deep-link with `listing=` only).

### 1.5 Shell / placement

All platform routes use **`MarketingShell`** (`frontend/app/(platform)/layout.tsx`) — one mount point for a global floating widget (marketplace, services, marketing pages, auth).

---

## 2. Product scope

### 2.1 MVP (ship first)

**Goal:** Help visitors and buyers **discover verified marketplace listings** through a small rule-based assistant, without new infra or LLM cost.

| In scope | Out of scope (MVP) |
|----------|---------------------|
| Floating “Ask Garud” chat panel (open/close, mobile-friendly) | Persistent chat history server-side |
| Rule-based intent + **top 3–5 listing recommendations** | Full natural-language understanding |
| In-scope Q&A (marketplace categories, RFQ vs cart, DGCA at a high level, link to `/services`, `/b2b-partners`) | Legal/medical advice; off-platform supplier recommendations |
| CTAs: **View listing**, **Request RFQ** (`?listing=`), **Browse marketplace** (section query) | Native enquiry POST (Phase C lead loop); auto-create RFQ |
| Graceful “I don’t know” + link to enquiry or RFQ | Partner dashboard / admin analytics on assistant usage |
| Works for **anonymous** users (read-only catalog) | Personalized recommendations from order history |

### 2.2 v2 (after MVP validated)

- **`POST /assistant/recommend`** (or `/marketplace/recommend`) with shared scoring module, pagination, optional `q` full-text (Postgres `ILIKE` or `tsvector`).
- **Structured listing specs** (optional Prisma fields: `payloadKgMax`, `enduranceMin`, `dgcaTypeCertified`) for reliable filters.
- **Session prefill:** `sessionStorage` or signed query bundle → RFQ form (`targetBudgetInr`, `isDgcaRequired`, etc.).
- **Lead capture:** assistant “Contact us” → first-party Enquiry API (align with gap doc Phase **C — Lead loop v1**).
- **Optional LLM layer** (see §8): intent refinement + copy, with retrieval over listing snippets; keep deterministic ranking as source of truth.

---

## 3. UX design

### 3.1 Widget placement

| Surface | Priority | Rationale |
|---------|----------|-----------|
| **`/marketplace`** (+ listing detail) | P0 | Primary “find a drone” intent |
| **`/services`** | P1 | Today CTAs exit to enquiry; assistant bridges to **catalog + RFQ** |
| **Home / `/about-us`** | P2 | Lead gen; keep answers conservative |

**Implementation:** Add `DroneAssistantWidget` to `MarketingShell` (or marketplace layout only if marketing scope feels too broad for v1).

**Visual:** Bottom-right launcher (Phosphor chat icon, matches marketing stack); panel ~380×520px desktop, full-width sheet on small screens. Z-index above footer, below modals. Respect `prefers-reduced-motion`.

### 3.2 Message types (client-side model)

```ts
type ChatMessage =
  | { role: 'user' | 'assistant'; kind: 'text'; text: string }
  | { role: 'assistant'; kind: 'listings'; items: ListingCardData[]; reason?: string }
  | { role: 'assistant'; kind: 'actions'; actions: { label: string; href: string }[] }
  | { role: 'assistant'; kind: 'quick_replies'; options: string[] };
```

**Flow pattern:**

1. **Welcome** + quick replies: “Agriculture spraying”, “Survey & mapping”, “Budget under ₹5L”, “DGCA compliant”, “Training / DGCA course”.
2. User message → intent parse → optional clarifying question (max **1** follow-up in MVP if category ambiguous).
3. **Listing cards** (compact `ListingCard` or slim variant) + 1–2 sentence rationale.
4. **Actions:** per listing “View details” / “Get quote”; global “See all in marketplace” with `?section=drones&category=...`.

### 3.3 Scope guardrails (copy)

Assistant system prompt (even for rules-only, encode as constants):

- Answer only: GarudHub marketplace, RFQ/cart flows, high-level DGCA/type-cert **as described on listings/RFQ**, partner verification, links to services/training **as listings**.
- Refuse: pricing guarantees, regulatory sign-off, competitor sites, non-drone topics → short redirect + link to `/enquiry.php` or `/buyer/rfqs/new`.

### 3.4 CTA mapping

| User goal | CTA |
|-----------|-----|
| Specific product | `/marketplace/listings/{id}` |
| Quote | `/buyer/rfqs/new?listing={id}` (login gate via existing `RequireAuth`) |
| Fixed price buy | PDP cart (assistant mentions “login required”) |
| Broad browse | `/marketplace?section={drones\|courses\|...}` |
| Human handoff | `/enquiry.php?subject=...` (until Enquiry API ships) |

---

## 4. Recommendation algorithm (rules + scoring)

**Design principle:** Deterministic, testable, no ML. Same inputs → same rankings. Unit-test pure functions in `frontend/lib/assistant/` (or shared `packages/assistant-core` if extracted for Nest later).

### 4.1 Pipeline overview

```
User text
  → normalize (lowercase, strip punctuation, expand Indian number words)
  → extract slots (use case, category hints, budget INR, DGCA flag, payload kg, listing type)
  → build candidate set (fetch listings: API and/or in-memory cache)
  → score each listing
  → rank, take top K (3–5)
  → generate rationale strings from top signals
  → if zero candidates: fallback copy + marketplace deep link
```

### 4.2 Intent parsing (step-by-step)

**Step 1 — Tokenize** user message + conversation context (last assistant quick-reply if any).

**Step 2 — Use-case → category priors** (weighted, not exclusive):

| Keywords / phrases (examples) | Primary `CatalogCategory` | `listingType` |
|------------------------------|---------------------------|---------------|
| spray, agri, crop, pesticide, farming | `AGRICULTURE_DRONE` | PRODUCT |
| survey, mapping, photogrammetry, PPK, RTK, lidar | `SURVEY_MAPPING_DRONE` | PRODUCT |
| inspection, industrial, thermal, enterprise, heavy lift | `INDUSTRIAL_ENTERPRISE_DRONE` | PRODUCT |
| cinema, photo, 4K, film | `CAMERA_DRONE` | PRODUCT |
| battery, propeller, accessory | `ACCESSORY` | PRODUCT |
| payload, multispectral, NDVI, sensor | `PAYLOAD` (or survey) | PRODUCT |
| training, DGCA course, pilot license | `TRAINING` | SERVICE |
| AMC, repair, maintenance | `REPAIR_MAINTENANCE` | SERVICE |
| compliance, consultancy, BVLOS, SOP | `CONSULTANCY` | SERVICE |

**Step 3 — Application tag match:** Map phrases to `COMMON_APPLICATIONS` strings; if match, boost listings whose `applications[]` contains that tag (often empty in seed — still useful when partners adopt).

**Step 4 — Budget extraction:**

- Patterns: `₹`, `rs`, `inr`, `lakh`, `lac`, `crore`, `k`, bare numbers with context.
- Normalize to INR (`5 lakh` → `500000`).
- Slot: `budgetMaxInr` (optional), `budgetMinInr` (optional).

**Step 5 — DGCA / compliance:**

- Keywords: `dgca`, `type cert`, `type certificate`, `drone rules`, `compliant`.
- Set `requiresDgcaHint = true` (listing has no boolean — match text in `description`, `technicalSpecs`, `sku`, `name`).

**Step 6 — Payload / endurance (optional slots):**

- Regex: `(\d+(?:\.\d+)?)\s*kg`, `payload`, `lift`; `(\d+)\s*min`, `endurance`, `flight time`.
- Used for soft scoring against parsed numbers from listing text (not DB columns today).

**Step 7 — Listing type disambiguation:**

- “course”, “training”, “service” → prefer SERVICE.
- “drone”, “UAV”, “platform” → prefer PRODUCT drone categories.
- If both agri + training mentioned, prefer PRODUCT unless user picked training quick reply.

**Step 8 — Confidence:**

- If no category score > threshold → ask one clarifying question (quick replies) before ranking.

### 4.3 Filters (hard)

Apply before scoring:

1. Must be publishable (already enforced by API).
2. If intent `listingType` resolved → filter.
3. If primary category resolved with confidence ≥ medium → filter to that category **or** adjacent (e.g. PAYLOAD + SURVEY) — MVP: strict single category when user picked a quick reply; soft when free text.
4. If user says “under ₹X” and listing has fixed `priceInr` → exclude if price > X × 1.1 (10% slack); **keep** `priceOnRequest` listings but score lower unless no fixed-price matches.

**Not available on listings (MVP honesty):**

- DGCA is **not** a structured listing flag — only text/sku heuristics.
- Payload/endurance on RFQ form only — assistant can **suggest** RFQ with those fields, not filter catalog precisely until schema v2.

### 4.4 Scoring (0–100, illustrative weights)

For each candidate listing, compute:

| Signal | Points |
|--------|--------|
| Category equals inferred primary | +35 |
| Category in secondary set | +15 |
| `listingType` match | +10 |
| Keyword hit in `name` | +8 per token (cap +24) |
| Keyword hit in `description` | +4 per token (cap +16) |
| Keyword hit in `technicalSpecs` | +6 per token (cap +18) |
| Application tag overlap | +12 per tag |
| Budget: fixed price ≤ budget | +15 |
| Budget: fixed price > budget | −25 |
| `priceOnRequest` when user gave budget | −5 |
| DGCA required & text match in listing corpus | +20 |
| DGCA required & no match | −10 |
| Parsed payload in listing text ≥ user payload | +10 |
| MOQ > user implied quantity | −8 |
| Tie-break: newer `updatedAt` | +0–3 |

Return top **K=5** (show 3 by default, “Show 2 more” in UI).

### 4.5 Rationale generation (template)

Examples:

- “Matched **Agriculture drone** category and keywords *spray*, *16L* in the listing description.”
- “Within your **₹5,00,000** budget (listed price).”
- “**Price on request** — use RFQ for fleet pricing.”

### 4.6 Fallback copy

| Condition | Response |
|-----------|----------|
| No listings after filter | “No published listings match yet. Browse all drones or submit an RFQ.” → `/marketplace?section=drones`, `/buyer/rfqs/new` |
| API error | “Catalog temporarily unavailable. Try marketplace browse.” |
| Off-topic | Scope message + quick replies back to use cases |
| User wants human | Enquiry link with subject prefill |

### 4.7 FAQ rules (keyword → static answer + optional listings)

Small map parallel to recommend:

- “What is RFQ?” → explain B2B quote flow + link.
- “DGCA” → explain type cert is specified in RFQ/listing; not legal advice.
- “Verified partner” → moderation + KYC one-liner.
- “Cart vs RFQ” → fixed price vs price-on-request from `ListingCard` logic.

---

## 5. Data layer

### 5.1 Option A — Client-only (MVP default)

1. On first open (or app load), `GET /marketplace/listings?take=50` (and optionally parallel fetches per `MARKETPLACE_SECTIONS` if “All” misses categories due to `take` + `orderBy: updatedAt`).
2. Cache in memory (React context or module singleton) with **5–15 min TTL** or refresh on marketplace navigation.
3. Run scoring in browser.

**Pros:** No backend change, fastest MVP.  
**Cons:** Catalog capped at 50 per request today; algorithm exposed (acceptable for public catalog); duplicate fetch if marketplace page already loaded.

**Mitigation:** Increase `take` to 50 and document partner scale limit; v2 adds server recommend.

### 5.2 Option B — New Nest endpoint (v2)

`POST /marketplace/assistant/recommend` or `POST /assistant/recommend`

```json
{
  "message": "spray drones under 5 lakh",
  "context": { "lastCategory": "AGRICULTURE_DRONE" },
  "limit": 5
}
```

Response:

```json
{
  "intent": { "categories": ["AGRICULTURE_DRONE"], "budgetMaxInr": 500000 },
  "listings": [ /* same shape as browse */ ],
  "rationale": ["..."],
  "suggestedActions": [{ "label": "...", "href": "..." }]
}
```

Implement by:

- `AssistantModule` + `RecommendService` calling Prisma with broader `take` / category `IN` queries driven by intent.
- Extract **`scoreListings(intent, listings)`** to `backend/src/modules/assistant/scoring.ts` and mirror in frontend until monorepo share.

**Pros:** Scale, single source of truth, rate limiting, future LLM orchestration.  
**Cons:** Small backend + e2e test surface.

### 5.3 Recommendation

| Phase | Approach |
|-------|----------|
| MVP | **Option A** + optional dedupe with marketplace client cache |
| v2 | **Option B** when listing count > ~50 or search added (gap doc Phase **E — Marketplace discoverability**) |

---

## 6. Tech stack fit

| Layer | Choice |
|-------|--------|
| UI | Next.js 14+ client component under `frontend/components/assistant/` |
| State | Local `useReducer` for messages; no DB |
| Styling | Reuse `platform.css` tokens + BEM-style classes consistent with `ListingCard` |
| API | Existing `apiRequest` → `/platform-api/v1` proxy |
| Backend (v2) | Nest module registered in `AppModule`; reuse `CatalogService.browsePublic` or dedicated query |
| Infra | **None** for MVP |
| Tests | Jest/Vitest unit tests for `parseIntent`, `scoreListing`; 2–3 snapshot tests for dialog flows |

**Files (planned, not created yet):**

- `frontend/components/assistant/DroneAssistantWidget.tsx`
- `frontend/lib/assistant/intent.ts`, `scoring.ts`, `faq.ts`, `types.ts`
- `frontend/lib/assistant/listing-corpus.ts` — build searchable text from listing fields
- v2: `backend/src/modules/assistant/*`

---

## 7. Privacy & security

- **No secrets in client:** Only public marketplace endpoints; no API keys in bundle.
- **No PII in MVP:** Do not send email/phone to backend; chat stays in session memory (cleared on refresh).
- **Rate limiting:** Client debounce sends (e.g. 800ms); v2 add IP rate limit on recommend endpoint.
- **XSS:** Render user text as plain text only; listing data from API already sanitized strings.
- **Auth:** RFQ CTA uses existing login flow; assistant does not bypass `RequireAuth`.
- **LLM (future):** If added, call from **server only**; pass listing IDs/snippets, not raw JWT; log redacted prompts.

---

## 8. Optional LLM upgrade path (post-MVP)

Keep **ranking deterministic**; use LLM only for:

1. Slot filling when rules confidence low (category + budget + use case JSON schema).
2. Natural-language reply wrapping around fixed listing IDs returned by scorer.
3. Clarifying question generation (one turn).

Architecture: Nest endpoint orchestrates `parseIntentRules()` → if low confidence → `llmParseIntent()` → `scoreListings()` → `llmFormatResponse()`. Feature flag `ASSISTANT_LLM_ENABLED`. Fallback to rules-only on LLM failure.

---

## 9. Effort estimate & phased tasks

**Overall MVP: M (medium)** — ~3–5 dev days one engineer (UI polish + tests + seed enrichment).  
**v2 server + RFQ prefill + enquiry: M–L** — +5–8 days depending on Enquiry API scope.

### Phase 0 — Prep (0.5d)

- [x] Enrich seed listings with `technicalSpecs`, `applications` for demo quality.
- [ ] Agree widget surfaces (marketplace-only vs global shell).

### Phase 1 — Core assistant MVP (2–3d)

- [ ] `DroneAssistantWidget` in `MarketingShell` (feature flag `NEXT_PUBLIC_ASSISTANT_ENABLED`).
- [ ] Intent + scoring pure functions + unit tests.
- [ ] Listing fetch cache + recommend UI (`ListingCard` compact).
- [ ] FAQ + scope guard responses.
- [ ] Analytics hook stub (optional `console`/Plausible event: `assistant_recommend`).

### Phase 2 — Handoff polish (1d)

- [ ] Deep links to marketplace sections with query params.
- [ ] Login hint on RFQ CTA for anonymous users.
- [ ] Mobile UX pass.

### Phase 3 — Backend recommend API (2–3d, v2)

- [ ] Nest `AssistantModule`, shared scoring, Swagger doc.
- [ ] Frontend switches to POST when flag on.
- [ ] e2e test: agri query returns agri seed listing.

### Phase 4 — Lead loop alignment (gap doc Phase C, v2)

- [ ] Replace enquiry CTA in assistant with native enquiry when API exists.
- [ ] RFQ query prefill for budget/DGCA/payload from assistant session.

---

## 10. Example dialog flows

### Scenario A — Agriculture spraying

**User:** “I need a drone for pesticide spraying in Punjab, DGCA compliant.”

**Parse:** category `AGRICULTURE_DRONE`, `requiresDgcaHint=true`, location note (no geo filter in MVP — mention in copy only).

**Rank (seed data):**  
1. Garud AgriSpray X1 (fixed ₹2,85,000, description mentions DGCA-friendly)  
2. Garud AgriSpray Lite S (price on request, MOQ 3)

**Assistant:** Short explainer + 2 cards + actions: “Get quote” → `/buyer/rfqs/new?listing={x1}`, “Compare on marketplace” → `/marketplace?section=drones&category=AGRICULTURE_DRONE`.

---

### Scenario B — Survey & mapping

**User:** “PPK mapping drone for construction site survey.”

**Parse:** `SURVEY_MAPPING_DRONE`, keywords PPK/mapping.

**Rank:** SurveyMapper Pro 40, SurveyMapper Lite 25 (keyword + category).

**Assistant:** Notes Pro 40 is price-on-request vs Lite 25 fixed ₹4,25,000 for quick checkout; suggests RFQ for base/rover options on Pro 40.

---

### Scenario C — Budget constrained

**User:** “Cheapest option under 3 lakh for spraying.”

**Parse:** `AGRICULTURE_DRONE`, `budgetMaxInr=300000`.

**Filter/score:** AgriSpray X1 at ₹2,85,000 ranks highest; exclude Industrial/Camera; penalize AgriSpray Lite (POR) unless no fixed-price match.

**Assistant:** “One listing with a published price fits your budget.” If none: fallback to RFQ with suggested `targetBudgetInr` in copy (manual entry until prefill v2).

---

## 11. Risks & dependencies

| Risk | Mitigation |
|------|------------|
| Sparse `technicalSpecs` / `applications` on live listings | Partner editor nudges; admin review checklist; seed enrichment |
| 50-listing API cap | v2 recommend endpoint + pagination; MVP OK for demo catalog |
| User expects live chat with partner | Copy: “Assistant finds listings; RFQ/enquiry reaches suppliers” |
| Duplicate fetch bandwidth | Shared SWR key / context provider |
| Enquiry still PHP | Assistant uses same enquiry URL as PDP until Phase C |

---

## 12. Success metrics (MVP)

- ≥1 listing click or RFQ click per assisted session (client event).
- <5% assistant sessions ending in API error state.
- Qualitative: sales demo can go from plain-language need → listing in <30 seconds.

---

## Appendix: Key file references

| Area | Path |
|------|------|
| Prisma model | `backend/prisma/schema.prisma` (`PartnerListing`, `Rfq`) |
| Marketplace API | `backend/src/modules/catalog/marketplace.controller.ts`, `catalog.service.ts` |
| Seed listings | `backend/prisma/seed.ts` (`seedDemoCatalogListings`) |
| Categories | `frontend/lib/platform/catalog-categories.ts`, `backend/src/modules/catalog/catalog-category.constants.ts` |
| Sections | `frontend/lib/platform/marketplace-sections.ts` |
| Listing card | `frontend/components/platform/ListingCard.tsx` |
| RFQ prefill | `frontend/app/(platform)/buyer/rfqs/new/page.tsx` |
| Gap / leads | `docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md` §6–7 |
