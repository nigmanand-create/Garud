-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'FULFILLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';
