-- AlterEnum
ALTER TYPE "EnquiryStatus" ADD VALUE 'CLOSED';

-- CreateEnum
CREATE TYPE "EnquiryIntent" AS ENUM ('GENERAL', 'PRODUCT', 'DEMO', 'DISTRIBUTOR', 'PARTNER', 'SERVICE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "enquiries" ADD COLUMN "intent" "EnquiryIntent" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "service_key" TEXT,
ADD COLUMN "listing_id" TEXT,
ADD COLUMN "organization_id" TEXT,
ADD COLUMN "routed_at" TIMESTAMP(3),
ADD COLUMN "routed_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "intent" "EnquiryIntent" NOT NULL DEFAULT 'GENERAL',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "partner_note" TEXT,
    "contacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiries_intent_created_at_idx" ON "enquiries"("intent", "created_at");

-- CreateIndex
CREATE INDEX "enquiries_organization_id_created_at_idx" ON "enquiries"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "enquiries_listing_id_idx" ON "enquiries"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_enquiry_id_key" ON "leads"("enquiry_id");

-- CreateIndex
CREATE INDEX "leads_organization_id_status_created_at_idx" ON "leads"("organization_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
