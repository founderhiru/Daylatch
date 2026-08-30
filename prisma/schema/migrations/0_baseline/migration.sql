-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ResponsibilityStage" AS ENUM ('received', 'understood', 'assigned', 'active', 'completed');

-- CreateEnum
CREATE TYPE "ResponsibilityCategory" AS ENUM ('email', 'bill', 'form', 'receipt', 'appointment', 'other');

-- CreateEnum
CREATE TYPE "ResponsibilityDomain" AS ENUM ('car', 'school', 'health', 'home', 'finance', 'travel', 'other');

-- CreateEnum
CREATE TYPE "ResponsibilitySourceType" AS ENUM ('pasted_text', 'manual_entry', 'email', 'whatsapp', 'document_upload', 'calendar_event', 'voice');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('received', 'understood', 'assigned', 'stage_changed', 'owner_changed', 'waiting_started', 'waiting_ended', 'note', 'completed');

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" "ResponsibilityDomain",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibilities" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ResponsibilityCategory" NOT NULL DEFAULT 'other',
    "domain" "ResponsibilityDomain" NOT NULL DEFAULT 'other',
    "ownerId" TEXT,
    "providerId" TEXT,
    "stage" "ResponsibilityStage" NOT NULL DEFAULT 'received',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "waitingFor" TEXT,
    "waitingSince" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "nextStep" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "amount" DECIMAL(10,2),
    "sourceType" "ResponsibilitySourceType" NOT NULL DEFAULT 'manual_entry',
    "sourceReference" TEXT,
    "authUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "responsibilityId" TEXT,
    "eventType" "ActivityEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "households_name_key" ON "households"("name");

-- CreateIndex
CREATE INDEX "household_members_householdId_idx" ON "household_members"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_householdId_displayName_key" ON "household_members"("householdId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "providers_name_key" ON "providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "responsibilities_authUserId_key" ON "responsibilities"("authUserId");

-- CreateIndex
CREATE INDEX "responsibilities_householdId_stage_idx" ON "responsibilities"("householdId", "stage");

-- CreateIndex
CREATE INDEX "responsibilities_householdId_dueAt_idx" ON "responsibilities"("householdId", "dueAt");

-- CreateIndex
CREATE INDEX "responsibilities_householdId_waitingSince_idx" ON "responsibilities"("householdId", "waitingSince");

-- CreateIndex
CREATE UNIQUE INDEX "responsibilities_householdId_title_key" ON "responsibilities"("householdId", "title");

-- CreateIndex
CREATE INDEX "activities_householdId_createdAt_idx" ON "activities"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_responsibilityId_idx" ON "activities"("responsibilityId");

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "household_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "responsibilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

