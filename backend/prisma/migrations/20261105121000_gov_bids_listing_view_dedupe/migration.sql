-- Listing view visitor key (24h dedupe) + gov tender bid vault
ALTER TABLE "listing_views" ADD COLUMN "visitor_key" TEXT NOT NULL DEFAULT 'legacy';

UPDATE "listing_views" SET "visitor_key" = "id" WHERE "visitor_key" = 'legacy';

ALTER TABLE "listing_views" ALTER COLUMN "visitor_key" DROP DEFAULT;

CREATE INDEX "listing_views_listing_id_visitor_key_created_at_idx" ON "listing_views"("listing_id", "visitor_key", "created_at");

CREATE TABLE "gov_opportunity_bids" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "bidder_user_id" TEXT NOT NULL,
    "amount_inr" DECIMAL(16,2) NOT NULL,
    "stored_relative_path" TEXT,
    "original_filename" TEXT,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gov_opportunity_bids_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gov_opportunity_bids_opportunity_id_bidder_user_id_key" ON "gov_opportunity_bids"("opportunity_id", "bidder_user_id");

CREATE INDEX "gov_opportunity_bids_opportunity_id_created_at_idx" ON "gov_opportunity_bids"("opportunity_id", "created_at");

ALTER TABLE "gov_opportunity_bids" ADD CONSTRAINT "gov_opportunity_bids_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "gov_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gov_opportunity_bids" ADD CONSTRAINT "gov_opportunity_bids_bidder_user_id_fkey" FOREIGN KEY ("bidder_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
