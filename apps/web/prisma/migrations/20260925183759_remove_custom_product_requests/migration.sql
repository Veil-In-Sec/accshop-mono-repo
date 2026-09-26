/*
  Warnings:

  - You are about to drop the `custom_product_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "custom_product_requests" DROP CONSTRAINT "custom_product_requests_orderId_fkey";

-- DropForeignKey
ALTER TABLE "custom_product_requests" DROP CONSTRAINT "custom_product_requests_userId_fkey";

-- DropTable
DROP TABLE "custom_product_requests";
