-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'MAX';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trialUsedAt" TIMESTAMP(3);
