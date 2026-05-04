import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api, type QOTDLeaderboardEntry } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { Brackets, MetaChip, type Accent } from '@/components/tesseract';

const PODIUM_ACCENTS: Record<number, Accent> = { 1: 'red', 2: 'yellow', 3: 'green' };
const TIER_ACCENTS: Accent[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export default function DashboardLeaderboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [leaderboard, setLeaderboard] = useState<QOTDLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getQOTDLeaderboard(50);
      setLeaderboard(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
      </div>
    );
  }

  if (settings?.showLeaderboard === false) {
    return (
      <div className="space-y-6">
        <div>
          <div className="lb-kicker">// dashboard.leaderboard</div>
          <h1 className="font-display uppercase text-3xl mt-2" style={{ letterSpacing: '0.04em' }}>
            LEADERBOARD <span className="lb-h-accent">DISABLED.</span>
          </h1>
        </div>
        <Brackets tag="status · disabled_by_admin" accent="red">
          <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">LEADERBOARD CURRENTLY DISABLED</div>
              <p className="text-[11px]" style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}>
                Admin has hidden the leaderboard. Check back later.
              </p>
            </div>
          </div>
        </Brackets>
      </div>
    );
  }

  const userIndex = leaderboard.findIndex((e) => e.user.id === user?.id);
  const userRank = userIndex >= 0 ? userIndex + 1 : null;
  const userEntry = userIndex >= 0 ? leaderboard[userIndex] : null;
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="lb-kicker">// dashboard.leaderboard</div>
        <h1 className="font-display uppercase text-[clamp(28px,4vw,40px)] mt-2 leading-tight" style={{ letterSpacing: '0.04em' }}>
          THE <span className="lb-h-accent">TOP TWELVE.</span>
        </h1>
        <p className="lb-sub mt-2">
          {leaderboard.length} active player{leaderboard.length === 1 ? '' : 's'} · ranked by QOTD problems solved.
        </p>
      </div>

      {/* User chip */}
      {user && (
        <div className="flex flex-wrap gap-3">
          <MetaChip label="YOUR RANK" value={userRank ? `#${String(userRank).padStart(2, '0')}` : 'unranked'} accent={userRank && userRank <= 3 ? 'red' : 'yellow'} />
          <MetaChip label="SOLVED" value={userEntry ? userEntry.submissions : 0} accent="blue" />
          <MetaChip label="TOTAL" value={leaderboard.length} accent="green" />
        </div>
      )}

      {error && (
        <Brackets tag="error" accent="red">
          <p className="lb-mono text-xs" style={{ color: 'var(--c-red)' }}>! {error}</p>
        </Brackets>
      )}

      {leaderboard.length === 0 ? (
        <Brackets tag="empty" accent="yellow">
          <p className="text-center py-6 lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
            no rankings yet · solve qotd to appear
          </p>
        </Brackets>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((entry, i) => {
              const rank = i + 1;
              const accent = PODIUM_ACCENTS[rank];
              const isYou = entry.user.id === user?.id;
              return (
                <motion.div
                  key={entry.user.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Brackets tag={`rank.${String(rank).padStart(2, '0')}`} accent={accent}>
                    <div className="flex flex-col items-center text-center gap-2 py-2">
                      <div className="lb-mono text-xs" style={{ color: `var(--c-${accent === 'red' ? 'red' : accent === 'yellow' ? 'yellow' : 'green'})`, letterSpacing: '0.15em' }}>
                        #{String(rank).padStart(2, '0')}
                      </div>
                      <div
                        className="font-display text-base uppercase mt-1"
                        style={{ color: 'var(--fg)', letterSpacing: '0.04em' }}
                      >
                        {entry.user.name} {isYou && <span className="lb-mono text-[10px]" style={{ color: 'var(--c-green)' }}>· you</span>}
                      </div>
                      <div className="font-display text-3xl mt-2" style={{ color: `var(--c-${accent === 'red' ? 'red' : accent === 'yellow' ? 'yellow' : 'green'})` }}>
                        {entry.submissions}
                      </div>
                      <div className="lb-mono text-[10px]" style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>problems solved</div>
                    </div>
                  </Brackets>
                </motion.div>
              );
            })}
          </div>

          {/* Rest */}
          {rest.length > 0 && (
            <Brackets tag="ranks.04+" accent="yellow">
              <div className="lb-board">
                <div className="lb-board-head">
                  <span>RANK</span>
                  <span>PLAYER</span>
                  <span>BATCH</span>
                  <span>SOLVED</span>
                  <span>Δ</span>
                </div>
                {rest.map((entry, i) => {
                  const rank = i + 4;
                  const c = TIER_ACCENTS[(rank - 4) % TIER_ACCENTS.length];
                  const isYou = entry.user.id === user?.id;
                  return (
                    <motion.div
                      key={entry.user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className={`lb-board-row lb-row-${c}`}
                    >
                      <span className="lb-mono lb-rank-pill">{String(rank).padStart(2, '0')}</span>
                      <span className="lb-board-player">
                        <span className={`lb-avatar-chip lb-c-${c}`} />
                        {entry.user.name}
                        {isYou && <span className="lb-mono text-[10px] ml-2" style={{ color: 'var(--c-green)' }}>· you</span>}
                      </span>
                      <span className="lb-mono lb-dim">—</span>
                      <span className="lb-mono lb-board-score">{entry.submissions}</span>
                      <span className="lb-mono lb-green">+0</span>
                    </motion.div>
                  );
                })}
              </div>
            </Brackets>
          )}

          {/* Your position strip */}
          {user && userRank && userRank > 12 && userEntry && (
            <Brackets tag="// your_position" accent="green">
              <div className="lb-board-row lb-row-green" style={{ background: 'var(--acc-glow)' }}>
                <span className="lb-mono lb-rank-pill">{String(userRank).padStart(2, '0')}</span>
                <span className="lb-board-player">
                  <span className="lb-avatar-chip lb-c-green" />
                  {user.name}
                </span>
                <span className="lb-mono lb-dim">—</span>
                <span className="lb-mono lb-board-score">{userEntry.submissions}</span>
                <span className="lb-mono lb-green">you</span>
              </div>
            </Brackets>
          )}
        </>
      )}
    </div>
  );
}
