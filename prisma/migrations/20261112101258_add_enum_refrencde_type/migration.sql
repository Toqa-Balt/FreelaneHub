/*
  Warnings:

  - The `referenceType` column on the `WalletTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PROJECT', 'OFFER');

-- AlterTable
ALTER TABLE "WalletTransaction" DROP COLUMN "referenceType",
ADD COLUMN     "referenceType" "ReferenceType";
