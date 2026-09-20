-- Backfill all existing users to verified and default new users to verified.
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;

ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT true;
