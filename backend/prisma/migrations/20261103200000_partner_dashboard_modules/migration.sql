-- CreateEnum
CREATE TYPE "PartnershipRequestType" AS ENUM ('DISTRIBUTORSHIP', 'DEALERSHIP', 'OEM_PARTNERSHIP', 'TECHNOLOGY_INTEGRATION', 'SERVICE_PARTNERSHIP', 'TRAINING_PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnershipRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageSenderSide" AS ENUM ('BUYER', 'PARTNER');

-- CreateTable
CREATE TABLE "listing_views" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnership_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "target_organization_id" TEXT,
    "type" "PartnershipRequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "regions" TEXT,
    "status" "PartnershipRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "admin_note" TEXT,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "buyer_organization_id" TEXT,
    "partner_organization_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "subject" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_side" "MessageSenderSide",
    "buyer_last_read_at" TIMESTAMP(3),
    "partner_last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "sender_side" "MessageSenderSide" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_views_organization_id_created_at_idx" ON "listing_views"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "listing_views_listing_id_created_at_idx" ON "listing_views"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "partnership_requests_organization_id_created_at_idx" ON "partnership_requests"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "partnership_requests_status_created_at_idx" ON "partnership_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "conversations_buyer_user_id_last_message_at_idx" ON "conversations"("buyer_user_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_partner_organization_id_last_message_at_idx" ON "conversations"("partner_organization_id", "last_message_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_requests" ADD CONSTRAINT "partnership_requests_target_organization_id_fkey" FOREIGN KEY ("target_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_partner_organization_id_fkey" FOREIGN KEY ("partner_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "partner_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
