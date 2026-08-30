-- AlterTable
ALTER TABLE "household_members" ADD COLUMN     "authUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "household_members_authUserId_key" ON "household_members"("authUserId");

