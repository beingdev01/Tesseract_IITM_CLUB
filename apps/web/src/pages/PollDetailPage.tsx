import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Brackets, MetaChip } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Poll } from '@/lib/api';

function formatRemaining(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${Math.max(0, mins)}m left`;
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && /404|not.?found/i.test(err.message);
}

export default function PollDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, token } = useAuth();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [voting, setVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);

  const [feedbackInput, setFeedbackInput] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const fetchPoll = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.getPoll(slug, token ?? undefined);
      setPoll(data);
      setSelectedOptionIds(data.currentUserVote?.optionIds ?? []);
      setFeedbackInput(data.currentUserFeedback?.message ?? '');
    } catch (err) {
      if (isNotFoundError(err)) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load poll');
      }
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => { void fetchPoll(); }, [fetchPoll]);

  const hasVoted = Boolean(poll?.currentUserVote);
  const canChangeVote = Boolean(poll?.allowVoteChange);
  const showResults = useMemo(() => {
    if (!poll) return false;
    return poll.isClosed || hasVoted;
  }, [poll, hasVoted]);

  const toggleOption = (optionId: string) => {
    if (!poll) return;
    setVoteSuccess(false);
    if (poll.allowMultipleChoices) {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  const handleVote = async () => {
    if (!poll || !token || selectedOptionIds.length === 0) return;
    setVoting(true);
    setError(null);
    try {
      const updated = await api.voteOnPoll(poll.slug, selectedOptionIds, token);
      setPoll(updated);
      setSelectedOptionIds(updated.currentUserVote?.optionIds ?? []);
      setVoteSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!poll || !token || !feedbackInput.trim()) return;
    setSubmittingFeedback(true);
    setError(null);
    try {
      await api.submitPollFeedback(poll.slug, feedbackInput.trim(), token);
      setFeedbackSuccess(true);
      await fetchPoll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <section className="lb-hero" style={{ padding: '80px 0' }}>
          <div className="flex items-center justify-center w-full">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
            <span className="lb-mono text-xs ml-3" style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
              loading poll…
            </span>
          </div>
        </section>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <section className="lb-hero" style={{ padding: '80px 0' }}>
          <Brackets tag="poll.not_found" accent="red" className="mx-auto" style={{ maxWidth: 480 }}>
            <h1 className="lb-headline" style={{ fontSize: 40, marginBottom: 12 }}>POLL NOT FOUND</h1>
            <p className="lb-sub" style={{ marginBottom: 24 }}>
              This poll either doesn't exist or isn't published yet.
            </p>
            <Link to="/" className="lb-btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Brackets>
        </section>
      </Layout>
    );
  }

  if (!poll) return null;

  const remaining = formatRemaining(poll.deadline);
  const totalVotes = poll.totalVotes;

  return (
    <Layout>
      <section className="lb-hero" style={{ padding: '60px 0 80px' }}>
        <div className="w-full max-w-3xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Link
            to="/"
            className="lb-mono text-xs inline-flex items-center gap-2 self-start"
            style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> back
          </Link>

          <Brackets tag="poll.vote" accent="green">
            <div className="lb-kicker" style={{ marginBottom: 8 }}>// poll</div>
            <h1 className="lb-headline" style={{ fontSize: 40, lineHeight: 1.1, marginBottom: 16 }}>
              {poll.question}
            </h1>
            {poll.description && (
              <p className="lb-sub" style={{ marginBottom: 20 }}>{poll.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {poll.isClosed ? (
                <MetaChip label="STATUS" value="closed" accent="red" />
              ) : (
                <MetaChip label="STATUS" value="open" accent="green" />
              )}
              {remaining && !poll.isClosed && (
                <MetaChip label="ENDS" value={remaining} accent="yellow" />
              )}
              <MetaChip label="VOTES" value={String(totalVotes)} accent="blue" />
              {poll.allowMultipleChoices && (
                <MetaChip label="MULTI" value="yes" accent="yellow" />
              )}
            </div>

            {error && (
              <div
                className="lb-mono text-xs mb-4 px-3 py-2 flex items-start gap-2"
                style={{ color: 'var(--c-red)', border: '1px solid var(--c-red)', background: 'rgba(255,87,87,0.08)' }}
                role="alert"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!user && !poll.isClosed && (
              <div
                className="lb-mono text-xs mb-4 px-3 py-2"
                style={{ color: 'var(--c-yellow)', border: '1px solid var(--c-yellow)', background: 'rgba(255,217,59,0.08)' }}
              >
                Sign in to cast your vote.{' '}
                <Link to={`/signin?next=${encodeURIComponent(`/polls/${poll.slug}`)}`} style={{ textDecoration: 'underline' }}>
                  Sign in →
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {poll.options.map((option) => {
                const isSelected = selectedOptionIds.includes(option.id);
                const isUserChoice = poll.currentUserVote?.optionIds.includes(option.id) ?? false;
                const disabled = poll.isClosed || !user || (hasVoted && !canChangeVote);
                const pct = Math.round(option.percentage);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !disabled && toggleOption(option.id)}
                    disabled={disabled}
                    className="text-left"
                    style={{
                      position: 'relative',
                      padding: '14px 16px',
                      border: `1px solid ${isSelected ? 'var(--c-green)' : 'var(--line)'}`,
                      background: isSelected ? 'rgba(94,255,122,0.08)' : 'var(--bg-2)',
                      cursor: disabled ? 'default' : 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      overflow: 'hidden',
                    }}
                  >
                    {showResults && (
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${pct}%`,
                          background: 'rgba(255,217,59,0.06)',
                          borderRight: '1px solid rgba(255,217,59,0.25)',
                          pointerEvents: 'none',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    )}
                    <div className="flex items-center justify-between gap-3 relative">
                      <div className="flex items-center gap-3">
                        {!poll.isClosed && user && (
                          <span
                            aria-hidden
                            style={{
                              width: 14,
                              height: 14,
                              border: `1.5px solid ${isSelected ? 'var(--c-green)' : 'var(--fg-mute)'}`,
                              borderRadius: poll.allowMultipleChoices ? 3 : '50%',
                              background: isSelected ? 'var(--c-green)' : 'transparent',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span style={{ color: '#fff' }}>{option.text}</span>
                        {isUserChoice && (
                          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--c-green)' }} />
                        )}
                      </div>
                      {showResults && (
                        <span className="lb-mono text-xs" style={{ color: 'var(--fg-mute)' }}>
                          {pct}% · {option.voteCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {user && !poll.isClosed && (
              <div className="flex items-center justify-between mt-5">
                {voteSuccess && !error ? (
                  <p className="lb-mono text-xs inline-flex items-center gap-2" style={{ color: 'var(--c-green)' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> vote recorded
                  </p>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={
                    voting ||
                    selectedOptionIds.length === 0 ||
                    (hasVoted && !canChangeVote)
                  }
                  className="lb-btn-primary"
                >
                  {voting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      submitting…
                    </>
                  ) : hasVoted ? (
                    canChangeVote ? 'CHANGE VOTE' : 'VOTE LOCKED'
                  ) : (
                    'CAST VOTE'
                  )}
                </button>
              </div>
            )}
          </Brackets>

          {user && (
            <Brackets tag="poll.feedback" accent="yellow">
              <div className="lb-kicker" style={{ marginBottom: 12 }}>// optional feedback</div>
              <p className="lb-sub" style={{ marginBottom: 16 }}>
                {poll.currentUserFeedback ? 'Update your existing note.' : 'Leave a short note about this poll. The team reads these.'}
              </p>
              <textarea
                value={feedbackInput}
                onChange={(e) => { setFeedbackInput(e.target.value); setFeedbackSuccess(false); }}
                rows={4}
                maxLength={2000}
                placeholder="Optional comment…"
                className="w-full lb-mono text-sm p-3"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  color: '#fff',
                  fontFamily: '"JetBrains Mono", monospace',
                  resize: 'vertical',
                }}
              />
              <div className="flex items-center justify-between mt-3">
                {feedbackSuccess ? (
                  <p className="lb-mono text-xs inline-flex items-center gap-2" style={{ color: 'var(--c-green)' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> feedback saved
                  </p>
                ) : (
                  <span className="lb-mono text-[10px]" style={{ color: 'var(--fg-mute)' }}>
                    {feedbackInput.length}/2000
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback || feedbackInput.trim().length === 0}
                  className="lb-btn-ghost inline-flex items-center gap-2"
                >
                  {submittingFeedback ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {poll.currentUserFeedback ? 'UPDATE FEEDBACK' : 'SUBMIT FEEDBACK'}
                </button>
              </div>
            </Brackets>
          )}
        </div>
      </section>
    </Layout>
  );
}
