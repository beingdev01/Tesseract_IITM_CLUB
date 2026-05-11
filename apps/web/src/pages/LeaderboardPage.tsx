import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { api, type GamesLeaderboardRange } from '@/lib/api';

const ROW_COLORS = ['red', 'yellow', 'green', 'blue', 'purple', 'orange'] as const;

interface GameTab {
  id: string;
  label: string;
}

const GAME_TABS: GameTab[] = [
  { id: 'overall', label: 'OVERALL' },
  { id: 'smash-kart', label: 'SMASH KART' },
  { id: 'type-wars', label: 'TYPE WARS' },
  { id: 'trivia-tower', label: 'TRIVIA TOWER' },
  { id: 'scribbl', label: 'SCRIBBL' },
  { id: 'puzzle-run', label: 'PUZZLE RUN' },
  { id: 'brain-teasers', label: 'BRAIN TEASERS' },
  { id: 'cipher-lab', label: 'CIPHER LAB' },
  { id: 'riddle-room', label: 'RIDDLE ROOM' },
];

const RANGE_TABS: { id: GamesLeaderboardRange; label: string }[] = [
  { id: 'all', label: 'ALL TIME' },
  { id: 'month', label: 'THIS MONTH' },
  { id: 'week', label: 'THIS WEEK' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<string>('overall');
  const [range, setRange] = useState<GamesLeaderboardRange>('all');

  const gameParam = activeGame === 'overall' ? undefined : activeGame;

  const { data, isLoading } = useQuery({
    queryKey: ['games-leaderboard', activeGame, range],
    queryFn: () => api.getGamesLeaderboard({ game: gameParam, range, limit: 50 }),
    staleTime: 1000 * 60,
  });

  const leaderboard = data?.leaderboard ?? [];
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 12);
  const userIdx = useMemo(
    () => leaderboard.findIndex((e) => e.user.id === user?.id),
    [leaderboard, user?.id],
  );
  const userEntry = userIdx >= 0 ? leaderboard[userIdx] : null;
  const isOverall = activeGame === 'overall';
  const scoreLabel = isOverall ? 'POINTS' : 'BEST';

  return (
    <PageShell>
      <Header />

      <section style={{ padding: '64px 56px 32px', position: 'relative', zIndex: 2 }}>
        <p className="lb-kicker" style={{ marginBottom: 12 }}>// games leaderboard</p>
        <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '48px', letterSpacing: '0.02em', marginBottom: 12 }}>
          THE <span className="lb-h-accent">TOP PLAYERS</span>
        </h1>
        <p className="lb-sub" style={{ maxWidth: 560 }}>
          Cross-game rankings powered by every recorded session across Tesseract's games. Switch tabs to slice by game or
          timeframe.
        </p>
      </section>

      {/* Game filter chips */}
      <section style={{ padding: '0 56px 12px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GAME_TABS.map((tab) => {
            const isActive = tab.id === activeGame;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveGame(tab.id)}
                className="lb-mono"
                style={{
                  padding: '8px 14px',
                  border: isActive ? '1px solid var(--c-yellow)' : '1px solid rgba(255,255,255,0.12)',
                  background: isActive ? 'rgba(255,217,59,0.08)' : 'transparent',
                  color: isActive ? 'var(--c-yellow)' : 'rgba(255,255,255,0.75)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time range chips */}
      <section style={{ padding: '0 56px 32px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGE_TABS.map((tab) => {
            const isActive = tab.id === range;
            return (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id)}
                className="lb-mono"
                style={{
                  padding: '6px 12px',
                  border: isActive ? '1px solid var(--c-green)' : '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: isActive ? 'var(--c-green)' : 'rgba(255,255,255,0.55)',
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Podium — top 3 */}
      {top3.length >= 1 && (
        <section style={{ padding: '0 56px 48px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, maxWidth: 640, margin: '0 auto' }}>
            {top3[1] && (
              <div style={{ flex: 1, textAlign: 'center' }}>
                <Brackets accent="yellow" style={{ padding: '24px 16px', paddingTop: 32 }}>
                  <div className="lb-rank-pill lb-mono" style={{ marginBottom: 8, fontSize: '14px' }}>02</div>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,217,59,0.15)', border: '2px solid rgba(255,217,59,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: 'var(--c-yellow)' }}>
                    {top3[1].user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '12px', marginBottom: 4 }}>{top3[1].user.name}</div>
                  <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-yellow)' }}>
                    {(isOverall ? top3[1].totalScore : top3[1].bestScore).toLocaleString()} {scoreLabel.toLowerCase()}
                  </div>
                </Brackets>
              </div>
            )}
            {top3[0] && (
              <div style={{ flex: '0 0 220px', textAlign: 'center' }}>
                <Brackets accent="red" style={{ padding: '32px 20px', paddingTop: 48 }}>
                  <div className="lb-rank-pill lb-mono" style={{ marginBottom: 8, fontSize: '18px', color: 'var(--c-yellow)' }}>01</div>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,59,59,0.15)', border: '2px solid rgba(255,59,59,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontFamily: '"Audiowide", sans-serif', fontSize: '26px', color: 'var(--c-red)' }}>
                    {top3[0].user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '14px', marginBottom: 4 }}>{top3[0].user.name}</div>
                  <div className="lb-mono" style={{ fontSize: '13px', color: 'var(--c-red)' }}>
                    {(isOverall ? top3[0].totalScore : top3[0].bestScore).toLocaleString()} {scoreLabel.toLowerCase()}
                  </div>
                </Brackets>
              </div>
            )}
            {top3[2] && (
              <div style={{ flex: 1, textAlign: 'center' }}>
                <Brackets accent="green" style={{ padding: '24px 16px', paddingTop: 24 }}>
                  <div className="lb-rank-pill lb-mono" style={{ marginBottom: 8, fontSize: '14px' }}>03</div>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(94,255,122,0.15)', border: '2px solid rgba(94,255,122,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: 'var(--c-green)' }}>
                    {top3[2].user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '12px', marginBottom: 4 }}>{top3[2].user.name}</div>
                  <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-green)' }}>
                    {(isOverall ? top3[2].totalScore : top3[2].bestScore).toLocaleString()} {scoreLabel.toLowerCase()}
                  </div>
                </Brackets>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ranks 4-12 table */}
      <section style={{ padding: '0 56px 48px', position: 'relative', zIndex: 2 }}>
        <Brackets tag="ranks.sorted()">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['RANK', 'PLAYER', scoreLabel, 'PLAYS'].map((h) => (
                <span key={h} className="lb-mono" style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>{h}</span>
              ))}
            </div>

            {isLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p className="lb-mono ts-blink" style={{ fontSize: '11px', color: 'var(--c-green)' }}>&gt; loading ranks…</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>no rankings yet · play a game to appear</p>
              </div>
            ) : (
              rest.map((entry, i) => {
                const rank = i + 4;
                const color = ROW_COLORS[rank % ROW_COLORS.length];
                const primary = isOverall ? entry.totalScore : entry.bestScore;
                return (
                  <div key={entry.user.id} className={`lb-board-row lb-row-${color}`} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', padding: '14px 20px' }}>
                    <span className="lb-mono lb-rank-pill">{String(rank).padStart(2, '0')}</span>
                    <span className="lb-board-player">
                      <span className={`lb-avatar-chip lb-c-${color}`} />
                      {entry.user.name}
                    </span>
                    <span className="lb-mono lb-board-score">{primary.toLocaleString()}</span>
                    <span className="lb-mono lb-dim">{entry.sessions}</span>
                  </div>
                );
              })
            )}
          </div>
        </Brackets>
      </section>

      {user && userEntry && (
        <section style={{ padding: '0 56px 80px', position: 'relative', zIndex: 2 }}>
          <Brackets tag="your_position" accent="green">
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', padding: '14px 20px' }}>
              <span className="lb-mono lb-rank-pill" style={{ color: 'var(--c-green)' }}>
                {String(userIdx + 1).padStart(2, '0')}
              </span>
              <span className="lb-board-player">
                <span className="lb-avatar-chip lb-c-green" />
                {userEntry.user.name} <span className="lb-mono" style={{ color: 'var(--c-green)', fontSize: '10px' }}>· you</span>
              </span>
              <span className="lb-mono lb-board-score">
                {(isOverall ? userEntry.totalScore : userEntry.bestScore).toLocaleString()}
              </span>
              <span className="lb-mono lb-green">{userEntry.sessions}</span>
            </div>
          </Brackets>
        </section>
      )}

      <Footer />
    </PageShell>
  );
}
