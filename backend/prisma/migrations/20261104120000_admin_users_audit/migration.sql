-- CreateEnum
CREATE TYPE "AdminUserAuditAction" AS ENUM ('USER_CREATED', 'ROLE_CHANGED', 'PASSWORD_RESET', 'USER_DISABLED', 'USER_ENABLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disabled_at" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_user_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "target_email" TEXT NOT NULL,
    "action" "AdminUserAuditAction" NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_user_audit_logs_target_user_id_idx" ON "admin_user_audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "admin_user_audit_logs_created_at_idx" ON "admin_user_audit_logs"("created_at");

