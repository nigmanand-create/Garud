-- AlterTable
ALTER TABLE "order_line_items" ADD COLUMN     "snapshot_image_url" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "carrier_name" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "dispatched_at" TIMESTAMP(3),
ADD COLUMN     "estimated_delivery_at" TIMESTAMP(3),
ADD COLUMN     "fulfillment_notes" TEXT,
ADD COLUMN     "hardware_serial_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tracking_number" TEXT,
ADD COLUMN     "tracking_url" TEXT;
