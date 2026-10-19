# GarudHub — TASK-004: Order State and Fulfillment Workflow Validation Audit

**Status:** Completed & Verified  
**Date:** 2026-10-20  
**Scope:** Order Lifecycle Architecture, Multi-Role Transitions (Buyer, Partner, Admin), Payment Reconciliation & Concurrency Verification

---

## 1. Phase A — TASK-003 Verification & Advisory Lock Analysis

### 1.1 Technical Deep Dive: `$executeRaw` vs. `$queryRaw` for Advisory Locks
In Prisma Client with PostgreSQL:
- `SELECT pg_advisory_xact_lock(hashtext('...'))` is a PostgreSQL function that returns type `void`.
- When invoked via `prisma.$queryRaw`, Prisma attempts to deserialize the return column into a JavaScript object. Because PostgreSQL `void` is not a deserializable column type in Prisma's query engine, running `prisma.$queryRaw` without a cast fails with:
  ```
  PrismaClientKnownRequestError (P2010): Failed to deserialize column of type 'void'.
  ```
  To use `$queryRaw`, one must explicitly cast the void function: `SELECT pg_advisory_xact_lock(...)::text`.
- When invoked via `prisma.$executeRaw`, Prisma executes the raw command and returns the affected row count (`1`), bypassing return value deserialization.
- **Verification on Real PostgreSQL:**
  A test harness was run against the active PostgreSQL instance:
  - Both `$executeRaw` and `$queryRaw` (with `::text`) were verified to hold an exclusive transaction-scoped lock until commit/rollback.
  - Concurrent transactions serialized cleanly; the second transaction blocked until the first committed.
  - `payments.service.ts` uses `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtext(${cleanUtr}))\``, which executes natively without error and provides genuine database-level concurrency protection.

### 1.2 Database Environment & Seed Audit
- The test suites ran against a real PostgreSQL 16 database running in Docker (`garudhub-postgres`) on port 5434.
- Concurrency and cross-order uniqueness tests are executed against real database transactions, not in-memory or mocked database objects.
- Historical data was inspected and left intact; no historical records were altered, and no manual deduplication SQL was executed against the database.
- Future seeds (`backend/prisma/seed.ts`) will generate unique UTR references per order.

---

## 2. Order Lifecycle Architecture

The GarudHub commerce system separates the order state space into three orthogonal dimensions:
1. **`OrderStatus` (Lifecycle/Validity):** `CONFIRMED` | `CANCELLED`
2. **`PaymentStatus` (Financial Settlement):** `PENDING` | `PAID` | `FAILED` | `REFUNDED`
3. **`FulfillmentStatus` (Logistical Execution):** `PENDING` | `PROCESSING` | `SHIPPED` | `FULFILLED`

Transactions attached to orders have their own lifecycle:
- **`TransactionStatus`:** `CREATED` | `PROCESSING` | `SUCCESS` | `FAILED` | `REFUNDED`

---

## 3. Order State Transition Matrix

The table below documents the actual transition rules enforced across controllers, services, and authorization guards:

