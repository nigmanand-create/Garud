-- CreateEnum
CREATE TYPE "ApplicationDocumentType" AS ENUM ('GST_CERTIFICATE', 'CIN_CERTIFICATE', 'COMPANY_REGISTRATION', 'AUTHORIZATION_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "CatalogCategory" AS ENUM ('AGRICULTURE_DRONE', 'SURVEY_MAPPING_DRONE', 'INDUSTRIAL_ENTERPRISE_DRONE', 'CAMERA_DRONE', 'COMPONENT', 'ACCESSORY', 'PAYLOAD', 'REPAIR_MAINTENANCE', 'TRAINING', 'CONSULTANCY', 'OTHER');

-- CreateTable
CREATE TABLE "organization_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "document_type" "ApplicationDocumentType" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_relative_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_listings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "listing_type" "ListingType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" "CatalogCategory" NOT NULL,
    "description" TEXT,
    "technical_specs" TEXT,
    "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "min_order_quantity" INTEGER,
    "price_inr" DECIMAL(14,2),
    "price_on_request" BOOLEAN NOT NULL DEFAULT true,
    "warranty" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_documents_organization_id_idx" ON "organization_documents"("organization_id");

-- CreateIndex
CREATE INDEX "partner_listings_organization_id_idx" ON "partner_listings"("organization_id");

-- CreateIndex
CREATE INDEX "partner_listings_listing_type_category_is_published_idx" ON "partner_listings"("listing_type", "category", "is_published");

-- AddForeignKey
ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_listings" ADD CONSTRAINT "partner_listings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
