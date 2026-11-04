-- CreateEnum
CREATE TYPE "PlanBillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PartnerSubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "partner_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_inr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "billing_period" "PlanBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "listing_limit" INTEGER,
    "featured_placement" BOOLEAN NOT NULL DEFAULT false,
    "rfq_priority" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "razorpay_plan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "PartnerSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpay_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "assigned_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_plans_key_key" ON "partner_plans"("key");

-- CreateIndex
CREATE UNIQUE INDEX "partner_subscriptions_organization_id_key" ON "partner_subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_subscriptions_razorpay_subscription_id_key" ON "partner_subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "partner_subscriptions_plan_id_idx" ON "partner_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "partner_subscriptions_status_idx" ON "partner_subscriptions"("status");

-- AddForeignKey
ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "partner_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
