-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'customer',
    "text" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_userId_idx" ON "support_messages"("userId");
