-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GUIDE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "TourKind" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON', 'FULL_DAY');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('ACTIVE', 'NO_DEMAND');

-- CreateEnum
CREATE TYPE "MonthStatus" AS ENUM ('NEEDS_DRAFT', 'DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('GENERATED', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TourKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourSlot" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 150,
    "weekdays" INTEGER[],
    "defaultNeeded" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TourSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideQualification" (
    "userId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "GuideQualification_pkey" PRIMARY KEY ("userId","tourId","languageId")
);

-- CreateTable
CREATE TABLE "Unavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "period" "Period" NOT NULL DEFAULT 'FULL_DAY',
    "slotId" TEXT,
    "note" TEXT,

    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "period" "Period" NOT NULL DEFAULT 'FULL_DAY',
    "notBeforeMinutes" INTEGER,
    "notAfterMinutes" INTEGER,

    CONSTRAINT "RecurringRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "morningCutoffMinutes" INTEGER NOT NULL DEFAULT 780,
    "minGapMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxToursPerDay" INTEGER NOT NULL DEFAULT 2,
    "defaultDurationMin" INTEGER NOT NULL DEFAULT 150,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthSchedule" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "needsConfirmedAt" TIMESTAMP(3),
    "status" "MonthStatus" NOT NULL DEFAULT 'NEEDS_DRAFT',
    "publishedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "MonthSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotOccurrence" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "needed" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "SlotOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" TIMESTAMP(3),
    "source" "AssignmentSource" NOT NULL DEFAULT 'GENERATED',
    "overrideWarnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_userId_key" ON "Invite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_name_key" ON "Tour"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TourSlot_tourId_languageId_startMinutes_key" ON "TourSlot"("tourId", "languageId", "startMinutes");

-- CreateIndex
CREATE INDEX "Unavailability_userId_startDate_endDate_idx" ON "Unavailability"("userId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthSchedule_year_month_key" ON "MonthSchedule"("year", "month");

-- CreateIndex
CREATE INDEX "SlotOccurrence_monthId_date_idx" ON "SlotOccurrence"("monthId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SlotOccurrence_slotId_date_key" ON "SlotOccurrence"("slotId", "date");

-- CreateIndex
CREATE INDEX "Assignment_guideId_idx" ON "Assignment"("guideId");

-- CreateIndex
CREATE INDEX "Assignment_occurrenceId_idx" ON "Assignment"("occurrenceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourSlot" ADD CONSTRAINT "TourSlot_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourSlot" ADD CONSTRAINT "TourSlot_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideQualification" ADD CONSTRAINT "GuideQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideQualification" ADD CONSTRAINT "GuideQualification_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideQualification" ADD CONSTRAINT "GuideQualification_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TourSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRestriction" ADD CONSTRAINT "RecurringRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotOccurrence" ADD CONSTRAINT "SlotOccurrence_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotOccurrence" ADD CONSTRAINT "SlotOccurrence_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TourSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "SlotOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
