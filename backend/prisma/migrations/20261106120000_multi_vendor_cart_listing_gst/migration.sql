-- Multi-vendor cart: one cart row per (buyer, seller); listing GST/HSN snapshots on order lines.

-- Drop single-cart-per-user constraint; enforce uniqueness per (user, seller).
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_user_id_key";
DROP INDEX IF EXISTS "carts_user_id_key";

CREATE UNIQUE INDEX "carts_user_id_partner_organization_id_key"
  ON "carts"("user_id", "partner_organization_id");

-- Optional GST readiness fields on listings (filled when catalog supports them).
ALTER TABLE "partner_listings" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
ALTER TABLE "partner_listings" ADD COLUMN IF NOT EXISTS "gst_percent" DECIMAL(5,2);

-- Snapshots on order line items (immutable at order time).
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "snapshot_hsn_code" TEXT;
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "snapshot_gst_percent" DECIMAL(5,2);
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "taxable_value_inr" DECIMAL(14,2);
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "cgst_inr" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "sgst_inr" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "igst_inr" DECIMAL(14,2) NOT NULL DEFAULT 0;
