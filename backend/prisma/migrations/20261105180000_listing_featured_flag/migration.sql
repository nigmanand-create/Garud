-- Admin-curated featured row on marketplace (NEXT-P2)
ALTER TABLE "partner_listings" ADD COLUMN "featured_on_marketplace" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "partner_listings_featured_on_marketplace_idx" ON "partner_listings"("featured_on_marketplace", "updated_at");
