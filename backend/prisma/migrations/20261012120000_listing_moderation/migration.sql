-- CreateEnum
CREATE TYPE "ListingReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'UNPUBLISHED');

-- AlterTable
ALTER TABLE "partner_listings" ADD COLUMN     "review_status" "ListingReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "submitted_for_review_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" TEXT;

-- Backfill: grandfather published listings as APPROVED
UPDATE "partner_listings" SET "review_status" = 'APPROVED' WHERE "is_published" = true;

-- CreateTable
CREATE TABLE "listing_moderation_audit_logs" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "from_status" "ListingReviewStatus" NOT NULL,
    "to_status" "ListingReviewStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_moderation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_listings_review_status_updated_at_idx" ON "partner_listings"("review_status", "updated_at");

-- CreateIndex
CREATE INDEX "listing_moderation_audit_logs_listing_id_idx" ON "listing_moderation_audit_logs"("listing_id");

-- AddForeignKey
ALTER TABLE "listing_moderation_audit_logs" ADD CONSTRAINT "listing_moderation_audit_logs_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
