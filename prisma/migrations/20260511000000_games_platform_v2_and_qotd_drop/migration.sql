-- CreateEnum
CREATE TYPE "ScribblDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ScribblRoomStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED', 'ABORTED');

-- CreateEnum
CREATE TYPE "TypeWarsDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TypeWarsRaceStatus" AS ENUM ('LOBBY', 'COUNTDOWN', 'RACING', 'FINISHED', 'ABORTED');

-- CreateEnum
CREATE TYPE "TriviaDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "TriviaRunStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED', 'ABORTED');

-- CreateEnum
CREATE TYPE "PuzzleDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "BrainTeaserDifficulty" AS ENUM ('EASY', 'NORMAL', 'HARD', 'DEVIOUS', 'BONUS');

-- CreateEnum
CREATE TYPE "CipherType" AS ENUM ('CAESAR', 'VIGENERE', 'ATBASH', 'RAILFENCE', 'SUBSTITUTION', 'BASE64', 'MORSE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CipherDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'INSANE');

-- CreateEnum
CREATE TYPE "RiddleDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RiddleRoomStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED', 'ABORTED');

-- CreateTable
CREATE TABLE "scribbl_prompts" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" "ScribblDifficulty" NOT NULL DEFAULT 'EASY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scribbl_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scribbl_rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "status" "ScribblRoomStatus" NOT NULL DEFAULT 'LOBBY',
    "round_count" INTEGER NOT NULL DEFAULT 3,
    "round_duration_seconds" INTEGER NOT NULL DEFAULT 80,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scribbl_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scribbl_rounds" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "drawer_id" TEXT NOT NULL,
    "prompt_word" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "scribbl_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scribbl_guesses" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "guesser_id" TEXT NOT NULL,
    "guess" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "guessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scribbl_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_wars_passages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT,
    "difficulty" "TypeWarsDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "word_count" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "type_wars_passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_wars_races" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "passage_id" TEXT NOT NULL,
    "status" "TypeWarsRaceStatus" NOT NULL DEFAULT 'LOBBY',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "type_wars_races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_wars_participants" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wpm" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "type_wars_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trivia_questions" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "difficulty" "TriviaDifficulty" NOT NULL DEFAULT 'EASY',
    "category" TEXT,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trivia_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trivia_runs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "status" "TriviaRunStatus" NOT NULL DEFAULT 'LOBBY',
    "total_floors" INTEGER NOT NULL DEFAULT 10,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trivia_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trivia_answers" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "selected_index" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "response_ms" INTEGER NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trivia_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_run_puzzles" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "hints_json" JSONB,
    "hint_penalty" INTEGER NOT NULL DEFAULT 20,
    "base_points" INTEGER NOT NULL DEFAULT 100,
    "difficulty" "PuzzleDifficulty" NOT NULL DEFAULT 'EASY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_run_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_run_days" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_run_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_run_day_puzzles" (
    "day_id" TEXT NOT NULL,
    "puzzle_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "puzzle_run_day_puzzles_pkey" PRIMARY KEY ("day_id","order")
);

-- CreateTable
CREATE TABLE "puzzle_run_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_id" TEXT,
    "puzzle_id" TEXT NOT NULL,
    "hints_used" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_run_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_teasers" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "BrainTeaserDifficulty" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_teasers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_teaser_days" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_teaser_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_teaser_day_entries" (
    "day_id" TEXT NOT NULL,
    "teaser_id" TEXT NOT NULL,
    "difficulty" "BrainTeaserDifficulty" NOT NULL,

    CONSTRAINT "brain_teaser_day_entries_pkey" PRIMARY KEY ("day_id","difficulty")
);