| State Dimension | Current State | Action / Event | Actor | Expected Next State | Validation / Guards |
|---|---|---|---|---|---|
| **`OrderStatus`** | `[Cart Non-Empty]` | Place Checkout | Buyer / Govt | `CONFIRMED` | Cart non-empty, partner verified, buyer cannot purchase from own org. Cart deleted upon placement. |
| **`OrderStatus`** | `CONFIRMED` | Cancel Order | Admin | `CANCELLED` | Requires non-empty cancellation reason. Logged in audit trail. |
| **`OrderStatus`** | `CANCELLED` | Cancel Order | Admin | `REJECTED (400)` | Throws `BadRequestException('Order is already cancelled')`. |
| **`OrderStatus`** | `CANCELLED` | Update Fulfillment | Partner | `REJECTED (422)` | Throws `UnprocessableEntityException('Cannot update fulfillment on a cancelled order')`. |
| **`OrderStatus`** | `CANCELLED` | Submit Bank Transfer | Buyer / Govt | `REJECTED (422)` | Throws `UnprocessableEntityException('Cannot submit transfer for a cancelled order')`. |
| **`OrderStatus`** | `CANCELLED` | Admin Verify Payment | Admin | `REJECTED (422)` | Throws `UnprocessableEntityException('Cannot verify payment for a cancelled order')`. |
| **`PaymentStatus`** | `[New Order]` | Initialization | System | `PENDING` | Initial state upon checkout. |
| **`PaymentStatus`** | `PENDING` | Submit Bank Transfer | Buyer / Govt | `PENDING` | Creates `PaymentTransaction` with `status: PROCESSING`. Global UTR uniqueness verified under advisory lock. |
| **`PaymentStatus`** | `PAID` | Submit Bank Transfer | Buyer / Govt | `REJECTED (422)` | Throws `UnprocessableEntityException('This order is already marked as PAID')`. |
| **`PaymentStatus`** | `PENDING` | Online Payment Verify | Buyer / Govt | `PAID` | Verifies Razorpay HMAC-SHA256 signature. Sets transaction to `SUCCESS` and order to `PAID`. |
| **`PaymentStatus`** | `PENDING` | Admin Approve UTR | Admin | `PAID` | Atomic transaction: `PaymentTransaction.status` $\rightarrow$ `SUCCESS`, `order.paymentStatus` $\rightarrow$ `PAID`. |
| **`PaymentStatus`** | `PENDING` | Admin Reject UTR | Admin | `PENDING` | Sets `PaymentTransaction.status` $\rightarrow$ `FAILED` with `failureReason` and audit metadata. Order remains `PENDING`. |
| **`PaymentStatus`** | `PAID` | Repeated Verification | Admin | `REJECTED (400)` | Throws `BadRequestException('Payment transaction has already been approved and settled')`. |
| **`PaymentStatus`** | `*` | Manual Payment Override | Admin | Any `PaymentStatus` | Admin can set `PENDING`, `PAID`, `FAILED`, `REFUNDED` via `/admin/orders/:id/payment`. |
| **`FulfillmentStatus`** | `[New Order]` | Initialization | System | `PENDING` | Initial fulfillment status on checkout. |
| **`FulfillmentStatus`** | `PENDING` | Start Processing | Partner | `PROCESSING` | Caller must own vendor organization; order must not be cancelled. |
| **`FulfillmentStatus`** | `PROCESSING` | Mark Shipped | Partner | `SHIPPED` | Caller must own vendor organization; order must not be cancelled. |
| **`FulfillmentStatus`** | `SHIPPED` | Mark Fulfilled | Partner | `FULFILLED` | Caller must own vendor organization; order must not be cancelled. |
| **`FulfillmentStatus`** | `*` | Any Update | Other Partner | `REJECTED (404)` | Caller org does not match order `vendorOrganizationId`. |
| **`FulfillmentStatus`** | `*` | Any Update | Buyer / Admin | `REJECTED (403)` | Guarded by `VerifiedPartnerGuard` & `@Roles(UserRole.PARTNER)`. |

---

## 4. Files Inspected and Modified

### Modified Files:
1. `backend/src/modules/payments/payments.service.ts`:
   - Added validation in `submitBankTransfer`: prevents submitting bank transfer UTRs on already-`PAID` orders.
   - Added validations in `adminVerifyBankTransfer`:
     - Blocks verifying payment for `CANCELLED` orders (`422 UnprocessableEntityException`).
     - Rejects duplicate approval on already `SUCCESS` transactions (`400 BadRequestException`).
     - Rejects duplicate rejection on already `FAILED` transactions (`400 BadRequestException`).
2. `backend/src/modules/commerce/orders.service.spec.ts` *(New)*:
   - Comprehensive 15-case automated regression suite testing all order lifecycle rules, cross-role authorization, state transitions, and audit trails against the real PostgreSQL database.

### Inspected Files:
- `backend/src/modules/commerce/orders.service.ts`
- `backend/src/modules/commerce/checkout.service.ts`
- `backend/src/modules/commerce/buyer-orders.controller.ts`
- `backend/src/modules/commerce/partner-orders.controller.ts`
- `backend/src/modules/admin/admin.service.ts`
- `backend/src/modules/admin/admin.controller.ts`
- `frontend/components/platform/PartnerOrderFulfillmentPanel.tsx`
- `frontend/lib/platform/fulfillment.ts`
- `frontend/app/(platform)/admin/orders/[id]/page.tsx`
- `frontend/app/(platform)/buyer/orders/[id]/page.tsx`
- `frontend/app/(platform)/partner/orders/[id]/page.tsx`

---

## 5. Test Execution & Verification

### 5.1 Test Suites Execution (`npm test -- --verbose`)
All 22 automated integration tests passed against real PostgreSQL:

