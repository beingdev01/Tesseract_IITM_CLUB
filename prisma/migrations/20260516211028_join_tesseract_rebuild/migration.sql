-- Join Tesseract rebuild: replace HiringApplication schema, drop ApplyingRole enum,
-- drop per-team hiring toggles in Settings, add WhatsApp + interview-scheduled fields.
-- Existing applicant data is intentionally discarded per user decision.

-- 1. Wipe old hiring_applications and drop its old discriminator
DROP TABLE IF EXISTS "hiring_applications" CASCADE;
DROP TYPE IF EXISTS "ApplyingRole";

-- 2. Create new enums for the join flow
CREATE TYPE "ApplicationType" AS ENUM ('MEMBER', 'CORE');

CREATE TYPE "BsLevel" AS ENUM ('FOUNDATION', 'DIPLOMA', 'DEGREE');

CREATE TYPE "TesseractHouse" AS ENUM (
  'BANDIPUR', 'CORBETT', 'GIR', 'KANHA', 'KAZIRANGA', 'NALLAMALA', 'NAMDAPHA',
  'NILGIRI', 'PICHAVARAM', 'SARANDA', 'SUNDARBANS', 'WAYANAD', 'NOT_ALLOTED'
);

CREATE TYPE "TesseractRegion" AS ENUM (
  'BENGALURU', 'CHANDIGARH', 'CHENNAI', 'DELHI', 'HYDERABAD', 'KOLKATA',
  'LUCKNOW', 'MUMBAI', 'PATNA', 'INTERNATIONAL', 'NOT_ALLOTED'
);

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY');

CREATE TYPE "CoreInterest" AS ENUM ('YES', 'MAYBE', 'NO');

CREATE TYPE "WeeklyHours" AS ENUM ('LT_7', 'H_7_15', 'GT_15');

CREATE TYPE "CoreRole" AS ENUM (
  'MANAGEMENT', 'CONTENT_CREATOR', 'GRAPHIC_DESIGNER', 'TECHNICAL_WEBOPS',
  'MEMER', 'PR_OUTREACH', 'RESEARCH_SPONSORSHIP', 'DOCUMENTATION', 'STREAMER_SPEAKER'
);

-- 3. Recreate hiring_applications with the unified Member/Core schema
CREATE TABLE "hiring_applications" (
  "id"                TEXT              NOT NULL,
  "application_type"  "ApplicationType" NOT NULL,
  "name"              TEXT              NOT NULL,
  "email"             TEXT              NOT NULL,
  "phone"             TEXT              NOT NULL,
  "house"             "TesseractHouse"  NOT NULL,
  "bs_level"          "BsLevel"         NOT NULL,
  "crazy_ideas"       TEXT,
  "user_id"           TEXT,
  "gender"            "Gender",
  "region"            "TesseractRegion",
  "core_interest"     "CoreInterest",
  "weekly_hours"      "WeeklyHours",
  "roles_applied"     "CoreRole"[]      NOT NULL DEFAULT ARRAY[]::"CoreRole"[],
  "has_experience"    BOOLEAN,
  "experience_desc"   TEXT,
  "resume_url"        TEXT,
  "confirm_accurate"  BOOLEAN           NOT NULL DEFAULT false,
  "status"            "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "created_at"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "hiring_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hiring_applications_email_type_unique"
  ON "hiring_applications" ("email", "application_type");

CREATE INDEX "hiring_applications_application_type_status_created_at_idx"
  ON "hiring_applications" ("application_type", "status", "created_at");

CREATE INDEX "hiring_applications_status_created_at_idx"
  ON "hiring_applications" ("status", "created_at");

ALTER TABLE "hiring_applications"
  ADD CONSTRAINT "hiring_applications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Settings: drop per-team hiring toggles, add new fields
ALTER TABLE "settings"
  DROP COLUMN IF EXISTS "hiring_technical",
  DROP COLUMN IF EXISTS "hiring_dsa_champs",
  DROP COLUMN IF EXISTS "hiring_designing",
  DROP COLUMN IF EXISTS "hiring_social_media",
  DROP COLUMN IF EXISTS "hiring_management";

ALTER TABLE "settings"
  ADD COLUMN "whatsapp_community_url" TEXT,
  ADD COLUMN "email_interview_scheduled_body" TEXT;
