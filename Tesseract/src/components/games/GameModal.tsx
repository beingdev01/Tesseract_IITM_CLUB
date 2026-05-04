"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Flame, Gamepad2, RefreshCcw, Trophy } from "lucide-react";
import toast from "react-hot-toast";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { gamesApi } from "@/lib/api/services";
import type { Game } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function GameModal({
  game,
  onClose,
  onFinish,
}: {
  game: Game | null;
  onClose: () => void;
  onFinish?: () => void;
}) {
  const [scoreInput, setScoreInput] = useState("");
  const [result, setResult] = useState<{
    rank: number;
    personalBest: boolean;
    xpAwarded: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!game) {
      setScoreInput("");
      setResult(null);
    }
  }, [game]);

  const submit = async () => {
    if (!game) return;
    const parsedScore = Number(scoreInput);
    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      toast.error("Enter a valid score (0 or higher).");
      return;
    }

    setSubmitting(true);
    try {
      const submission = await gamesApi.submitScore(game.id, Math.floor(parsedScore));
      setResult({
        rank: submission.rank,
        personalBest: submission.personalBest,
        xpAwarded: submission.xpAwarded,
      });
      toast.success(`Score submitted. Rank #${submission.rank}.`);
      onFinish?.();
    } catch {
      toast.error("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!game}
      onClose={() => {
        setScoreInput("");
        setResult(null);
        onClose();
      }}
      size="lg"
      title={game?.name}
      subtitle={game?.tagline}
      footer={
        game && (
          <>
            {!result ? (
              <Button loading={submitting} onClick={submit}>
                Submit score
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  leftIcon={<RefreshCcw className="h-4 w-4" />}
                  onClick={() => {
                    setResult(null);
                    setScoreInput("");
                  }}
                >
                  Submit another
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {game && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="purple">{game.category}</Pill>
            <Pill tone="red">{game.difficulty}</Pill>
            <Pill tone="green" pulse>{formatNumber(game.playersOnline)} online</Pill>
            <Pill tone="yellow">+{game.xpReward} XP / personal best</Pill>
          </div>

          {!result && (
            <div className="space-y-4">
              <p className="text-sm text-white/75">{game.description}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Block title="How to play">
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-white/70">
                    {game.howToPlay.map((h, i) => <li key={i}>{h}</li>)}
                  </ol>
                </Block>
                <Block title="Rules">
                  <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
                    {game.rules.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </Block>
              </div>
              <div className="grid grid-cols-1 gap-3 rounded-xl glass p-3 sm:grid-cols-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/65">
                  <Flame className="h-3.5 w-3.5 text-neon-orange" />
                  High score: {formatNumber(game.highScore)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/65 sm:justify-end">
                  <Trophy className="h-3.5 w-3.5 text-neon-yellow" />
                  Best player: {game.bestPlayer ?? "No winner yet"}
                </span>
              </div>

              <Input
                label="Your score"
                type="number"
                min={0}
                value={scoreInput}
                onChange={(event) => setScoreInput(event.target.value)}
                placeholder="Enter score from your run"
                hint="Submit your actual game score. Personal bests earn XP."
              />

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
                Enter the score you achieved in the game and submit it to the global leaderboard.
              </div>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3"
            >
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/40 to-neon-cyan/30 shadow-glow-md text-3xl">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-3xl text-white">
                <span className="text-gradient-static">#{result.rank}</span> rank
              </h3>
              <p className="text-sm text-white/60">
                {result.personalBest
                  ? "New personal best. XP awarded."
                  : "Score recorded. Improve your best for bonus XP."}
              </p>
              <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
                <Pill tone="purple">Placed #{result.rank}</Pill>
                <Pill tone="yellow">+{result.xpAwarded} XP</Pill>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl glass p-4">
      <p className="mb-2 font-display text-xs uppercase tracking-widest text-white/60">
        {title}
      </p>
      {children}
    </div>
  );
}
