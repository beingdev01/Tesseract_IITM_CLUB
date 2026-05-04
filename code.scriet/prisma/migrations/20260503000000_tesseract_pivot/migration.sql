-- ============================================================================
-- Tesseract Pivot Migration
-- Generated 2026-05-03.
--
-- Strips Quiz + Playground subsystems, drops password-based auth column,
-- introduces UserLevel enum + nullable level field, adds attendance feature
-- toggle to Settings, and refreshes branded defaults to "Tesseract".
--
-- Order matters: drop FK-bearing tables before parent tables/enums, drop
-- columns before dropping their referenced enums.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop Quiz subsystem
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "quiz_answers" CASCADE;
DROP TABLE IF EXISTS "quiz_participants" CASCADE;
DROP TABLE IF EXISTS "quiz_questions" CASCADE;
DROP TABLE IF EXISTS "quizzes" CASCADE;
DROP TYPE IF EXISTS "QuizQuestionType";
DROP TYPE IF EXISTS "QuizStatus";

-- ----------------------------------------------------------------------------
-- 2. Drop Playground subsystem
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "playground_limit_resets" CASCADE;
DROP TABLE IF EXISTS "playground_daily_usage" CASCADE;
DROP TABLE IF EXISTS "snippets" CASCADE;
DROP TABLE IF EXISTS "user_playground_prefs" CASCADE;
DROP TABLE IF EXISTS "executions" CASCADE;
DROP TYPE IF EXISTS "ExecutionStatus";

-- ----------------------------------------------------------------------------
-- 3. Settings — add attendance toggle, drop playground toggles, refresh defaults
-- ----------------------------------------------------------------------------
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "attendance_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "settings" DROP COLUMN IF EXISTS "playground_enabled";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "playground_daily_limit";

ALTER TABLE "settings" ALTER COLUMN "club_name" SET DEFAULT 'Tesseract';
ALTER TABLE "settings" ALTER COLUMN "club_email" SET DEFAULT 'contact@tesseract.example';
ALTER TABLE "settings" ALTER COLUMN "club_description" SET DEFAULT 'The IIT Madras BS Degree coding community — building, learning, and shipping together.';

-- Refresh the singleton row's branding if it still holds the old defaults.
UPDATE "settings"
SET
  "club_name" = CASE WHEN "club_name" IN ('code.scriet', 'CodeScriet') THEN 'Tesseract' ELSE "club_name" END,
  "club_email" = CASE WHEN "club_email" = 'contact@codescriet.com' THEN 'contact@tesseract.example' ELSE "club_email" END
WHERE "id" = 'default';

-- ----------------------------------------------------------------------------
-- 4. Users — drop password column, add UserLevel enum + nullable level
-- ----------------------------------------------------------------------------
CREATE TYPE "UserLevel" AS ENUM ('FOUNDATION', 'DIPLOMA', 'BSC', 'BS');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" "UserLevel";
ALTER TABLE "users" DROP COLUMN IF EXISTS "password";
