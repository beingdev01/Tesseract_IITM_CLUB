import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type PuzzleRunAttempt } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayLoading, PlayShell } from './PlayShell';

export default function PuzzleRunPlay() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [submission, setSubmission] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [summary, setSummary] = useState<{ totalScore: number; streakDays: number } | null>(null);
  const query = useQuery({ queryKey: ['puzzle-run-today'], queryFn: () => api.getPuzzleRunToday(token || ''), enabled: Boolean(token) });
  const attemptsByPuzzle = useMemo(() => new Map((query.data?.attempts ?? []).map((attempt) => [attempt.puzzleId, attempt])), [query.data?.attempts]);
  const puzzle = query.data?.day.puzzles[index];
  const attempt = puzzle ? attemptsByPuzzle.get(puzzle.id) : null;
  const submitMutation = useMutation({
    mutationFn: () => {
      if (!token || !puzzle) throw new Error('Missing puzzle');
      if (!submission.trim()) throw new Error('Enter an answer first');
      return api.submitPuzzleRunAttempt(puzzle.id, token, { submission, hintsUsed });
    },
    onSuccess: (data) => {
      toast[data.attempt.solved ? 'success' : 'error'](data.attempt.solved ? 'Solved' : 'Try again');
      setSubmission('');
      void queryClient.invalidateQueries({ queryKey: ['puzzle-run-today'] });
      if (data.attempt.solved) setTimeout(() => setIndex((current) => Math.min(current + 1, 4)), 1200);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Submission failed'),
  });
  const completeMutation = useMutation({
    mutationFn: () => token ? api.completePuzzleRun(token) : Promise.reject(new Error('Authentication required')),
    onSuccess: setSummary,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to complete run'),
  });
  if (!token) return <PlayShell title="PUZZLE RUN" accent="green"><PlayError message="Sign in to play." /></PlayShell>;
  if (query.isLoading) return <PlayShell title="PUZZLE RUN" accent="green"><PlayLoading /></PlayShell>;
  if (query.error || !query.data) return <PlayShell title="PUZZLE RUN" accent="green"><PlayError message={query.error instanceof Error ? query.error.message : 'No puzzles are available yet.'} /></PlayShell>;
  const solvedCount = query.data.attempts.filter((item: PuzzleRunAttempt) => item.solved).length;
  return (
    <PlayShell title="PUZZLE RUN" accent="green">
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="lb-mono" style={{ color: 'rgba(255,255,255,0.65)' }}>Puzzle {Math.min(index + 1, 5)} / 5 · solved {solvedCount}</div>
        {summary ? (
          <div style={{ display: 'grid', gap: 12 }}><h2 style={{ margin: 0 }}>Score {summary.totalScore}</h2><p>Streak: {summary.streakDays} day(s)</p><button className="lb-btn-primary" onClick={() => navigator.share?.({ text: `I scored ${summary.totalScore} on Puzzle Run.` })}>SHARE</button></div>
        ) : puzzle ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 18, lineHeight: 1.7 }}>{puzzle.prompt}</div>
            {puzzle.hints?.slice(0, hintsUsed).map((hint, hintIndex) => <div key={hintIndex} className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: 12 }}>Hint {hintIndex + 1}: {hint}</div>)}
            <input value={submission} onChange={(event) => setSubmission(event.target.value)} disabled={attempt?.solved} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 12 }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="lb-btn-primary" disabled={submitMutation.isPending || attempt?.solved} onClick={() => submitMutation.mutate()}>SUBMIT</button>
              <button className="lb-btn-ghost" onClick={() => setHintsUsed((current) => Math.min(current + 1, puzzle.hints?.length ?? 0))}>SHOW HINT (-{puzzle.hintPenalty})</button>
              <button className="lb-btn-ghost" onClick={() => setIndex((current) => Math.min(current + 1, 4))}>I GIVE UP</button>
              {index >= 4 && <button className="lb-btn-primary" onClick={() => completeMutation.mutate()}>COMPLETE RUN</button>}
            </div>
          </div>
        ) : <PlayError message="No puzzle selected." />}
      </div>
    </PlayShell>
  );
}
