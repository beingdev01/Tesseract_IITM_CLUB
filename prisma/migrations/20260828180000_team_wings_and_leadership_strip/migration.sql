-- 1. Team page leadership strip size. First N members in display order render in a
-- strip above the grid; 0 disables it. Editable by super admin / president.
ALTER TABLE "settings"
  ADD COLUMN "team_leadership_count" INTEGER NOT NULL DEFAULT 4;

-- 2. Align team_members.team with the Esports Society wings shown on /recruitment.
-- The column is free text behind a fixed <select>, so this is a plain value rewrite —
-- no enum to rebuild. ELSE keeps 'Management' (retained as its own group) and any
-- value hand-entered before the dropdown existed, rather than nulling it or guessing
-- it into a wing.
UPDATE "team_members" SET "team" = CASE "team"
  WHEN 'Technical' THEN 'WebOps Wing'
  WHEN 'Design'    THEN 'Graphic Design Wing'
  WHEN 'Content'   THEN 'Video Editing Wing'
  WHEN 'Admin'     THEN 'Core Team'
  WHEN 'DSA'       THEN 'Game Wing'
  ELSE "team"
END;
