# Blog & legal content (Markdown CMS pattern)

GarudHub serves **blog** and **legal** pages from native React routes with Markdown source files. Remaining legacy marketing paths use **307 bridges** in `lib/snapshot-bridge.ts` or dedicated React pages — static `content/raw` HTML snapshots were removed (2026-11-05).

## Routes

| URL | Source |
|-----|--------|
| `/blogging` | React index — categories + recent posts |
| `/blogging/post/[slug]` | `content/blog/{slug}.md` |
| `/blogging/category/[slug]` | Filter posts by `category` frontmatter |
| `/legal/privacy`, `/legal/terms`, `/legal/refund` | `content/legal/{slug}.md` |
| `/blogging?slug=…` / `?category=…` | Middleware **rewrite** (unchanged) |
| `/legal.php?page=…` → `/legal.php/{page}` | Middleware rewrite, then **308** to `/legal/*` |

## Add a blog post

1. Create `frontend/content/blog/your-post-slug.md`:

```yaml
---
title: "Your headline"
slug: "your-post-slug"
date: 2026-11-05
category: "drone-guides"
categoryLabel: "Drone Guides"
readTime: "5 min read"
heroImage: "https://example.com/image.jpg"
description: "Short excerpt for cards and SEO."
---

Your markdown body here. Use `##` headings, lists, and links.
```

2. If the category is new, add an entry to `frontend/content/blog-categories.json`:

```json
{ "slug": "my-category", "label": "My Category" }
```

Use a **human-readable category name** in `label` (e.g. “Drone Guides”) — not the site title. After `migrate-blog-legal-content.mjs`, confirm `blog-categories.json` labels match the snapshot nav pills (fixed in `97a11fe`).

3. Run `npm run dev` — the post appears on `/blogging` and at `/blogging/post/your-post-slug`.

4. Re-run migration from snapshots only when refreshing from production HTML:

```bash
cd frontend && node scripts/migrate-blog-legal-content.mjs
```

## Add or edit legal copy

Edit `frontend/content/legal/privacy.md`, `terms.md`, or `refund.md`. Frontmatter:

```yaml
---
title: "Privacy Policy"
slug: "privacy"
legacyPage: "privacy"
---
```

## Rendering stack

- **Parser:** `gray-matter` (`lib/content/blog.ts`, `lib/content/legal.ts`)
- **UI:** `react-markdown` + `remark-gfm` in `components/content/MarkdownProse.tsx`
- **Chrome:** `MarketingShell` via `(platform)/layout.tsx`
- **Typography:** `platform-prose` + `app/styles/blog-legal.css`

## SEO

Each route implements Next.js `metadata` / `generateMetadata` from post or page frontmatter (`title`, `description`).

## Tests & smoke checks

- Unit: `npm test` — `lib/__tests__/blog-content.test.ts` (12 posts, 11 categories, 3 legal pages)
- Snapshots smoke (dev server on `:3001`): `npm run verify-snapshots`

## Migration stats (initial import)

- **12** blog posts → `frontend/content/blog/*.md`
- **11** categories → `frontend/content/blog-categories.json`
- **3** legal pages → `frontend/content/legal/*.md`
- Snapshot HTML under `content/raw/blogging*` and `legal.php*` kept as reference; routes no longer render them for blog/legal.

## Remaining marketing HTML (out of scope)

Other `content/raw/*.html` pages (marketplace clones, services, partners, etc.) still use `app/[...slug]/route.ts` or bridged React routes. Migrate them using the same Markdown + `(platform)` page pattern when prioritized.
