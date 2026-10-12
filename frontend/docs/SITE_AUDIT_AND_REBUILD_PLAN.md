# GarudHub (garudhub.com) — Site audit & rebuild plan

**Status:** **Phase 0 complete** — full-site HTML snapshot replica on Next.js 15 (`frontend/`, port **3001**). Page list signed off; React page-by-page rebuild is **Phase 1+** below.  
**Live reference:** https://garudhub.com/  
**Target stack:** Next.js 15 (marketing + app UI) + NestJS API (new platform)

**Local replica (current):** Each URL serves production HTML from `content/raw/` + `public/index.html` with link localization, enquiry POST proxy, and `/api/*` rewrite to live PHP APIs. Run `npm run verify-snapshots` after `npm run dev`.

---

## 1. Why local dev shows 500 on `layout.css` / `main-app.js`

This is usually **not** “CSS broken” — the **Next dev server failed** and every asset returns 500.

Common causes on this project:

| Cause | What to do |
|--------|------------|
| **Port 3001 already in use** (stale `next dev`) | Stop old process, restart clean |
| **Corrupt `.next` cache** after many hot reloads | `rm -rf .next` then `npm run dev` |
| **Compile error** in `app/` while server is half-up | Read terminal stack trace, fix once |

```bash
# macOS — free port 3001
lsof -ti :3001 | xargs kill -9
cd frontend
rm -rf .next
npm run dev
```

Until the terminal shows `✓ Ready`, ignore browser errors for `_next/static/*`.

---

## 2. What the live site actually is

| Layer | Technology |
|--------|------------|
| Hosting / CMS | **Vistarkriya** multi-tenant PHP platform |
| Public pages | PHP wrappers + **embedded HTML page builders** (full mini-documents inside `<main>`) |
| Shared chrome | Reusable **header** (mega menu + mobile drawer) + **C-type footer** |
| Styling | Bootstrap 5 + tenant CSS under `/assets/css/` + **large inline `<style>` blocks per page** |
| Icons | Bootstrap Icons + Phosphor (many landings) |
| Motion | **GSAP + ScrollTrigger** (service/about/partner landings), custom JS (home hero, sliders), **AOS** (shell) |
| Forms | **PHP POST** (`enquiry.php`), AJAX to **`/api/get_states.php`** |
| Payments / vendor | References to **Vistarkriya** (registration, promotions) — not in this repo |

There is **no single React/WordPress theme** in the client’s possession — the live site is the source of truth.

---

## 3. Design system (global UI)

| Token | Value / usage |
|--------|----------------|
| Primary green | `#2F5233` (topbar, brand “amber” variable on home) |
| Paper background | `#F6F2E7` |
| Ink text | `#14150F` |
| Accent CTA (header) | Orange outline `#e06d00` |
| Fonts | **Inter** (body), **Sora** (headings on landings), **JetBrains Mono** (tags) |
| Layout width | ~`88rem` content max, responsive gutters |
| Header | Green topbar (email, phone) → sticky white nav → mega dropdowns (2-col) → mobile 85% drawer |
| Footer | Logo, 5 link columns, purple “Contact Us” CTA row, trust badges, legal links |

**UX patterns (global):**

- Skip link → `#main-content`
- Active nav item on current section
- Mega menu: hover (desktop) / accordion (mobile)
- CTAs route to service pages or `/enquiry.php`
- Many long pages: hero → proof/stats → feature rows → CTA band → contact strip

---

## 4. Page inventory (47 cloned routes + home)

### 4.1 Primary navigation (order)

| # | URL | Purpose |
|---|-----|---------|
| 1 | `/` | Marketing home — full lifecycle story |
| 2 | `/about-us` | Company / platform story |
| 3–11 | **Services** (9 URLs) | Vertical landing pages |
| 12–13 | **Marketplace** | Catalog marketing (not live cart in static HTML) |
| 14–19 | **Partners** | B2B / India entry landings |
| 20 | `/blogging` | Blog index + categories |
| 21–32 | `/blogging?slug=…` | 12 articles |
| 33–43 | `/blogging?category=…` | 11 category filters |
| 44 | `/enquiry.php` | **Lead / contact form** |
| 45 | `/loan-calculators.php` | **Multi-tab EMI tools** |
| 46–48 | `/legal.php?page=tos\|privacy\|refund` | Legal text |
| — | `/about.php` | **404 on live** → use `/about-us` |

### 4.2 Page templates (for rebuild)

| Template | Example URLs | UI building blocks |
|----------|----------------|-------------------|
| **A — Mega home** | `/` | Video hero, letter animation, lifecycle rail, 8 service rows, marketplace grids, finance slider, training/repair timelines, partner grid, marquee |
| **B — GSAP landing** | `/dgca-compliance`, most services, partners | Hero + parallax image, `.gs-reveal` / `.gs-stagger` scroll animations, stat counters, tilt cards, service-specific sections |
| **C — CMS simple** | Some inner wrappers | Bootstrap `.container` + `.page-content` around embedded HTML |
| **D — Utility PHP** | `enquiry.php`, `loan-calculators.php`, `legal.php` | Form-heavy or calculator tabs; less GSAP |
| **E — Blog** | `blogging`, slug, category | Featured post, card grid, category chips |

---

## 5. Functionality map (what must work beyond “looking right”)

