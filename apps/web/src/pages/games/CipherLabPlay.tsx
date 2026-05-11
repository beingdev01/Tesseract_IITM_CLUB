import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayLoading, PlayShell } from './PlayShell';

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function CipherLabPlay() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [submission, setSubmission] = useState('');
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [result, setResult] = useState<{ solved: boolean; pointsAwarded: number; durationSeconds: number } | null>(null);
  const query = useQuery({ queryKey: ['cipher-lab-active'], queryFn: () => api.getActiveCipher(token || ''), enabled: Boolean(token) });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const startMutation = useMutation({
    mutationFn: () => token ? api.startCipherAttempt(token) : Promise.reject(new Error('Authentication required')),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cipher-lab-active'] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to start'),
  });
  const hintMutation = useMutation({
    mutationFn: (index: number) => token ? api.revealCipherHint(token, index) : Promise.reject(new Error('Authentication required')),
    onSuccess: (data) => { setRevealedHints((current) => [...current, data.hint]); void queryClient.invalidateQueries({ queryKey: ['cipher-lab-active'] }); },
  });
  const submitMutation = useMutation({
    mutationFn: () => token ? api.submitCipherAnswer(token, submission) : Promise.reject(new Error('Authentication required')),
    onSuccess: (data) => { setResult(data); void queryClient.invalidateQueries({ queryKey: ['games-leaderboard'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Submit failed'),
  });
  const attemptSeconds = useMemo(() => query.data?.attempt ? Math.floor((now - new Date(query.data.attempt.startedAt).getTime()) / 1000) : 0, [now, query.data?.attempt]);
  if (!token) return <PlayShell title="CIPHER LAB" accent="purple"><PlayError message="Sign in to play." /></PlayShell>;
  if (query.isLoading) return <PlayShell title="CIPHER LAB" accent="purple"><PlayLoading /></PlayShell>;
  if (query.error || !query.data) return <PlayShell title="CIPHER LAB" accent="purple"><PlayError message={query.error instanceof Error ? query.error.message : 'No cipher is active.'} /></PlayShell>;
  const { cipher, attempt } = query.data;
  const expiresIn = cipher.activeUntil ? Math.floor((new Date(cipher.activeUntil).getTime() - now) / 1000) : null;
  return (
    <PlayShell title="CIPHER LAB" accent="purple">
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="lb-mono" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{cipher.cipherType} · expires {expiresIn === null ? 'later' : formatSeconds(expiresIn)} · attempt {attempt ? formatSeconds(cipher.timeLimitSeconds - attemptSeconds) : 'not started'}</div>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: '1px solid rgba(255,255,255,0.12)', padding: 14, color: 'var(--c-yellow)' }}>{cipher.ciphertext}</pre>
        {!attempt && <button className="lb-btn-primary" onClick={() => startMutation.mutate()}>START 10-MIN ATTEMPT</button>}
        {attempt && !attempt.submittedAt && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: cipher.hintCount ?? 0 }).map((_item, index) => <button key={index} className="lb-btn-ghost" onClick={() => hintMutation.mutate(index)}>HINT {index + 1} (-{cipher.hintPenalty})</button>)}
            </div>
            {revealedHints.map((hint, index) => <div key={index} className="lb-mono" style={{ color: 'var(--c-green)', fontSize: 12 }}>Hint {index + 1}: {hint}</div>)}
            <input value={submission} onChange={(event) => setSubmission(event.target.value)} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 12 }} />
            <button className="lb-btn-primary" disabled={!submission.trim()} onClick={() => submitMutation.mutate()}>SUBMIT</button>
          </>
        )}
        {(result || attempt?.submittedAt) && <div className="lb-mono" style={{ color: (result?.solved ?? attempt?.solved) ? 'var(--c-green)' : 'var(--c-red)', fontSize: 13 }}>{(result?.solved ?? attempt?.solved) ? 'Solved' : 'Unsolved'} · {result?.pointsAwarded ?? attempt?.pointsAwarded ?? 0} pts · <Link to="/leaderboard" style={{ color: 'var(--c-yellow)' }}>leaderboard</Link></div>}
      </div>
    </PlayShell>
  );
}
