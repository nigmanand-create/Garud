-- Soft-delete: remove user from admin list while keeping row + FK history; blocks sign-in.

ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TYPE "AdminUserAuditAction" ADD VALUE IF NOT EXISTS 'USER_DELETED';
