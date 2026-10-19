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
| [`docs/ADMIN_P0_PLAN.md`](docs/ADMIN_P0_PLAN.md) | **Admin P0** — listing moderation & publish gates (implementation plan) |
| [`docs/PROJECT_STATUS_DETAILED.md`](docs/PROJECT_STATUS_DETAILED.md) | **Current status** — UI / UX / backend tables, admin deep-dive, done vs remaining (Oct 2026) |
| [`docs/UI_UX_AND_SCALE_AUDIT_REPORT.md`](docs/UI_UX_AND_SCALE_AUDIT_REPORT.md) | UI/UX scan of built pages + scalability / P0–P2 recommendations (Oct 2026) |
| [`docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md`](docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md) | Commerce catalog fields, cart/checkout phases |
| [`PROJECT_WORKING_PRINCIPLES.md`](PROJECT_WORKING_PRINCIPLES.md) | Build order, phases, agent principles |
