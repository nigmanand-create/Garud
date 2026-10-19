-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'BANK_TRANSFER_NEFT_RTGS', 'CASH_ON_DELIVERY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_signature" TEXT,
    "utr_number" TEXT,
    "bank_reference" TEXT,
    "sender_bank_name" TEXT,
    "amount_inr" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
    "payment_method" TEXT,
    "metadata" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_order_id_idx" ON "payment_transactions"("gateway_order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_utr_number_idx" ON "payment_transactions"("utr_number");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
