-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('PARTICIPANT', 'GUEST');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuestRole" AS ENUM ('CHIEF_GUEST', 'SPEAKER', 'JUDGE', 'SPECIAL_GUEST');

-- AlterTable: Add profile fields to User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "course" TEXT;
ALTER TABLE "User" ADD COLUMN "branch" TEXT;
ALTER TABLE "User" ADD COLUMN "year" TEXT;
ALTER TABLE "User" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add rich fields to Event
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;
ALTER TABLE "Event" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Event" ADD COLUMN "agenda" TEXT;
ALTER TABLE "Event" ADD COLUMN "highlights" TEXT;
ALTER TABLE "Event" ADD COLUMN "learningOutcomes" TEXT;
ALTER TABLE "Event" ADD COLUMN "targetAudience" TEXT;
ALTER TABLE "Event" ADD COLUMN "prerequisites" TEXT;
ALTER TABLE "Event" ADD COLUMN "speakers" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "resources" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "faqs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "imageGallery" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "venue" TEXT;
ALTER TABLE "Event" ADD COLUMN "eventType" TEXT;
ALTER TABLE "Event" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "allowLateRegistration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "eventDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "dayLabels" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "registrationFields" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "registrationStartDate" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "registrationEndDate" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "teamRegistration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "teamMinSize" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "teamMaxSize" INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_slug_idx" ON "Event"("slug");

-- CreateTable: EventRegistration
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationType" "RegistrationType" NOT NULL DEFAULT 'PARTICIPANT',
    "customFieldResponses" JSONB,
    "attendanceToken" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateTable: EventTeam
CREATE TABLE "EventTeam" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventTeam_inviteCode_key" ON "EventTeam"("inviteCode");
CREATE UNIQUE INDEX "EventTeam_eventId_teamName_key" ON "EventTeam"("eventId", "teamName");
CREATE INDEX "EventTeam_eventId_idx" ON "EventTeam"("eventId");
CREATE INDEX "EventTeam_inviteCode_idx" ON "EventTeam"("inviteCode");

-- CreateTable: EventTeamMember
CREATE TABLE "EventTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventTeamMember_registrationId_key" ON "EventTeamMember"("registrationId");
CREATE UNIQUE INDEX "EventTeamMember_teamId_userId_key" ON "EventTeamMember"("teamId", "userId");
CREATE INDEX "EventTeamMember_teamId_idx" ON "EventTeamMember"("teamId");

-- CreateTable: DayAttendance
CREATE TABLE "DayAttendance" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "scannedAt" TIMESTAMP(3),

    CONSTRAINT "DayAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayAttendance_registrationId_dayNumber_key" ON "DayAttendance"("registrationId", "dayNumber");
CREATE INDEX "DayAttendance_registrationId_idx" ON "DayAttendance"("registrationId");

-- CreateTable: EventInvitation
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "guestRole" "GuestRole" NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "certificate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventInvitation_eventId_userId_key" ON "EventInvitation"("eventId", "userId");
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");
CREATE INDEX "EventInvitation_userId_idx" ON "EventInvitation"("userId");

-- CreateTable: Announcement
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EventTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DayAttendance" ADD CONSTRAINT "DayAttendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
