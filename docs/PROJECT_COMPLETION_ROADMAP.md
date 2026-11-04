# GarudHub — project completion roadmap

> **Point-in-time document — may be stale.** Current status: [`CODE_LEVEL_STATUS.md`](./CODE_LEVEL_STATUS.md) · open work: [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) · routes: [`ROUTE_MAP.md`](./ROUTE_MAP.md).


**Vision:** Reach **~90% of the Decode JWT / wireframe spec** while **production is live and stable on [garudhub.me](https://garudhub.me)** — partial features become “done,” mega-features (Leads DB, full messaging, React home rewrite) follow in Phase C.

**Sources:** [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md), [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md), [`SPEC_VS_PROJECT_GAP_ANALYSIS.md`](./SPEC_VS_PROJECT_GAP_ANALYSIS.md)

**Estimation:** ~**1 week per sprint** at focused part-time eng; **Sprint 0** may run in parallel with Sprint 1 ops work.

---

## Sprint 0 — Ops & launch (checklist only)

**Goal:** P0 from [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) complete so **main → garudhub.me** is safe for real traffic.

**Tasks:** Use the P0 tables in PRODUCTION_READINESS — do not duplicate here.

| Area | IDs / refs |
|------|------------|
| Hosting & process | P0-H1 … P0-H5 |
| Secrets & config | P0-S1 … P0-S5 |
| Database | P0-D1 … P0-D4 |
| Security MVP | P0-SEC1 … P0-SEC5 |
| Payments | P0-PAY1 … P0-PAY3 |
| Files & uploads | P0-F1 … P0-F2 |
| Monitoring | P0-M1 … P0-M2 |
| Branching & release | P0-G1 … P0-G4 |

**Done criteria:** Staging smoke on **dev.garudhub.me**; production deploy from **main**; health check green; Razorpay webhook verified on prod domain; backup restore drill documented.

**Estimated duration:** 1–2 weeks (mostly Ops/Biz).

---

## Sprint 1 — Lead loop & marketplace polish

**Goal:** Close high-visibility **Partial → Done** items: PDP demo enquiry, services CTAs, home link parity, vendor directory.

| Task | Backlog IDs | Key deliverables |
|------|-------------|------------------|
| B4 Listing PDP CTAs | P-UI-04, B4 | “Request demo” → `/enquiry?subject=` with listing name/SKU |
| P-UX-02 Service pillars | P-UX-02, P-UI-02 | All 8 `/services` CTAs → `/enquiry?service=`, `/marketplace`, or RFQ (no `enquiry.php`) |
| A6 Home link parity | P-UI-01, A6 | Snapshot `/` CTAs bridged to React: `/marketplace`, `/services`, `/b2b-partners`, join |
| B3 Vendor directory | P-UI-05, B3 | `GET /marketplace/vendors` + `/marketplace/vendors` UI |

**Done criteria:**

- PDP demo + supplier enquiry use native `/enquiry` with contextual subject.
- `/services` has no legacy PHP enquiry links on primary (and secondary where defined) CTAs.
- Home snapshot hero/services/partner CTAs land on React routes after localization.
- Vendor index lists verified partners with published listing counts; links to partner storefront.

**Estimated duration:** 1 week.

---

## Sprint 2 — Admin, chrome & partner inbox (light)

**Goal:** Operational visibility and partner-facing lead surfaces without full Leads module.

| Task | Backlog IDs | Key deliverables |
|------|-------------|------------------|
| B5 Audit log viewer | P-UI-13, B5 | Admin global audit list (KYC + listing moderation) |
| B6 Platform chrome | P-UI-11, B6 | `/partner`, `/buyer`, `/admin` on `PlatformShell` **or** documented decision to keep `MarketingShell` |
| B7 Payments hardening doc | P-BE-02, P-INT-02, B7 | Live webhook runbook, env matrix, partner subscription gap doc |
| Partner enquiry inbox (light) | P-UX-03 | Partner view of enquiries tagged to their org/listing (read-only or status) |
| POR RFQ accept | gap § RFQ | Allow accept-to-order when quote is price-on-request (product rule + UI) |
| A7 Ship marketing trio | A7 | `/about-us`, `/services`, `/b2b-partners` merged and tagged on **main** |

**Done criteria:**

- Admin can browse audit entries without opening a single listing/KYC record.
- Chrome decision recorded in repo; partner/buyer/admin layouts consistent.
- B7 doc linked from PRODUCTION_READINESS P1 payments.
- Partners see inbound enquiries relevant to them (minimal filter).
- Buyer can accept at least one POR quotation path documented or implemented.

**Estimated duration:** 1–2 weeks.

---

## Sprint 3 — Marketplace & buyer journey depth

**Goal:** Move marketplace and registration from Partial toward spec-aligned UX.

| Task | Backlog IDs | Key deliverables |
|------|-------------|------------------|
| P-UI-03 / P-BE-01 follow-ups | P-UI-03, P-UX-01 | Search UX polish, filters, empty states |
| P-UI-06 Join / Register | P-UI-06 | Unified join narrative (signup + KYC steps) |
| P-UX-04 | P-UX-04 | Cart in header verified everywhere |
| Compare matrix (RFQ) | gap § Buyer RFQ | Side-by-side quotation compare v1 |
| Marketing bridge | P-UI-12 | High-traffic snapshots → React for top 5 paths |

**Done criteria:** Buyer can search, paginate, discover vendors, and post RFQ without dead-end PHP links; join flow documented end-to-end.

**Estimated duration:** 1–2 weeks.

---

## Sprint 4 — Partner dashboard & integrations prep

**Goal:** Honest module coverage and backend gaps for scale.

| Task | Backlog IDs | Key deliverables |
|------|-------------|------------------|
| P-UI-07 / P-UI-08 | Partner modules | Services module stub or catalog SERVICE workflows |
| P-UI-09 Admin | P-UI-09 | Enquiry queue enhancements, partnership moderation v1 |
| P-BE-04 Partnerships | P-BE-04 | Workflow states beyond org fields |
| P-BE-07 / P1-4 | Uploads | Volume mount doc or R2 spike |
| P-INT-01 | Integrations | Email notify on enquiry (transactional provider) |

**Done criteria:** Partner nav matches shipped vs roadmap; admin can moderate partnerships; enquiries trigger email.

**Estimated duration:** 2 weeks.

---

## Sprint 5+ — Phase C (spec depth, high level)

**Goal:** ~90% spec — core entities competitors expect, one vertical deep dive.

| Theme | Backlog IDs | Outcome |
|-------|-------------|---------|
| **C1 Leads** | C1, P-UX-03 | Lead entity + partner inbox for non-RFQ intents |
| **C2 Messages** | C2 | Threaded partner–buyer messaging (stub → MVP) |
| **C3 Analytics** | C3 | Partner overview: listing views, enquiry counts |
| **One vertical depth** | C5 or C6 or C8 | e.g. training batches **or** gov tenders **or** service matching workflow |
| **C7 React home** | C7, P-UI-01 | Spec blocks at `/` (after A6 bridge proves traffic paths) |
| **C4 Subscription** | C4, P-BE-02 | Partner billing when B7 live |

**Done criteria (Phase C exit):** Leads + basic analytics live; messages stub usable for pilot partners; one vertical has end-to-end demo; home either React or snapshot with ≥90% nav parity.

**Estimated duration:** 4–8 weeks (parallel workstreams).

---

## Tracking

- Update checkboxes in [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md) when a task’s **done criteria** are met.
- Re-run inventory when route count or Prisma models change.
- Production gate always references **Sprint 0** P0, not Phase C completeness.

---

*Last updated: Sprint 1 implementation pass.*
