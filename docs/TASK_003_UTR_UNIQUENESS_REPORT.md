# GarudHub — TASK-003: Enforce Global UTR Uniqueness Report

**Status:** Completed & Verified  
**Date:** 2026-10-20  
**Scope:** Payment Security & Concurrency Hardening (Bank Transfer UTR)

---

## 1. Executive Summary

A critical payment integrity vulnerability was identified where the same bank transfer reference (UTR / NEFT / RTGS) could be submitted against multiple orders. This allowed potential replay attacks where a single bank wire transfer could be cited to settle or initiate multiple distinct orders on the platform.

In **TASK-003**, global UTR uniqueness was enforced, concurrent duplicate submissions were protected with PostgreSQL transactional advisory locking, historical data was audited, and a 7-case regression test suite was established and verified.

---

## 2. Root Cause Analysis

### 2.1 Order-Scoped Validation Bug
In `backend/src/modules/payments/payments.service.ts` (`submitBankTransfer`), the existing duplication check was scoped strictly to the current order:

```typescript
// VULNERABLE CODE (BEFORE):
const existing = await this.prisma.paymentTransaction.findFirst({
  where: {
    orderId: order.id, // <-- Scoped strictly to current order!
    utrNumber: cleanUtr,
    status: {
      in: [TransactionStatus.PROCESSING, TransactionStatus.SUCCESS],
    },
  },
});
```

Because `orderId: order.id` was present in the query:
1. Reusing the same UTR on *Order A* was rejected.
2. But submitting the identical UTR on *Order B* returned HTTP 201 Success, generating a duplicate pending transaction.

### 2.2 Concurrency Race Condition Gap
The validation query and transaction creation were uncoordinated and executed outside an atomic, serialized lock. Two concurrent requests with the identical UTR could both execute `findFirst`, find no existing record, and simultaneously insert duplicate transactions.

### 2.3 Historical Seed Data Issue
In `backend/prisma/seed.ts`, the demo order seeding function `seedDemoOrders()` previously looped over existing orders and assigned a hardcoded UTR (`HDFC261012984102`) to each order without unique indexing.

---

## 3. Historical Data Inspection

Prior to considering any schema migration or table constraint, the active database was inspected:

```sql
SELECT utr_number, count(*), array_agg(order_id) as order_ids
FROM payment_transactions
WHERE utr_number IS NOT NULL
GROUP BY utr_number
HAVING count(*) > 1;
```

### Findings:
- Total payment transactions: **9**
- Duplicate UTR identified: **`HDFC261012984102`** was present across **3 separate orders** (`ada75b4f-8e42-4fbc-bdf8-18e47264ae49`, `03caf89a-6663-4217-a029-4d6b63c9aa5d`, `f0fa5601-5764-44b0-a35b-ecf8ebc88a80`).
- **Migration Impact:** Directly running a database migration with `CREATE UNIQUE INDEX ... ON payment_transactions (utr_number)` would immediately fail and abort due to the existing duplicate seed rows. A migration must only be scheduled after an explicit data deduplication migration.

---

## 4. Implementation Details

### 4.1 Global Scope & Status Inclusions
The check was updated to search across all orders in `payment_transactions`, rejecting any UTR already active in `PROCESSING`, `SUCCESS`, or `REFUNDED` states:

```typescript
const existing = await tx.paymentTransaction.findFirst({
  where: {
    utrNumber: cleanUtr,
    status: {
      in: [
        TransactionStatus.PROCESSING,
        TransactionStatus.SUCCESS,
        TransactionStatus.REFUNDED,
      ],
    },
  },
});
```
*Note:* Transactions in `FAILED` status (e.g., admin explicitly rejected due to non-receipt of funds or typo) do not block re-submission.

### 4.2 Consistent Normalization
Input is normalized via:
```typescript
const cleanUtr = dto.utrNumber.trim().toUpperCase();
```
This removes leading/trailing whitespace and standardizes character casing without altering internal delimiters, hyphens, or valid bank reference formats.

### 4.3 Data Privacy & Non-Revealing Error Contract
To comply with security standards (preventing enumeration of order IDs or user transactions), the exception thrown is a standard NestJS `ConflictException` (HTTP 409):
```typescript
if (existing) {
  throw new ConflictException(
    'This bank transfer reference (UTR) has already been submitted or processed.',
  );
}
```
The error response does not disclose:
- Whether the UTR belongs to the current user or another user.
- The order ID, vendor, or amount associated with the existing transaction.

### 4.4 Engine-Level Concurrency Safety via Transactional Advisory Lock
To ensure true concurrency safety without downtime or index collisions on historical data, `submitBankTransfer` executes inside `this.prisma.$transaction` using PostgreSQL's transaction-scoped advisory locking:

