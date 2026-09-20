-- CreateTable
CREATE TABLE IF NOT EXISTS "totp_keys" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "secret_encrypted" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'SHA1',
    "digits" INTEGER NOT NULL DEFAULT 6,
    "period" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "totp_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "totp_keys_userId_idx" ON "totp_keys"("userId");
