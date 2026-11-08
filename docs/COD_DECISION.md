# Cash on Delivery (COD) — business decision (NEXT-B1)

**Priority:** P2 · **Owners:** Biz (B1) · Dev (B2)  
**Status:** Blocked on business decision  
**Task tracking:** [NEXT-B1 / NEXT-B2](./NEXT_TASK_LIST.md#sprint-business-optional) · [PRD Phase 4 deferral](./PRD_REMAINING_TASKS.md#phase-4--marketplace-prd-gaps) · [Payments runbook](./PAYMENTS_RUNBOOK.md)

**Code baseline:** Partial COD path ships behind `COD_ENABLED` (default **off**). Production and staging should leave the flag unset unless Biz explicitly approves.

---

## Executive summary for leadership

| Question | Answer today |
|----------|----------------|
| Can buyers pay with COD in production? | **No** — UI is hidden unless API has `COD_ENABLED=true`. |
| Is any COD code live in the repo? | **Yes** — checkout, transaction record, buyer order UX, payment guards, receipt label. |
| Is COD “production-ready”? | **No** — admin reconciliation is manual/generic; ops runbook and policy gaps remain. |

Biz must pick one of **three options** (below) before Dev treats **NEXT-B2** as in scope.

---

## What already exists (feature-flagged)

### Configuration

| Piece | Location | Behavior |
|-------|----------|----------|
| `COD_ENABLED` | `backend/.env.example`, `env.validation.ts` | When not `true`, API rejects `paymentMethod: CASH_ON_DELIVERY` at place-order. |
| Checkout config API | `GET /buyer/checkout/config` → `{ codEnabled }` | `checkout.service.ts#getCheckoutFlags()` |

### Buyer checkout & order UX

| Piece | Location | Behavior |
|-------|----------|----------|
| COD payment radio | `frontend/.../buyer/checkout/page.tsx` | Rendered only when `codEnabled` from config. |
| Place order | `POST /buyer/checkout/place` with `paymentMethod: CASH_ON_DELIVERY` | Creates order (`paymentStatus: PENDING`) + `PaymentTransaction` (`gateway: CASH_ON_DELIVERY`, `status: PROCESSING`). Skips Razorpay modal (same as offline PO). |
| Order detail | `frontend/.../buyer/orders/[id]/page.tsx` | `codPaymentPending` copy; no online pay / UTR CTAs. |

### Backend payment guards

| Piece | Location | Behavior |
|-------|----------|----------|
| Block Razorpay / UTR | `payments.service.ts` | `POST /payments/intent`, verify, UTR submission return **422** for COD orders. |
| Webhook safety | `payments.service.ts` | Ignores Razorpay capture if order has COD transaction. |

### Billing / receipts

| Piece | Location | Behavior |
|-------|----------|----------|
| Receipt label | `billing-receipts.service.ts` | Shows “Cash on delivery (settled offline)” when gateway is COD. |

### Documentation

- [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) §1 — COD row in payment surfaces table and env matrix.

### Data model

- `PaymentGateway.CASH_ON_DELIVERY` in Prisma (migration since Oct 2025).

---

## Gaps — what NEXT-B2 would still need (if Biz approves)

These are the reasons **NEXT-B2** remains open even though a “happy path” exists behind the flag.

### 1. Admin reconciliation (primary gap)

- COD transactions appear in `/admin/orders/[id]` but the UI labels non-Razorpay rows as **“Corporate NEFT/RTGS Wire”** — misleading for COD.
- **Approve UTR** actions only render for `BANK_TRANSFER_NEFT_RTGS` + `PROCESSING`. COD has **no dedicated “cash collected”** action.
- Ops can mark `paymentStatus` via generic admin override, but that does **not** consistently set the COD `PaymentTransaction` to `SUCCESS` with audit metadata (unlike `adminVerifyBankTransfer` for wire).
- **Needed:** `adminVerifyCod` (or extend verify endpoint), admin UI labels/actions, runbook steps, optional courier reference field.

### 2. Order lifecycle & partner ops

- Partners can advance **fulfillment** while `paymentStatus` is still `PENDING` (intended for COD ship-then-collect, but undocumented).
- **Needed:** Explicit policy in runbook: dispatch rules, who bears non-payment risk, when to cancel; optional partner dashboard hint (“COD — collect on delivery”).

### 3. Product / legal / commercial policy

- No published **COD eligibility** (order value caps, categories, regions, B2B vs consumer, drone-specific risk).
- No **refund / RTO** flow tied to failed COD collection.
- Marketing/checkout copy is generic (“pay the courier”) — may not match actual logistics partners.

### 4. Quality & environments

- **No automated tests** for COD place-order, guards, or admin settlement (wire path is tested in `orders.service.spec.ts`; COD is not).
- Staging smoke ([STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md)) does not include a COD scenario.
- Stale status docs still claim COD is unused — see [Outdated doc notes](#outdated-doc-notes) below.

### 5. Optional hardening (if “full COD” is chosen)

- Pincode / vendor allowlist for pilot.
- Hide COD for government buyers or high-value carts.
- E-invoice / GST timing when payment is collected at delivery (Biz + compliance).

---

## NEXT-B1 — three options for Biz

Record the chosen option (and date) in this section when decided.

### Option A — Approve full COD

- **Biz:** Accept ship-before-pay risk; define caps, categories, and refund/RTO policy; approve enabling `COD_ENABLED` on staging then production.
- **Dev (B2):** Admin COD reconciliation, UI fixes, tests, staging smoke, runbook §COD settlement, refresh PRD/status docs.
- **Ops:** Train on manual collection → admin mark-paid workflow until B2 ships dedicated action.

### Option B — Defer and hide COD (recommended default for B2B drones)

- **Biz:** Formal “no COD” for launch; Razorpay + NEFT/RTGS remain the only buyer paths.
- **Dev:** Keep `COD_ENABLED` **unset/false** on all hosts; optional follow-up: remove COD radio from builds or add compile-time guard (not required if env stays off).
- **Outcome:** No B2 work; close B1 as “deferred”; update PRD Phase 4 COD item to “won’t do” with rationale.

### Option C — Limited pilot

- **Biz:** COD only for defined pilot (e.g. one vendor org, max order value, specific states/pincodes, staging-only or single prod partner).
- **Dev (B2):** Everything in Option A, plus **pilot constraints** in code (`COD_*` allowlists or per-vendor flag), monitoring, and a 30–60 day review date.
- **Ops:** Pilot partner list and escalation path documented.

---

## Decision log

| Date | Decision (A / B / C) | Notes | Decided by |
|------|----------------------|-------|------------|
| _TBD_ | | | |

---

## Outdated doc notes

The following files predate the `COD_ENABLED` implementation and still say COD is “unused.” Prefer **this doc** and [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) until those files are refreshed as part of B2:

- [CODE_LEVEL_STATUS.md](./CODE_LEVEL_STATUS.md) — “no controller/UI path”
- [PRD_REMAINING_TASKS.md](./PRD_REMAINING_TASKS.md) — Phase 4 COD checkbox (“enum is unused in code”)
- [SPEC_VS_PROJECT_GAP_ANALYSIS.md](./SPEC_VS_PROJECT_GAP_ANALYSIS.md) — “enum unused”

---

## Key code references (audit 2026-11-08)

| Area | File |
|------|------|
| Flag + place order | `backend/src/modules/commerce/checkout.service.ts` |
| Checkout config route | `backend/src/modules/commerce/buyer-checkout.controller.ts` |
| Payment blocks | `backend/src/modules/payments/payments.service.ts` |
| Buyer checkout UI | `frontend/app/(platform)/buyer/checkout/page.tsx` |
| Admin transactions | `frontend/app/(platform)/admin/orders/[id]/page.tsx` |
