-- CreateEnum
CREATE TYPE "TrainingCourseType" AS ENUM ('REMOTE_PILOT', 'TECHNICIAN', 'SPECIALIZED', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "TrainingMode" AS ENUM ('ONSITE', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "TrainingBatchStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StudentLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ENROLLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ServiceRequestCategory" AS ENUM ('REPAIR_AMC', 'COMPLIANCE', 'PROFESSIONAL', 'FINANCE_INSURANCE', 'SCRAP_RECYCLING', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('SUBMITTED', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceMatchStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "GovOpportunityType" AS ENUM ('TENDER', 'SCHEME', 'SUBSIDY');

-- CreateEnum
CREATE TYPE "GovOpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnquiryIntent" ADD VALUE 'TRAINING';
ALTER TYPE "EnquiryIntent" ADD VALUE 'FINANCE';
ALTER TYPE "EnquiryIntent" ADD VALUE 'REPAIR';
ALTER TYPE "EnquiryIntent" ADD VALUE 'SCRAP';
ALTER TYPE "EnquiryIntent" ADD VALUE 'TENDER';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "service_categories" "ServiceRequestCategory"[] DEFAULT ARRAY[]::"ServiceRequestCategory"[],
ADD COLUMN     "service_states" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "institute_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "accreditation" TEXT,
    "rpto_approval_no" TEXT,
    "about" TEXT,
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institute_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "course_type" "TrainingCourseType" NOT NULL DEFAULT 'REMOTE_PILOT',
    "mode" "TrainingMode" NOT NULL DEFAULT 'ONSITE',
    "description" TEXT,
    "duration_days" INTEGER,
    "fee_inr" DECIMAL(12,2),
    "eligibility" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_batches" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "seats" INTEGER NOT NULL,
    "seats_filled" INTEGER NOT NULL DEFAULT 0,
    "city" TEXT,
    "state" TEXT,
    "status" "TrainingBatchStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_training_leads" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "message" TEXT,
    "status" "StudentLeadStatus" NOT NULL DEFAULT 'NEW',
    "partner_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_training_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "tracking_token" TEXT NOT NULL,
    "buyer_user_id" TEXT,
    "enquiry_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_phone" TEXT,
    "category" "ServiceRequestCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "details" JSONB,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assigned_organization_id" TEXT,
    "match_scope" TEXT,
    "admin_note" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_matches" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "ServiceMatchStatus" NOT NULL DEFAULT 'OFFERED',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_updates" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "status" "ServiceRequestStatus",
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gov_opportunities" (
    "id" TEXT NOT NULL,
    "type" "GovOpportunityType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "issuing_body" TEXT NOT NULL,
    "reference_no" TEXT,
    "state" TEXT,
    "source_url" TEXT,
    "estimated_value_inr" DECIMAL(16,2),
    "open_date" TIMESTAMP(3),
    "closing_date" TIMESTAMP(3),
    "eligibility" TEXT,
    "status" "GovOpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gov_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institute_profiles_organization_id_key" ON "institute_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "training_courses_organization_id_idx" ON "training_courses"("organization_id");

-- CreateIndex
CREATE INDEX "training_courses_is_published_course_type_idx" ON "training_courses"("is_published", "course_type");

-- CreateIndex
CREATE INDEX "training_batches_course_id_start_date_idx" ON "training_batches"("course_id", "start_date");

-- CreateIndex
CREATE INDEX "student_training_leads_organization_id_status_created_at_idx" ON "student_training_leads"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "student_training_leads_course_id_idx" ON "student_training_leads"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_tracking_token_key" ON "service_requests"("tracking_token");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_enquiry_id_key" ON "service_requests"("enquiry_id");

-- CreateIndex
CREATE INDEX "service_requests_status_created_at_idx" ON "service_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "service_requests_buyer_user_id_created_at_idx" ON "service_requests"("buyer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "service_requests_assigned_organization_id_status_idx" ON "service_requests"("assigned_organization_id", "status");

-- CreateIndex
CREATE INDEX "service_request_matches_organization_id_status_idx" ON "service_request_matches"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_request_matches_request_id_organization_id_key" ON "service_request_matches"("request_id", "organization_id");

-- CreateIndex
CREATE INDEX "service_request_updates_request_id_created_at_idx" ON "service_request_updates"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "gov_opportunities_status_type_closing_date_idx" ON "gov_opportunities"("status", "type", "closing_date");

-- AddForeignKey
ALTER TABLE "institute_profiles" ADD CONSTRAINT "institute_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_courses" ADD CONSTRAINT "training_courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_batches" ADD CONSTRAINT "training_batches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_organization_id_fkey" FOREIGN KEY ("assigned_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_matches" ADD CONSTRAINT "service_request_matches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_matches" ADD CONSTRAINT "service_request_matches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_updates" ADD CONSTRAINT "service_request_updates_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "training_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
