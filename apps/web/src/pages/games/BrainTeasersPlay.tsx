import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayLoading, PlayShell } from './PlayShell';

export default function BrainTeasersPlay() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const query = useQuery({ queryKey: ['brain-teasers-today'], queryFn: () => api.getBrainTeasersToday(token || ''), enabled: Boolean(token) });
  const attempts = useMemo(() => new Map((query.data?.attempts ?? []).map((attempt) => [attempt.teaserId, attempt])), [query.data?.attempts]);
  const submitMutation = useMutation({
    mutationFn: (teaserId: string) => {
      if (!token) throw new Error('Authentication required');
      const answer = answers[teaserId]?.trim();
      if (!answer) throw new Error('Answer cannot be empty');
      return api.submitBrainTeaser(teaserId, token, answer);
    },
    onSuccess: (data) => {
      toast[data.attempt.correct ? 'success' : 'error'](data.attempt.correct ? 'Correct' : 'Submitted');
      void queryClient.invalidateQueries({ queryKey: ['brain-teasers-today'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Submit failed'),
  });
  if (!token) return <PlayShell title="BRAIN TEASERS" accent="blue"><PlayError message="Sign in to play." /></PlayShell>;
  if (query.isLoading) return <PlayShell title="BRAIN TEASERS" accent="blue"><PlayLoading /></PlayShell>;
  if (query.error || !query.data) return <PlayShell title="BRAIN TEASERS" accent="blue"><PlayError message={query.error instanceof Error ? query.error.message : 'No teasers are available yet.'} /></PlayShell>;
  const total = Array.from(attempts.values()).reduce((sum, attempt) => sum + attempt.pointsAwarded, 0);
  return (
    <PlayShell title="BRAIN TEASERS" accent="blue">
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="lb-mono" style={{ color: 'var(--c-blue)', fontSize: 12 }}>Running total: {total}</div>
        {query.data.day.teasers.map((teaser) => {
          const attempt = attempts.get(teaser.id);
          return (
            <div key={teaser.id} style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 14, display: 'grid', gap: 10 }}>
              <div className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: 11 }}>{teaser.difficulty} · {teaser.points} pts</div>
              <div style={{ lineHeight: 1.7 }}>{teaser.prompt}</div>
              {attempt ? (
                <div className="lb-mono" style={{ color: attempt.correct ? 'var(--c-green)' : 'var(--c-red)', fontSize: 12 }}>
                  {attempt.correct ? 'Correct' : 'Incorrect'} · {attempt.pointsAwarded} pts · {attempt.explanation || 'No explanation provided.'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={answers[teaser.id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [teaser.id]: event.target.value }))} style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 10 }} />
                  <button className="lb-btn-primary" onClick={() => submitMutation.mutate(teaser.id)}>SUBMIT</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PlayShell>
  );
}