-- CreateTable
CREATE TABLE "brain_teaser_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "teaser_id" TEXT NOT NULL,
    "day_id" TEXT,
    "submission" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_teaser_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipher_challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cipher_type" "CipherType" NOT NULL,
    "plaintext" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "hints_json" JSONB,
    "hint_penalty" INTEGER NOT NULL DEFAULT 100,
    "base_points" INTEGER NOT NULL DEFAULT 1000,
    "time_limit_seconds" INTEGER NOT NULL DEFAULT 600,
    "difficulty" "CipherDifficulty" NOT NULL,
    "active_from" TIMESTAMP(3),
    "active_until" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cipher_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipher_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "submission" TEXT,
    "hints_used" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,

    CONSTRAINT "cipher_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riddle_clues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "hint" TEXT,
    "difficulty" "RiddleDifficulty" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lock_seconds" INTEGER NOT NULL DEFAULT 15,
    "base_points" INTEGER NOT NULL DEFAULT 100,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riddle_clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riddle_bundles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riddle_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riddle_bundle_clues" (
    "bundle_id" TEXT NOT NULL,
    "clue_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "riddle_bundle_clues_pkey" PRIMARY KEY ("bundle_id","order")
);

-- CreateTable
CREATE TABLE "riddle_rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "bundle_id" TEXT,
    "status" "RiddleRoomStatus" NOT NULL DEFAULT 'LOBBY',
    "current_order" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riddle_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riddle_room_members" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "riddle_room_members_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "riddle_attempts" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "clue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "submission" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riddle_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scribbl_prompts_word_key" ON "scribbl_prompts"("word");