```bash
PASS src/modules/commerce/orders.service.spec.ts
  Orders & Fulfillment Workflow Integration (TASK-004)
    1. Fulfillment Transitions
      ✓ allows a partner to progress fulfillment through standard stages (PENDING -> PROCESSING -> SHIPPED -> FULFILLED) (31 ms)
      ✓ rejects fulfillment status updates on a CANCELLED order (11 ms)
      ✓ rejects fulfillment updates from a partner who does not own the vendor organization (6 ms)
    2. Buyer Access & Payment Submission Restrictions
      ✓ allows the order owner to view order details but rejects other buyers (7 ms)
      ✓ rejects bank transfer submission if order is CANCELLED (5 ms)
      ✓ rejects bank transfer submission if order is already PAID (8 ms)
      ✓ rejects bank transfer submission by an unauthorized user (5 ms)
    3. Payment Reconciliation Workflow (Admin Approval & Rejection)
      ✓ approving a bank transfer sets transaction to SUCCESS and order paymentStatus to PAID (18 ms)
      ✓ rejecting a bank transfer sets transaction to FAILED and keeps order paymentStatus PENDING (12 ms)
      ✓ rejects repeated verification on an already settled (SUCCESS) transaction (13 ms)
      ✓ rejects verifying payment for a CANCELLED order (11 ms)
    4. Order Cancellation & State Consistency
      ✓ admin cancels order and sets status to CANCELLED (5 ms)
      ✓ rejects duplicate cancellation attempt on an already CANCELLED order (6 ms)
      ✓ cancellation after payment preserves paymentStatus as PAID unless explicitly refunded (7 ms)
    5. Audit and Notification System Assessment
      ✓ verifies that no external notification provider is bound (documents missing provider)

PASS src/modules/payments/payments.service.spec.ts
  PaymentsService - Bank Transfer UTR Uniqueness & Concurrency
    ✓ 1. accepts a new unique UTR (14 ms)
    ✓ 2. rejects reusing the same UTR on the same order (27 ms)
    ✓ 3. rejects reusing the same UTR on a different order (cross-order uniqueness) (14 ms)
    ✓ 4. handles equivalent normalized inputs consistently (case and whitespace) (9 ms)
    ✓ 5. concurrent duplicate submissions cannot both succeed (advisory lock race safety) (18 ms)
    ✓ 6. unrelated valid payment submissions continue to work concurrently (12 ms)
    ✓ 7. preserves order access control and validation (6 ms)

Test Suites: 2 passed, 2 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        3.149 s
```

### 5.2 Backend E2E Tests (`npm run test:e2e`)
```bash
PASS test/app.e2e-spec.ts
  Health (e2e)
    ✓ /api/v1/health (GET) (65 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.732 s
```

### 5.3 Backend Linting (`npm run lint`)
```bash
> backend@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix
# Result: 0 errors, 0 warnings
```

### 5.4 Backend Build (`npm run build`)
```bash
> backend@0.0.1 build
> nest build
# Result: Clean compilation to dist/
```

### 5.5 Frontend Linting (`npm run lint`)
```bash
> garudhub-frontend@0.1.0 lint
> next lint
# Result: 0 errors
```

---

## 6. Security and Consistency Findings

1. **Cross-Tenant Authorization Isolation:**
   - Buyers can only access orders where `buyerUserId === currentUserId`. Any attempt by another buyer returns 404 (preventing order ID enumeration).
   - Partners can only access and modify orders where `vendorOrganizationId === partnerOrgId`. Requests by other partners return 404.
2. **Terminal Invariant Preservation:**
   - When an order is `CANCELLED`, all mutating actions (fulfillment status updates, payment submissions, payment approvals) are blocked with `422 UnprocessableEntityException`.
3. **Idempotent Reconciliation & Replay Protection:**
   - Re-verifying a bank transaction that has already reached `SUCCESS` or `FAILED` is rejected with `400 BadRequestException`.
4. **Audit Traceability:**
   - Bank transfer approval and rejection events record the acting admin's ID, timestamp, and rejection reason inside `payment_transactions.metadata`.
   - Order cancellations are logged with acting admin ID and reason.

---

## 7. Missing Business Decisions Requiring Client Approval

1. **External Notification Provider (Email / SMS / WhatsApp):**
   - **Finding:** Currently, zero notification services or providers are integrated. Neither buyers nor partners receive transactional emails/SMS when orders are placed, paid, shipped, or cancelled.
   - **Client Decision Needed:** Specify email provider (e.g. AWS SES, SendGrid, Postmark) and SMS/WhatsApp provider (e.g. Twilio, MSG91, Gupshup) along with production API credentials and notification templates.
2. **Buyer Cancellation Policy:**
   - **Finding:** Currently, only `PLATFORM_ADMIN` can cancel an order. Buyers do not have an automated cancel option, even before payment or processing.
   - **Client Decision Needed:** Should buyers be permitted to cancel an order within a specific window (e.g., while `paymentStatus == PENDING` and `fulfillmentStatus == PENDING`)?
3. **Automated Refund Processing:**
   - **Finding:** Automated refunds via Razorpay API or escrow bank transfers are not implemented. An admin can only manually change `order.paymentStatus` to `REFUNDED` in the database.
   - **Client Decision Needed:** Should automated Razorpay refund initiation be enabled for online card/UPI payments? How should bank transfer refunds be processed and reconciled?
4. **Fulfillment Sequence Enforcement:**
   - **Finding:** Current API permits partners to transition between any fulfillment status (e.g. directly from `PENDING` to `FULFILLED` or `SHIPPED`).
   - **Client Decision Needed:** Does the business require strict forward-only linear progression (`PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SHIPPED` $\rightarrow$ `FULFILLED`), or should flexibility be maintained for immediate deliveries, software/services, and ready stock?

---

## 8. Recommended Next Safest Task

**TASK-005: RFQ (Request for Quotation) & Vendor Bidding Lifecycle Audit & Hardening**
- Audit the quotation lifecycle across Buyer, Partner, and Admin roles.
- Verify RFQ creation, category-based partner invitation matching, quotation submission, pricing validation, deadline enforcement, and award/contract conversion.
