-- DropIndex
DROP INDEX "Project_budgetMax_idx";

-- DropIndex
DROP INDEX "Project_createdAt_idx";

-- CreateIndex
CREATE INDEX "Offer_projectId_status_idx" ON "Offer"("projectId", "status");

-- CreateIndex
CREATE INDEX "Project_status_categoryId_createdAt_idx" ON "Project"("status", "categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_status_budgetMax_idx" ON "Project"("status", "budgetMax");
