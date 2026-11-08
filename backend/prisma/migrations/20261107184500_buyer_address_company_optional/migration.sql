-- Make saved-address company/organization optional for individual buyers
ALTER TABLE "buyer_addresses" ALTER COLUMN "company_name" DROP NOT NULL;
