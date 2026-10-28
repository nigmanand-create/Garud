# GarudHub — one web app, two surfaces

The **frontend** (`frontend/`) is a single Next.js application on **one origin** (local dev: `http://localhost:3001`). Users stay on the same host whether they read marketing content or use the B2B platform.

| Surface | What it is | How it is served |
|--------|------------|------------------|
| **Marketing** | Cloned garudhub.com HTML snapshots (DroneHub lifecycle pages, blog, legal) | `app/route.ts`, `app/[...slug]/route.ts`, `lib/snapshot-html.ts` — full HTML documents, not wrapped in the React root layout |
| **Platform** | PRD-backed UI (marketplace, auth, partner, buyer, admin) | `app/(platform)/…` — React + `PlatformShell` header |

## Route map (same origin)

| Path | Surface |
|------|---------|
| `/`, `/about-us`, `/drone-training`, … | Marketing snapshots |
| `/blogging`, `/legal.php/*` | Marketing (with `middleware.ts` query rewrites) |
| `/marketplace`, `/auth/*`, `/partner/*`, `/buyer/*`, `/admin/*` | Platform UI |
| `/platform-api/v1/*` | API proxy to NestJS (`:3000`) |

## Bridging the two surfaces

- **Marketing → platform:** `localizeSnapshotHtml()` rewrites key CTAs (e.g. Drone Marketplace → `/marketplace`, Drone Accessories → `/marketplace?section=accessories`, partner join → `/auth/register`) after URLs are made relative. The standalone `/drone-accessories` snapshot is deprecated; `middleware.ts` redirects it to the marketplace.
- **Platform → marketing:** Platform header **Home** and brand link go to `/`.

Long term, marketing snapshots can be replaced by React pages; until then, link bridging keeps one product feel without refactoring snapshot markup.

## Run

See `frontend/README.md` — start Postgres, backend (`:3000`), then `npm run dev` in `frontend` (`:3001`).

## Product & platform docs

| Doc | Purpose |
|-----|---------|
| [`docs/UI_DESIGN_CONSISTENCY_PLAN.md`](docs/UI_DESIGN_CONSISTENCY_PLAN.md) | **UI polish plan** — 33 platform pages, Phase A/B/C (approve before build) |
| [`docs/CLIENT_PRESENTATION_RUNBOOK.md`](docs/CLIENT_PRESENTATION_RUNBOOK.md) | **Client demo** — script, accounts, checklists |
| [`docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md`](docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md) | **Spec vs build** — `DECODE_JWT_SPEC.txt` vs UI/UX/backend; why the app feels scattered |
| [`docs/CODE_LEVEL_STATUS.md`](docs/CODE_LEVEL_STATUS.md) | **Live code inventory** — routes, APIs, Prisma, features (Oct 2026; supersedes detailed status doc) |
| [`docs/ADMIN_P0_PLAN.md`](docs/ADMIN_P0_PLAN.md) | **Admin P0** — listing moderation & publish gates (implementation plan) |
| [`docs/PROJECT_STATUS_DETAILED.md`](docs/PROJECT_STATUS_DETAILED.md) | UI / UX / backend tables (Oct 20 — **stale**; use `CODE_LEVEL_STATUS.md` first) |
| [`docs/UI_UX_AND_SCALE_AUDIT_REPORT.md`](docs/UI_UX_AND_SCALE_AUDIT_REPORT.md) | UI/UX scan of built pages + scalability / P0–P2 recommendations (Oct 2026) |
| [`docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md`](docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md) | Commerce catalog fields, cart/checkout phases |
| [`PROJECT_WORKING_PRINCIPLES.md`](PROJECT_WORKING_PRINCIPLES.md) | Build order, phases, agent principles |
