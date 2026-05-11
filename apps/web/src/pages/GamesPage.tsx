import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api, type CatalogGame } from '@/lib/api';

const EMPTY_GAMES: CatalogGame[] = [];

function formatPlays(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function GameCard({ game }: { game: CatalogGame }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -4, boxShadow: `0 0 24px var(--c-${game.accent})22` }}
      transition={{ duration: 0.2 }}
      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-1)' }}
    >
      <div
        style={{
          height: 120,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, rgba(var(--c-${game.accent}-rgb,255,217,59),0.08), transparent)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            fontSize: '48px',
            color: `var(--c-${game.accent})`,
            opacity: 0.3,
          }}
        >
          {game.title.charAt(0)}
        </span>

        {game.hot && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              padding: '3px 8px',
              background: 'var(--c-red)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color: '#fff',
            }}
          >
            ▲ HOT
          </motion.div>
        )}
        {game.live > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              background: 'rgba(94,255,122,0.15)',
              border: '1px solid rgba(94,255,122,0.3)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color: 'var(--c-green)',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--c-green)',
                display: 'inline-block',
                boxShadow: '0 0 6px var(--c-green)',
              }}
            />
            {game.live} LIVE
          </div>
        )}
      </div>

      <div style={{ padding: 20 }}>
        <div
          className="lb-mono"
          style={{ fontSize: '10px', color: `var(--c-${game.accent})`, letterSpacing: '0.12em', marginBottom: 8 }}
        >
          #{game.category}
        </div>
        <h3 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '14px', letterSpacing: '0.06em', marginBottom: 8 }}>
          {game.title}
        </h3>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 12 }}>
          {game.description}
        </p>
        <div
          className="lb-mono"
          style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: 16, display: 'flex', gap: 16 }}
        >
          <span>
            <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{game.players}</strong> players
          </span>
          <span>
            <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{formatPlays(game.plays)}</strong> plays
          </span>
        </div>
        {!game.backendReady && (
          <div
            className="lb-mono"
            style={{
              fontSize: '10px',
              color: 'var(--c-yellow)',
              border: '1px solid rgba(255,217,59,0.3)',
              padding: '4px 8px',
              marginBottom: 12,
              display: 'inline-block',
            }}
          >
            BACKEND PENDING
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to={game.backendReady ? `/games/${game.id}/play` : `/games/${game.id}`}
            className="lb-btn-primary"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '11px', padding: '9px 12px' }}
            aria-disabled={!game.backendReady}
          >
            PLAY ▶
          </Link>
          <Link
            to={`/games/${game.id}`}
            className="lb-btn-ghost"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '11px', padding: '9px 12px' }}
          >
            DETAILS
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['games-catalog'],
    queryFn: () => api.getGames(),
    staleTime: 1000 * 60,
  });

  const games = data?.games ?? EMPTY_GAMES;

  const categories = useMemo(() => ([
    { id: 'all', label: 'all_games', accent: 'yellow' as const, count: games.length },
    { id: 'multiplayer', label: 'multiplayer', accent: 'red' as const, count: games.filter((g) => g.category === 'multiplayer').length },
    { id: 'party', label: 'party', accent: 'yellow' as const, count: games.filter((g) => g.category === 'party').length },
    { id: 'solo', label: 'solo', accent: 'green' as const, count: games.filter((g) => g.category === 'solo').length },
    { id: 'esports', label: 'esports', accent: 'blue' as const, count: games.filter((g) => g.category === 'esports').length },
  ]), [games]);

  const filtered = activeCategory === 'all'
    ? games
    : games.filter((g) => g.category === activeCategory);

  return (
    <PageShell>
      <Header />

      <section style={{ padding: 'clamp(36px, 5vw, 64px) clamp(18px, 4vw, 56px) clamp(28px, 4vw, 40px)', position: 'relative', zIndex: 2 }}>
        <p className="lb-kicker" style={{ marginBottom: 12 }}>
          // catalog.v1
        </p>
        <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: 'clamp(32px, 6vw, 52px)', letterSpacing: '0.02em', marginBottom: 12 }}>
          PICK YOUR <span className="lb-h-accent">POISON.</span>
        </h1>
        <p className="lb-sub" style={{ marginBottom: 32, maxWidth: 480 }}>
          {isLoading ? 'Loading games...' : `${games.length} games registered. New ones drop monthly.`}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={activeCategory === cat.id ? 'lb-btn-primary' : 'lb-btn-ghost'}
              style={{ fontSize: '11px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span>{cat.label}</span>
              <span className="lb-mono" style={{ fontSize: '10px', opacity: 0.7 }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 clamp(18px, 4vw, 56px) 80px' }}>
        {error && (
          <Brackets tag="error" accent="red" style={{ padding: 28, marginBottom: 24 }}>
            <p className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-red)' }}>
              failed to load games: {error instanceof Error ? error.message : 'unknown error'}
            </p>
          </Brackets>
        )}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'var(--bg-1)',
                  height: 270,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'ts-shimmer 1.8s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
            >
              {filtered.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {!isLoading && filtered.length === 0 && (
          <Brackets tag="empty" accent="blue" style={{ padding: 40, textAlign: 'center', marginTop: 32 }}>
            <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              no games in this category yet
            </p>
          </Brackets>
        )}
      </section>

      <Footer />
    </PageShell>
  );
}
