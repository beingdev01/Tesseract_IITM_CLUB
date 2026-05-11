-- Idempotency and hot-path indexes for games platform v2.

ALTER TABLE "trivia_answers"
  ADD CONSTRAINT "trivia_answers_run_id_user_id_floor_key" UNIQUE ("run_id", "user_id", "floor");

CREATE INDEX "trivia_answers_question_id_idx" ON "trivia_answers"("question_id");

CREATE INDEX "puzzle_run_day_puzzles_puzzle_id_idx" ON "puzzle_run_day_puzzles"("puzzle_id");

ALTER TABLE "puzzle_run_attempts"
  ADD CONSTRAINT "puzzle_run_attempts_user_id_day_id_puzzle_id_key" UNIQUE ("user_id", "day_id", "puzzle_id");

CREATE INDEX "brain_teaser_day_entries_teaser_id_idx" ON "brain_teaser_day_entries"("teaser_id");

ALTER TABLE "cipher_attempts"
  ADD CONSTRAINT "cipher_attempts_user_id_challenge_id_key" UNIQUE ("user_id", "challenge_id");

CREATE INDEX "riddle_bundle_clues_clue_id_idx" ON "riddle_bundle_clues"("clue_id");

CREATE INDEX "riddle_room_members_user_id_idx" ON "riddle_room_members"("user_id");
