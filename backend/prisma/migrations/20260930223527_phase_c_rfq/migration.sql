-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RfqInviteStatus" AS ENUM ('INVITED', 'QUOTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "buyer_organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CatalogCategory" NOT NULL,
    "listing_type" "ListingType",
    "quantity" INTEGER,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "deadline_at" TIMESTAMP(3),
    "status" "RfqStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_invites" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "vendor_organization_id" TEXT NOT NULL,
    "status" "RfqInviteStatus" NOT NULL DEFAULT 'INVITED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "vendor_organization_id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "price_inr" DECIMAL(14,2),
    "price_on_request" BOOLEAN NOT NULL DEFAULT false,
    "min_order_quantity" INTEGER,
    "lead_time_days" INTEGER,
    "notes" TEXT,
    "valid_until" TIMESTAMP(3),
    "status" "QuotationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rfqs_buyer_user_id_idx" ON "rfqs"("buyer_user_id");

-- CreateIndex
CREATE INDEX "rfqs_status_category_idx" ON "rfqs"("status", "category");

-- CreateIndex
CREATE INDEX "rfq_invites_vendor_organization_id_idx" ON "rfq_invites"("vendor_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_invites_rfq_id_vendor_organization_id_key" ON "rfq_invites"("rfq_id", "vendor_organization_id");

-- CreateIndex
CREATE INDEX "quotations_rfq_id_idx" ON "quotations"("rfq_id");

-- CreateIndex
CREATE INDEX "quotations_vendor_organization_id_idx" ON "quotations"("vendor_organization_id");

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_invites" ADD CONSTRAINT "rfq_invites_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_invites" ADD CONSTRAINT "rfq_invites_vendor_organization_id_fkey" FOREIGN KEY ("vendor_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_vendor_organization_id_fkey" FOREIGN KEY ("vendor_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
