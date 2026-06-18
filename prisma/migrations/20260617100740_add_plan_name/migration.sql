-- DropForeignKey
ALTER TABLE "Step" DROP CONSTRAINT "Step_planId_fkey";

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Untitled Plan',
ALTER COLUMN "originalInput" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
