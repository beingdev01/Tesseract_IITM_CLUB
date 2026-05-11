-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_sessions_game_created_at_desc_idx" ON "game_sessions"("game_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "game_sessions_game_score_created_desc_idx" ON "game_sessions"("game_id", "score" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "game_sessions_user_created_at_desc_idx" ON "game_sessions"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
