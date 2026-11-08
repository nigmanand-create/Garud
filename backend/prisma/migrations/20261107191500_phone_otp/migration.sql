-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_e164" TEXT,
ADD COLUMN     "phone_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_challenges_phone_e164_created_at_idx" ON "otp_challenges"("phone_e164", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");