```typescript
return this.prisma.$transaction(async (tx) => {
  // Concurrency safety: acquire transaction-scoped advisory lock on the normalized UTR
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleanUtr}))`;

  const existing = await tx.paymentTransaction.findFirst({ ... });
  if (existing) {
    throw new ConflictException('This bank transfer reference (UTR) has already been submitted or processed.');
  }

  const createdTx = await tx.paymentTransaction.create({ ... });
  return { ... };
});
```

**Why this guarantees concurrency safety:**
1. `pg_advisory_xact_lock(hashtext(cleanUtr))` acquires an exclusive lock on the hash of the UTR within the PostgreSQL transaction.
2. If two concurrent requests arrive simultaneously with the same UTR, the second transaction waits until the first commits or rolls back.
3. Upon acquiring the lock, the second transaction's `findFirst` sees the newly committed record from the first transaction and throws `ConflictException`.
4. Submissions with *different* UTRs do not block each other, preserving full parallel throughput.
5. The lock is automatically released by PostgreSQL upon transaction completion (commit or rollback).

### 4.5 Seed Script Hardening
Updated `backend/prisma/seed.ts` so that future database seed runs generate unique UTR references (`HDFC261012980001`, `HDFC261012980002`, etc.) across demo orders.

---

## 5. Files Changed

| File | Change Summary |
|---|---|
| `backend/src/modules/payments/payments.service.ts` | Added `ConflictException` import, wrapped `submitBankTransfer` in `prisma.$transaction`, implemented `pg_advisory_xact_lock`, and expanded uniqueness check across all orders. |
| `backend/src/modules/payments/payments.service.spec.ts` | Created new comprehensive regression test suite covering all 6 functional requirements + access control. |
| `backend/prisma/seed.ts` | Updated demo order seeding to use distinct index-based UTR values. |

---

## 6. Verification and Test Results

### 6.1 Payment Service Regression Suite (`npm test`)
```bash
PASS src/modules/payments/payments.service.spec.ts
  PaymentsService - Bank Transfer UTR Uniqueness & Concurrency
    ✓ 1. accepts a new unique UTR (17 ms)
    ✓ 2. rejects reusing the same UTR on the same order (34 ms)
    ✓ 3. rejects reusing the same UTR on a different order (cross-order uniqueness) (14 ms)
    ✓ 4. handles equivalent normalized inputs consistently (case and whitespace) (11 ms)
    ✓ 5. concurrent duplicate submissions cannot both succeed (advisory lock race safety) (19 ms)
    ✓ 6. unrelated valid payment submissions continue to work concurrently (10 ms)
    ✓ 7. preserves order access control and validation (6 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        2.946 s
```

### 6.2 Backend E2E Tests (`npm run test:e2e`)
```bash
PASS test/app.e2e-spec.ts
  Health (e2e)
    ✓ /api/v1/health (GET) (68 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        1.122 s
```

### 6.3 Backend Linting (`npm run lint`)
```bash
> backend@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix

# Result: 0 errors, 0 warnings
```

### 6.4 Backend Build (`npm run build`)
```bash
> backend@0.0.1 build
> nest build

# Result: Successful build to dist/
```

### 6.5 Frontend Linting (`npm run lint`)
```bash
> garudhub-frontend@0.1.0 lint
> next lint

# Result: 0 errors
```

---

## 7. Migration Analysis & Remaining Risks

### Database Constraint Migration Plan
While `pg_advisory_xact_lock` guarantees concurrency safety at the application and engine level, a database partial unique index is recommended as secondary defense-in-depth once historical data is sanitized.

**Recommended Future Migration DDL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_transactions_active_utr
ON payment_transactions (utr_number)
WHERE utr_number IS NOT NULL AND status IN ('PROCESSING', 'SUCCESS', 'REFUNDED');
```

**Prerequisite for Future Migration:**
Before running the migration above in an environment with historical seed data, run the following deduplication script:
```sql
-- Append order ID suffix to historical duplicate demo UTRs
UPDATE payment_transactions
SET utr_number = utr_number || '-' || substr(order_id, 1, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY utr_number ORDER BY created_at) as rnum
    FROM payment_transactions
    WHERE utr_number IS NOT NULL
  ) t WHERE t.rnum > 1
);
```

### Remaining Operational Risks
- **Hash Collisions with `hashtext()`:** In PostgreSQL, `hashtext` produces a signed 32-bit integer. If two completely different UTRs hash to the same integer (a 1 in 4 billion probability), one will momentarily wait for the other to finish. Neither will be incorrectly rejected because the internal query checks `where: { utrNumber: cleanUtr }`.
- **Third-Party Payment Gateways:** Razorpay payments do not generate or use bank transfer UTRs (they use `gatewayPaymentId` and cryptographic HMAC signatures, which are already verified separately). Razorpay flow remains completely untouched.

---

## 8. Recommended Next Task

**TASK-004: End-to-End Order State & Fulfillment Workflow Validation**
- Validate order state transitions (`CONFIRMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` -> `CANCELLED`) across Buyer, Partner, and Admin roles.
- Ensure payment verification (`adminVerifyBankTransfer`) accurately transitions `order.paymentStatus` and dispatches notifications/audit events.