-- CreateIndex
CREATE INDEX "scribbl_prompts_active_difficulty_idx" ON "scribbl_prompts"("active", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "scribbl_rooms_code_key" ON "scribbl_rooms"("code");

-- CreateIndex
CREATE INDEX "scribbl_rooms_status_created_at_idx" ON "scribbl_rooms"("status", "created_at");

-- CreateIndex
CREATE INDEX "scribbl_rounds_room_id_idx" ON "scribbl_rounds"("room_id");

-- CreateIndex
CREATE INDEX "scribbl_guesses_round_id_idx" ON "scribbl_guesses"("round_id");

-- CreateIndex
CREATE INDEX "type_wars_passages_active_difficulty_idx" ON "type_wars_passages"("active", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "type_wars_races_code_key" ON "type_wars_races"("code");

-- CreateIndex
CREATE INDEX "type_wars_races_status_created_at_idx" ON "type_wars_races"("status", "created_at");

-- CreateIndex
CREATE INDEX "type_wars_participants_race_id_idx" ON "type_wars_participants"("race_id");

-- CreateIndex
CREATE UNIQUE INDEX "type_wars_participants_race_id_user_id_key" ON "type_wars_participants"("race_id", "user_id");

-- CreateIndex
CREATE INDEX "trivia_questions_active_difficulty_floor_idx" ON "trivia_questions"("active", "difficulty", "floor");

-- CreateIndex
CREATE UNIQUE INDEX "trivia_runs_code_key" ON "trivia_runs"("code");

-- CreateIndex
CREATE INDEX "trivia_runs_status_created_at_idx" ON "trivia_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "trivia_answers_run_id_user_id_idx" ON "trivia_answers"("run_id", "user_id");

-- CreateIndex
CREATE INDEX "puzzle_run_puzzles_active_difficulty_idx" ON "puzzle_run_puzzles"("active", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_run_days_date_key" ON "puzzle_run_days"("date");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_run_day_puzzles_day_id_puzzle_id_key" ON "puzzle_run_day_puzzles"("day_id", "puzzle_id");

-- CreateIndex
CREATE INDEX "puzzle_run_attempts_user_id_attempted_at_idx" ON "puzzle_run_attempts"("user_id", "attempted_at" DESC);

-- CreateIndex
CREATE INDEX "puzzle_run_attempts_day_id_idx" ON "puzzle_run_attempts"("day_id");

-- CreateIndex
CREATE INDEX "brain_teasers_active_difficulty_idx" ON "brain_teasers"("active", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "brain_teaser_days_date_key" ON "brain_teaser_days"("date");

-- CreateIndex
CREATE INDEX "brain_teaser_attempts_user_id_submitted_at_idx" ON "brain_teaser_attempts"("user_id", "submitted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "brain_teaser_attempts_user_id_teaser_id_key" ON "brain_teaser_attempts"("user_id", "teaser_id");

-- CreateIndex
CREATE INDEX "cipher_challenges_active_active_from_active_until_idx" ON "cipher_challenges"("active", "active_from", "active_until");

-- CreateIndex
CREATE INDEX "cipher_attempts_user_id_started_at_idx" ON "cipher_attempts"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "cipher_attempts_challenge_id_idx" ON "cipher_attempts"("challenge_id");

-- CreateIndex
CREATE INDEX "riddle_clues_active_difficulty_idx" ON "riddle_clues"("active", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "riddle_bundle_clues_bundle_id_clue_id_key" ON "riddle_bundle_clues"("bundle_id", "clue_id");

-- CreateIndex
CREATE UNIQUE INDEX "riddle_rooms_code_key" ON "riddle_rooms"("code");

-- CreateIndex
CREATE INDEX "riddle_rooms_status_created_at_idx" ON "riddle_rooms"("status", "created_at");

-- CreateIndex
CREATE INDEX "riddle_attempts_room_id_submitted_at_idx" ON "riddle_attempts"("room_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "scribbl_prompts" ADD CONSTRAINT "scribbl_prompts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribbl_rooms" ADD CONSTRAINT "scribbl_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribbl_rounds" ADD CONSTRAINT "scribbl_rounds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "scribbl_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribbl_rounds" ADD CONSTRAINT "scribbl_rounds_drawer_id_fkey" FOREIGN KEY ("drawer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribbl_guesses" ADD CONSTRAINT "scribbl_guesses_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "scribbl_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribbl_guesses" ADD CONSTRAINT "scribbl_guesses_guesser_id_fkey" FOREIGN KEY ("guesser_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_wars_passages" ADD CONSTRAINT "type_wars_passages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_wars_races" ADD CONSTRAINT "type_wars_races_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_wars_races" ADD CONSTRAINT "type_wars_races_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "type_wars_passages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_wars_participants" ADD CONSTRAINT "type_wars_participants_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "type_wars_races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_wars_participants" ADD CONSTRAINT "type_wars_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_questions" ADD CONSTRAINT "trivia_questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_runs" ADD CONSTRAINT "trivia_runs_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "trivia_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "trivia_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_puzzles" ADD CONSTRAINT "puzzle_run_puzzles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_day_puzzles" ADD CONSTRAINT "puzzle_run_day_puzzles_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "puzzle_run_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_day_puzzles" ADD CONSTRAINT "puzzle_run_day_puzzles_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "puzzle_run_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_attempts" ADD CONSTRAINT "puzzle_run_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_attempts" ADD CONSTRAINT "puzzle_run_attempts_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "puzzle_run_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_run_attempts" ADD CONSTRAINT "puzzle_run_attempts_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "puzzle_run_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_teasers" ADD CONSTRAINT "brain_teasers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_teaser_day_entries" ADD CONSTRAINT "brain_teaser_day_entries_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "brain_teaser_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_teaser_day_entries" ADD CONSTRAINT "brain_teaser_day_entries_teaser_id_fkey" FOREIGN KEY ("teaser_id") REFERENCES "brain_teasers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_teaser_attempts" ADD CONSTRAINT "brain_teaser_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_teaser_attempts" ADD CONSTRAINT "brain_teaser_attempts_teaser_id_fkey" FOREIGN KEY ("teaser_id") REFERENCES "brain_teasers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cipher_challenges" ADD CONSTRAINT "cipher_challenges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cipher_attempts" ADD CONSTRAINT "cipher_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cipher_attempts" ADD CONSTRAINT "cipher_attempts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "cipher_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_clues" ADD CONSTRAINT "riddle_clues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_bundle_clues" ADD CONSTRAINT "riddle_bundle_clues_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "riddle_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_bundle_clues" ADD CONSTRAINT "riddle_bundle_clues_clue_id_fkey" FOREIGN KEY ("clue_id") REFERENCES "riddle_clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_rooms" ADD CONSTRAINT "riddle_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_rooms" ADD CONSTRAINT "riddle_rooms_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "riddle_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_room_members" ADD CONSTRAINT "riddle_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "riddle_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_room_members" ADD CONSTRAINT "riddle_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_attempts" ADD CONSTRAINT "riddle_attempts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "riddle_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_attempts" ADD CONSTRAINT "riddle_attempts_clue_id_fkey" FOREIGN KEY ("clue_id") REFERENCES "riddle_clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddle_attempts" ADD CONSTRAINT "riddle_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
