-- CreateTable
CREATE TABLE "buyer_addresses" (
    "id" TEXT NOT NULL,
    "buyer_organization_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyer_addresses_buyer_organization_id_idx" ON "buyer_addresses"("buyer_organization_id");

-- CreateIndex
CREATE INDEX "buyer_addresses_buyer_organization_id_is_default_idx" ON "buyer_addresses"("buyer_organization_id", "is_default");

-- AddForeignKey
ALTER TABLE "buyer_addresses" ADD CONSTRAINT "buyer_addresses_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
