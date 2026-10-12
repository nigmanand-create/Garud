-- AlterTable
ALTER TABLE "partner_listings" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "primary_image_url" TEXT,
ADD COLUMN     "gallery_image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
