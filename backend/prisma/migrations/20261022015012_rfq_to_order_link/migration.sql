-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuotationStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "QuotationStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "order_line_items" ALTER COLUMN "listing_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "quotation_id" TEXT,
ADD COLUMN     "rfq_id" TEXT;

-- CreateIndex
CREATE INDEX "orders_rfq_id_idx" ON "orders"("rfq_id");

-- CreateIndex
CREATE INDEX "orders_quotation_id_idx" ON "orders"("quotation_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
