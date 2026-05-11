import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function formatPlays(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [playMessage, setPlayMessage] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const gameQuery = useQuery({
    queryKey: ['game-detail', id],
    queryFn: () => api.getGame(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });

  const game = gameQuery.data;

  const leaderboardQuery = useQuery({
    queryKey: ['game-leaderboard', game?.id],
    queryFn: () => api.getGamesLeaderboard({ game: game!.id, limit: 8 }),
    enabled: Boolean(game?.backendReady),
    staleTime: 1000 * 30,
  });

  const handlePlay = async () => {
    if (!game) return;
    setPlayMessage(null);
    setPlayError(null);

    if (!game.backendReady) {
      setPlayError('This game backend is still pending.');
      return;
    }

    if (!token) {
      navigate('/signin', {
        state: {
          from: `/games/${game.id}`,
          message: 'Sign in to create a game session.',
        },
      });
      return;
    }

    if (game.id !== 'smash-kart') {
      navigate(`/games/${game.id}/play`);
      return;
    }

    try {
      setPlaying(true);
      await api.createGameSession(game.id, token);
      await Promise.all([gameQuery.refetch(), leaderboardQuery.refetch()]);
      setPlayMessage('Session created. Leaderboard updated.');
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : 'Failed to create game session');
    } finally {
      setPlaying(false);
    }
  };

  if (gameQuery.isLoading) {
    return (
      <PageShell>
        <Header />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Brackets tag="loading" accent="green" style={{ padding: 36 }}>
            <p className="lb-mono ts-blink" style={{ fontSize: '11px', color: 'var(--c-green)' }}>
              {'>'} loading game...
            </p>
          </Brackets>
        </div>
        <Footer />
      </PageShell>
    );
  }

  if (!game) {
    return (
      <PageShell>
        <Header />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Brackets tag="error_404" accent="red" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '48px', marginBottom: 16, color: 'var(--c-red)' }}>404</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
              {gameQuery.error instanceof Error ? gameQuery.error.message : 'Game not found in the Tesseract catalog.'}
            </p>
            <Link to="/games" className="lb-btn-primary" style={{ textDecoration: 'none' }}>
              ← BACK TO GAMES
            </Link>
          </Brackets>
        </div>
        <Footer />
      </PageShell>
    );
  }

  const leaderboard = leaderboardQuery.data?.leaderboard ?? [];

  return (
    <PageShell>
      <Header />

      <section
        style={{
          padding: '64px 56px 48px',
          position: 'relative',
          zIndex: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          to="/games"
          className="lb-mono"
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.12em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 32,
          }}
        >
          ← BACK TO GAMES
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 48 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              width: 180,
              height: 180,
              flexShrink: 0,
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)',
                backgroundSize: '10px 10px',
              }}
            />
            <span
              style={{
                fontFamily: '"Audiowide", sans-serif',
                fontSize: '72px',
                color: `var(--c-${game.accent})`,
                opacity: 0.35,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {game.title.charAt(0)}
            </span>
          </motion.div>

          <div style={{ flex: 1 }}>
            <div className="lb-mono" style={{ fontSize: '10px', color: `var(--c-${game.accent})`, letterSpacing: '0.15em', marginBottom: 12 }}>
              #{game.category}
            </div>
            <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '40px', letterSpacing: '0.04em', marginBottom: 16 }}>
              {game.title}
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 24, maxWidth: 560 }}>
              {game.description}
            </p>
            <div className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: 32, display: 'flex', gap: 24 }}>
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{game.players}</strong> players
              </span>
              <span>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{formatPlays(game.plays)}</strong> total plays
              </span>
              {game.live > 0 && (
                <span style={{ color: 'var(--c-green)' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--c-green)', marginRight: 6, boxShadow: '0 0 6px var(--c-green)', verticalAlign: 'middle' }} />
                  {game.live} live now
                </span>
              )}
            </div>
            {!game.backendReady && (
              <div
                className="lb-mono"
                style={{
                  fontSize: '10px',
                  color: 'var(--c-yellow)',
                  border: '1px solid rgba(255,217,59,0.3)',
                  padding: '4px 8px',
                  marginBottom: 16,
                  display: 'inline-block',
                }}
              >
                BACKEND PENDING
              </div>
            )}
            {playMessage && (
              <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-green)', marginBottom: 12 }}>
                {playMessage}
              </div>
            )}
            {playError && (
              <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-red)', marginBottom: 12 }}>
                {playError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button className="lb-btn-primary lb-btn-lg" onClick={() => void handlePlay()} whileTap={{ scale: 0.97, x: 1, y: 1 }} disabled={playing}>
                {playing ? 'STARTING…' : 'PLAY ▶'}
              </motion.button>
              <Link to="/leaderboard" className="lb-btn-ghost lb-btn-lg" style={{ textDecoration: 'none' }}>
                VIEW RANKS
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 56px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, position: 'relative', zIndex: 2 }}>
        <Brackets tag="rules" accent={game.accent}>
          <div style={{ padding: 8 }}>
            <h2 className="lb-mono" style={{ fontSize: '12px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              GAME RULES
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {game.rules.map((rule, i) => (
                <li key={rule} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="lb-mono" style={{ fontSize: '10px', color: `var(--c-${game.accent})`, flexShrink: 0, paddingTop: 3 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </Brackets>

        <Brackets tag="leaderboard · this game" accent="yellow">
          <div style={{ padding: '8px 0' }}>
            <h2 className="lb-mono" style={{ fontSize: '12px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 20, padding: '0 8px' }}>
              TOP PLAYERS
            </h2>

            {!game.backendReady ? (
              <div style={{ padding: '26px 20px', textAlign: 'center' }}>
                <p className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
                  backend for this game is pending<br />
                  <span style={{ color: 'var(--c-yellow)', opacity: 0.75 }}>Smash Kart is currently supported end-to-end.</span>
                </p>
              </div>
            ) : leaderboardQuery.isLoading ? (
              <div style={{ padding: '26px 20px', textAlign: 'center' }}>
                <p className="lb-mono ts-blink" style={{ fontSize: '11px', color: 'var(--c-green)' }}>
                  {'>'} loading leaderboard...
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ padding: '26px 20px', textAlign: 'center' }}>
                <p className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
                  no sessions yet<br />
                  <span style={{ color: 'var(--c-yellow)', opacity: 0.8 }}>be the first to play.</span>
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '58px 1fr auto',
                      gap: 12,
                      padding: '10px 12px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      alignItems: 'center',
                    }}
                  >
                    <span className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: '11px' }}>
                      {String(entry.rank).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{entry.user.name}</span>
                    <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                      {entry.sessions} runs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Brackets>
      </section>

      <Footer />
    </PageShell>
  );
}
