-- Recruitment wings: the /recruitment page offers the 8 Tesseract wings as the
-- selectable core-team roles. Five wings already map onto existing CoreRole
-- values; Game Wing and Escape Wing are new. MANAGEMENT / MEMER / DOCUMENTATION
-- are kept because existing rows reference them and /join/core still offers them.
--
-- roles_applied is an enum ARRAY with a default, so ALTER TYPE ... ADD VALUE is
-- not usable inside Prisma's migration transaction. Rebuild the type instead,
-- matching 20260207000100_update_hiring_roles. The default has to come off
-- before the cast and go back on after.

CREATE TYPE "CoreRole_new" AS ENUM (
  'MANAGEMENT',
  'CONTENT_CREATOR',
  'GRAPHIC_DESIGNER',
  'TECHNICAL_WEBOPS',
  'MEMER',
  'PR_OUTREACH',
  'RESEARCH_SPONSORSHIP',
  'DOCUMENTATION',
  'STREAMER_SPEAKER',
  'GAME_WING',
  'ESCAPE_WING'
);

ALTER TABLE "hiring_applications" ALTER COLUMN "roles_applied" DROP DEFAULT;

ALTER TABLE "hiring_applications"
ALTER COLUMN "roles_applied"
TYPE "CoreRole_new"[]
USING ("roles_applied"::text[]::"CoreRole_new"[]);

ALTER TYPE "CoreRole" RENAME TO "CoreRole_old";
ALTER TYPE "CoreRole_new" RENAME TO "CoreRole";
DROP TYPE "CoreRole_old";

ALTER TABLE "hiring_applications"
ALTER COLUMN "roles_applied" SET DEFAULT ARRAY[]::"CoreRole"[];

-- Seniority preference (Head / Co-Head / Executive / Volunteer) captured by the
-- recruitment form. Nullable so existing rows and the /join/core path stay valid.
CREATE TYPE "WingPosition" AS ENUM ('HEAD', 'CO_HEAD', 'EXECUTIVE', 'VOLUNTEER', 'ANY');

ALTER TABLE "hiring_applications" ADD COLUMN "position_preference" "WingPosition";
