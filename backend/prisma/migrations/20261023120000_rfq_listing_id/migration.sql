-- AlterTable
ALTER TABLE "rfqs" ADD COLUMN "listing_id" TEXT;

-- CreateIndex
CREATE INDEX "rfqs_listing_id_idx" ON "rfqs"("listing_id");

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
