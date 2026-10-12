# GarudHub — Agent Working Principles

These principles govern how work is planned, executed, and reviewed for the GarudHub (B2B drone ecosystem) project. They apply until the client explicitly changes direction.

---

## 1. North star

- **Product goal:** GarudHub is a **business-generation platform** — registration, verification, listings, RFQs, leads, partnerships — not a static marketing site.
- **Positioning anchor:** “India’s B2B Drone Ecosystem Platform” (blueprint), while respecting what already exists on [garudhub.com](https://garudhub.com/) (DroneHub lifecycle messaging) until product/marketing decisions say otherwise.
- **Every feature** should trace to a **persona journey**: buyer, manufacturer, international company, distributor/dealer, service provider, training institute, government/PSU, or platform admin.

---

## 2. Source of truth (priority order)

1. **Explicit instructions** from the client in the current conversation.
2. **`decode_jwt.docx` blueprint** — site map, flows, dashboard modules, RFQ model, partner types.
3. **Live site** — reference for existing branding, copy, and services; **not** assumed to be the target IA or B2B product model.
4. **Code and infra in this repo** — once present, conventions in code override assumptions from the doc.

When the doc and live site conflict, **call out the conflict** and follow the client’s choice; default to **blueprint for product structure**, **live site for brand/contact/legal** unless told otherwise.

---

## 3. Build order (current mandate)

- **Platform and logic before UI polish.** Prefer APIs, data models, auth, workflows, and admin/partner capabilities over pixel-perfect pages.
- **Vertical slices over horizontal layers:** ship one end-to-end path (e.g. “partner registers → pending verification → admin approves → profile active”) before spreading thin across all eight services.
- **No Figma deliverables** from the agent; optional **specs/wireframes in markdown** for humans or designers when useful.

---

## 4. Scope discipline

- **Smallest correct change** that satisfies the agreed slice; no drive-by refactors or unrelated features.
- **No new abstractions** until a second use case appears; match existing stack and patterns once the repo exists.
- **No commits, PRs, or pushes** unless the client asks.
- **No secrets** in repo; use env templates and document required variables only.

---

## 5. Libraries and modules first (reuse before build)

- **Do not write custom code** for a capability when a **maintained library, framework module, or managed service** can do the job reliably (auth/JWT, password hashing, ORM, validation, file storage SDK, email/SMS, job queues, etc.).
- **Before implementing**, briefly check: Is there a standard package for this stack? Does the framework ship an official or de-facto module? Only then write GarudHub-specific logic.
- **Reserve custom code** for **domain rules** that are unique to this product (partner verification workflow, RFQ matching, account-type permissions, lead routing) — not for reinventing HTTP auth, migrations, or S3 uploads.
- **Choose dependencies** using: active maintenance, license compatibility, security track record, fit with the agreed stack, and operational cost (self-host vs SaaS).
- **Avoid “not invented here”:** thin adapters wrapping a library are fine; copying large algorithms or crypto from scratch is not.
- When adding a dependency, **note what it replaces** (one line in env example, module README, or commit/PR description when the client asks for commits).

---

## 6. Discovery before implementation

Before writing substantial code:

- Confirm **stack** — **NestJS + PostgreSQL (Prisma)**, **JWT access + refresh** (confirmed).
- Map the task to **blueprint section** (e.g. Join GarudHub, RFQ, Partner Dashboard module).
- List **entities and states** (e.g. application: draft → submitted → under_review → approved/rejected).
- Identify **integrations** early: payments (e.g. Vistarkriya on live site), email/SMS, document storage, DGCA-related data (informational vs verified).

If blocked on a product decision, **one focused question** with recommended default — not a long questionnaire.

---

## 7. Architecture defaults (until overridden)

- **Clear boundaries:** public marketing (later), authenticated partner area, admin/ops, marketplace/RFQ core.
- **Auth:** session or JWT with explicit expiry, refresh strategy, and role-based access (partner types, buyer, admin).
- **Verification:** partner onboarding is ** gated** — no public listing/leads until approved unless specified.
- **Audit trail** for verification decisions, RFQ submissions, and lead assignment.
- **API-first** so a future UI (WordPress, Next.js, mobile) can attach without redoing business rules.

---

## 8. Data and compliance mindset

- Treat **GST, CIN, uploads, and PII** as sensitive: minimal collection, secure storage, access by role only.
- **RFQ and leads:** clear ownership (which vendor saw which requirement), no leaking buyer contact without policy/consent.
- Align copy and fields with **Indian B2B** expectations (company type, state/city, MOQ, price on request).

---

## 9. Quality bar

- **Behavior over ceremony:** tests where they protect real workflows (auth, state transitions, RFQ routing); skip trivial tests.
- After substantive edits: **lint/typecheck** for the stack in use; fix issues introduced by the change.
- **Manual test checklist** in PR or message when the client asks for a PR — steps a human can run.

---

## 10. Communication

- **Summarize intent** before large work; **summarize outcome** after (what changed, how to run, what’s next).
- Use **code citations** when referencing existing code; plain language for product/status updates.
- Flag **risks early:** scope creep, doc/live-site mismatch, missing backend on live WordPress-only setup, etc.

---

## 11. Suggested phase map (flexible)

| Phase | Focus |
|-------|--------|
| **A — Foundation** | Repo structure, env, auth, roles, partner application model + admin approval |
| **B — Partner core** | Profile, products/services listing (CRUD), document uploads |
| **C — Marketplace & RFQ** | Catalog, search filters, RFQ post → vendor match → quotations |
| **D — Dashboard** | Leads, enquiries, messages, basic analytics |
| **E — Integrations** | Payments/subscriptions, notifications |
| **F — UI** | Marketing alignment + partner dashboard UI (when client prioritizes) |

Phases reorder per client priority; never skip **auth + verification** for partner-facing features.

---

## 12. Definition of done (per task)

- Matches agreed slice and blueprint intent (or documented deviation).
- Runnable locally with documented commands.
- Roles and states behave correctly; happy path + one failure path considered.
- Client knows **what to test** and **what is intentionally out of scope**.

---

## 13. Single web app (marketing + platform)

Marketing snapshots and the PRD platform UI share **one Next.js frontend** on the same origin (`:3001` in local dev). Cross-links are applied in `frontend/lib/snapshot-html.ts` and in `PlatformShell` (Home → `/`). Route map and run instructions: **`PROJECT_TWO_TRACKS.md`**.

---

*Last updated: §13 single web app; §5 Libraries first — revise when stack, hosting, or priorities are confirmed.*
