# Unwanted / dead code audit

**Date:** 2026-11-05  
**Scope:** Repo scan; **cleanup applied 2026-11-05** (see [Removed](#removed-on-2026-11-05)).

---

## Removed on 2026-11-05

| Removed | Notes |
|---------|--------|
| `frontend/content/raw/**` (~47 HTML snapshots) | Superseded by React routes + MDX blog/legal; catch-all removed. |
| `frontend/content/pages/**` + `manifest.json` | Unused `ClonedPage` stack. |
| `frontend/app/[...slug]/route.ts` | Served raw snapshots; unbridged legacy URLs now **404** (use bridge map or React routes). |
| `frontend/scripts/clone-all-pages.mjs`, `extract-site-parts.mjs`, `migrate-blog-legal-content.mjs` | One-off clone/migration tools; npm scripts removed. |
| `ClonedPage.tsx`, `PageScriptRunner.tsx`, `pages-manifest.ts` | No imports. |
| `SnapshotMainContent.tsx`, unused `SiteHeader` / `SiteFooter` / `HomeBody` / `SiteSkipLink`, `read-content.ts`, fragment HTML (`home-body.html`, etc.) | Dead marketing shell from pre-React home. |
| `HtmlFragment.tsx` | No remaining consumers. |
| `snapshot-html.ts` file loaders (`loadSnapshotHtml`, `htmlResponse`, `patchSnapshotDocumentMeta`) | Kept **`localizeSnapshotHtml`** for link rewrite tests. |

**Kept intentionally:** `lib/snapshot-bridge.ts`, `middleware.ts`, `lib/snapshot-html.ts` (`localizeSnapshotHtml`), `enquiry.php` redirect route, `legal.php/[page]` canonical redirects, MDX `content/blog` + `content/legal`, break-glass paths below.

**Behavior change:** Old bookmark URLs that were **only** in snapshot HTML (not in `SNAPSHOT_REACT_BRIDGE`) return **404** until a React page or bridge entry is added.

---

## Still open (not removed)

| Location | Why kept / follow-up |
|----------|---------------------|
| `frontend/content/legal/*.md` | Dual-brand GarudHub / DroneHub disclaimers — legal copy TODO. |
| `frontend/lib/content/blog.ts` | Filters legacy `DroneHub` category label from frontmatter. |
| `frontend/lib/api/auth-storage.ts` | `NEXT_PUBLIC_AUTH_SESSION=bearer` break-glass. |
| `frontend/components/platform/PaymentGatewayModal.tsx` | Sandbox/mock payment paths for non-prod. |
| `backend/prisma/seed.ts`, `backend/scripts/reset-commerce-data.ts` | Demo data + gated production wipe. |
| Duplicate API entry (Nest direct vs `platform-api` proxy) | Intentional; UI should use same-origin proxy. |
| `middleware.ts` matcher vs `SNAPSHOT_REACT_BRIDGE` | Manual sync required when adding bridges. |
| Root `docs/*.md` referencing old `content/raw` | Historical; update when editing those docs. |

---

## Suggested next steps

1. Add React pages or bridge entries for any legacy URL that must not 404 (check analytics / Search Console).  
2. Resolve DroneHub vs GarudHub in legal MDX only (snapshots gone).  
3. Trim stale references in `MANUAL_URL_TEST_LIST.md`, `ROUTE_MAP.md`, `BLOG_LEGAL_MDX.md` when doing doc pass.
