/*
  Warnings:

  - Added the required column `bio` to the `FreelancerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "bio" TEXT NOT NULL;