### 5.1 Global (every page)

| Feature | Mechanism | Rebuild notes |
|---------|-----------|----------------|
| Desktop mega menu | `header-desktop.js` + CSS | React: `SiteHeader` + same class names or reimplement |
| Mobile menu / submenu | `header-mobile.js` | Toggle drawer, backdrop, accordion |
| Footer links | Static | Straightforward |
| AOS (optional) | `aos.js` + init | May overlap GSAP; decide per template |
| Sticky header | CSS + JS | Test scroll offset |

### 5.2 Home (`/`)

| Feature | Mechanism |
|---------|-----------|
| Hero background video | `<video>` + play on interaction fallback |
| Heading letter stagger | Custom JS (`vhero-*`) |
| Finance loan/insurance carousel | `.fin-slide` interval + dots |
| Animated counters | `IntersectionObserver` + `[data-count]` |
| Scroll sections | Mostly static reveal (home disables some gs classes) |
| In-page anchors | `#services`, etc. |
| `killTopGap` | Forces layout flush under header — **conflicts with React hydration** |

### 5.3 Service / partner landings (template B)

| Feature | Mechanism |
|---------|-----------|
| GSAP scroll reveals | `gsap` + `ScrollTrigger` on `.gs-reveal`, `.gs-left`, `.gs-right`, `.gs-stagger` |
| Hero parallax | Scroll listener on `.pg-hero-img` |
| Card tilt | Mousemove on `.pillar-item`, `.reg-card`, etc. |
| Counters | Same as home |
| CTAs | Links to `/enquiry.php` or sibling services |

### 5.4 Enquiry (`/enquiry.php`)

| Feature | Mechanism | Backend |
|---------|-----------|---------|
| Multi-field form | POST to same PHP | **Server-side email/CRM** on Vistarkriya |
| Country → state | `fetch('/api/get_states.php?country_id=')` | PHP API |
| Phone validation | Client JS | — |
| Remarks word count | Client JS | — |
| Pincode validation | Optional regex | — |

**Rebuild:** Nest endpoint for enquiry + states; do not rely on PHP proxy long term.

### 5.5 Loan calculators (`/loan-calculators.php`)

| Feature | Mechanism |
|---------|-----------|
| Tabbed calculators | EMI, eligibility, prepayment, balance transfer, part payment (verify on live) |
| Range sliders ↔ inputs | Sync + recalculate |
| Charts | Canvas/SVG updates on calculate |
| Export CSV | `downloadCSV` helpers |

**Rebuild:** Pure client React hooks + shared `formatINR()` — no server.

### 5.6 Blog (`/blogging`)

| Feature | Mechanism |
|---------|-----------|
| Category filter | Query `?category=` |
| Article pages | Query `?slug=` |
| Card grid | Static HTML from CMS |

**Rebuild:** MDX or CMS later; static generation from JSON is enough for parity.

### 5.7 Marketplace pages

| Feature | Live behavior (observed) |
|---------|---------------------------|
| Product grids | Marketing showcase; links may point to enquiry or external |
| Login / vendor dashboard | **Not in cloned HTML** — likely separate Vistarkriya app URLs |

**Clarify with client:** real e-commerce vs lead-gen only.

---

## 6. Current repo approach — honest assessment

| Approach | Pros | Cons |
|----------|------|------|
| **HTML dump + `dangerouslySetInnerHTML` + `new Function(script)`** | Fast visual copy | Hydration issues, script order bugs, fragile with Next SPA navigation, hard to maintain |
| **What we have in `content/pages/`** | 47 pages snapshotted | **Design ~yes, behavior ~partial** |

**Conclusion:** Treat current `frontend/` clone as a **reference archive**, not the final architecture.

---

## 7. Recommended rebuild phases (after you approve this map)

| Phase | Deliverable | Outcome |
|-------|-------------|---------|
| **0 — Discovery** | This document + per-page checklist signed off | No more ad-hoc fixes |
| **1 — Shell** | `SiteHeader`, `SiteFooter`, tokens, fonts, assets in repo | Nav works everywhere |
| **2 — Home** | React sections, tested animations | `/` pixel-parity |
| **3 — Template B** | One service page as pattern → roll out 9 + 6 partner pages | GSAP via `useGSAP` or CSS |
| **4 — Utilities** | Enquiry + calculators + legal in React | Nest APIs where needed |
| **5 — Blog** | Index + slug routes | Static or headless |
| **6 — Product** | Auth, marketplace, RFQ (Nest) | New features on top |

---

## 8. Per-page QA checklist (use when rebuilding)

For each URL:

- [ ] Desktop layout ≥1280px  
- [ ] Mobile 375px (menu, sections stack)  
- [ ] All CTAs go to correct route  
- [ ] Animations (if any) on scroll/hover  
- [ ] Forms submit / calculators update  
- [ ] No console errors  
- [ ] Lighthouse acceptable (perf secondary to parity for now)

---

## 9. Immediate next step (your call)

1. **You confirm** this map (add/remove pages, especially marketplace login/vendor).  
2. **We stop** patching the HTML-injection runner except keeping `content/raw` as reference.  
3. **We start Phase 1** (header/footer in real React components) on a **clean branch**.

---

*Generated from live site navigation, cloned `content/pages/manifest.json` (47 routes), and raw HTML/JS analysis.*
