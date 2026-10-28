# Demo accounts (local development only)

**Do not use these passwords in production.** Run `npm run prisma:seed` in `backend/` after migrations.

Default password for partner / buyer / government / checkout test: **`ChangeMeDemo123!`** (include the `!` at the end).  
Override for those accounts: set `DEMO_PASSWORD` in `backend/.env`.

**Admin** uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env` when set (this repo’s `.env.example` uses **`ChangeMeAdmin123!`** for admin — not the same as `ChangeMeDemo123!`).

| Email | Password | Role | After login (frontend) |
|-------|----------|------|------------------------|
| `admin@garudhub.local` | `ChangeMeAdmin123!` (if `ADMIN_PASSWORD` in `.env`) | `PLATFORM_ADMIN` | `/admin` |
| `partner@garudhub.local` | `ChangeMeDemo123!` | `PARTNER` (verified org) | `/partner` |
| `buyer@garudhub.local` | `ChangeMeDemo123!` | `BUYER` | `/marketplace` → cart `/buyer/cart`, orders `/buyer/orders`, RFQs `/buyer/rfqs` |
| `checkout-test@garudhub.local` | `ChangeMeDemo123!` | `BUYER` (dedicated checkout QA) | Same as buyer — use this account for checkout flows |
| `government@garudhub.local` | `ChangeMeDemo123!` | `GOVERNMENT` | Same as buyer (cart + RFQs) |

Login: http://localhost:3001/auth/login

## Checkout test (manual QA)

Use the dedicated buyer so cart/checkout state does not mix with other demos.

| Field | Value |
|-------|--------|
| Email | `checkout-test@garudhub.local` |
| Password | `ChangeMeDemo123!` |

**Listing to add to cart:** **Garud AgriSpray X1** (SKU `GD-AGRI-X1`) — published, fixed price ₹2,85,000, from verified partner **Demo Drone Manufacturing Pvt Ltd** (`partner@garudhub.local`).

**Steps**

1. Start Postgres (`docker compose up -d` from repo root) and seed: `cd backend && npm run prisma:migrate && npm run prisma:seed`.
2. Open http://localhost:3001/auth/login and sign in with the checkout test email/password.
3. Go to **Marketplace** (`/marketplace`), open **Garud AgriSpray X1**, set quantity ≥ 1, **Add to cart**.
4. Open **Cart** (`/buyer/cart`), review line items, proceed to **Checkout**.
5. Complete checkout and confirm order appears under **Orders** (`/buyer/orders`).

Backend API (if running): `POST http://localhost:3000/api/v1/auth/login` with JSON `{ "email": "checkout-test@garudhub.local", "password": "ChangeMeDemo123!" }`.

## Demo listings (partner@garudhub.local)

All catalog items below belong to **Demo Drone Manufacturing Pvt Ltd**. Re-seed with `cd backend && npm run prisma:seed`. Published SKUs include **technical specs** and **application tags** for marketplace PDPs and the upcoming drone assistant scorer.

| SKU | Name | Type | Category | Checkout |
|-----|------|------|----------|----------|
| `GD-AGRI-X1` | Garud AgriSpray X1 | Product | Agriculture drone | **Cart** (₹2,85,000) |
| `GD-SURV-40` | SurveyMapper Pro 40 | Product | Survey / mapping | **RFQ** |
| `GD-INDU-M600` | Garud Industrial Lift M600 | Product | Industrial / enterprise | **Cart** (₹12,50,000) |
| `GD-CAM-M3E` | Garud CinemaCam M3E | Product | Camera drone | **Cart** (₹89,500) |
| `GD-COMP-FC32` | Garud NavCore FC-32 Flight Controller | Product | Component | **Cart** (₹12,800, MOQ 5) |
| `GD-ACC-BATT88` | Garud PowerPack 88Wh Battery Kit | Product | Accessory | **Cart** (₹18,500, MOQ 2) |
| `GD-PAY-MULTI` | Garud MultiSpec NDVI Payload | Product | Payload | **RFQ** |
| `GD-SURV-25` | SurveyMapper Lite 25 | Product | Survey / mapping | **Cart** (₹4,25,000) |
| `GD-AGRI-LITE` | Garud AgriSpray Lite S | Product | Agriculture drone | **RFQ** (MOQ 3) |
| `GD-SVC-TRN-01` | Garud Pilot Academy — DGCA Category Training | Service | Training | **Cart** (₹45,000) |
| `GD-SVC-RM-01` | Garud Care Annual Maintenance Contract | Service | Repair / maintenance | **RFQ** |
| `GD-SVC-CON-01` | Garud Fleet Ops & Compliance Consultancy | Service | Consultancy | **RFQ** |
| `GD-DRAFT-PROT` | Garud ProtoFrame X (Draft) | Product | Other | Partner draft — not on marketplace |
| `GD-PEND-REV` | Garud ThermalInspect T2 (Pending Review) | Product | Industrial / enterprise | Admin queue — not on marketplace |
