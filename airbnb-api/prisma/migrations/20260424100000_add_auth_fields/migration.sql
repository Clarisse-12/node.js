-- Add auth fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);

-- Backfill password for existing rows with a temporary hash so the NOT NULL change succeeds.
UPDATE "User"
SET "password" = '$2b$10$xzIBK3KW5GSeu9xRJzjXOeyJsEUuxbEsDITkZ1Wwk1z6u.hcXxcpq'
WHERE "password" IS NULL;

ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;