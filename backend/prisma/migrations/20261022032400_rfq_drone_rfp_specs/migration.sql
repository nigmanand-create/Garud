-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "dgca_model_number" TEXT,
ADD COLUMN     "quoted_endurance_min" INTEGER,
ADD COLUMN     "quoted_payload_kg" DECIMAL(8,2),
ADD COLUMN     "warranty_months" INTEGER;

-- AlterTable
ALTER TABLE "rfqs" ADD COLUMN     "endurance_minutes" INTEGER,
ADD COLUMN     "is_dgca_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payload_capacity_kg" DECIMAL(8,2),
ADD COLUMN     "specs_document_url" TEXT,
ADD COLUMN     "target_budget_inr" DECIMAL(14,2);
