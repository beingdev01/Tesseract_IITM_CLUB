import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// TODO(backend): GET /api/games — replace placeholder data when endpoint exists
interface Game {
  id: string;
  title: string;
  description: string;
  category: 'multiplayer' | 'party' | 'solo' | 'esports';
  accent: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange';
  players: string;
  plays: string;
  live: number;
  hot: boolean;
}

const PLACEHOLDER_GAMES: Game[] = [
  { id: 'smash-kart',    title: 'SMASH KART',    description: 'Top-down karting chaos. Banana peels still legal.',                       category: 'multiplayer', accent: 'red',    players: '2-12', plays: '4,210', live: 12, hot: true  },
  { id: 'scribbl',       title: 'SCRIBBL',        description: "Draw it. Guess it. Argue about whether 'thingy' counts.",                  category: 'party',       accent: 'yellow', players: '4-16', plays: '3,890', live: 8,  hot: true  },
  { id: 'puzzle-run',    title: 'PUZZLE RUN',     description: 'Daily logic chain. New set drops at 00:00 IST.',                          category: 'solo',        accent: 'green',  players: '1',    plays: '5,620', live: 0,  hot: false },
  { id: 'brain-teasers', title: 'BRAIN TEASERS',  description: 'Five teasers a day. Easy, hard, devious, plus a bonus.',                  category: 'solo',        accent: 'blue',   players: '1',    plays: '2,140', live: 0,  hot: false },
  { id: 'cipher-lab',    title: 'CIPHER LAB',     description: 'Crack the cipher before the timer runs out. Hints cost points.',          category: 'solo',        accent: 'purple', players: '1',    plays: '1,890', live: 0,  hot: false },
  { id: 'riddle-room',   title: 'RIDDLE ROOM',    description: 'Cooperative escape room. One riddle locks the next.',                     category: 'party',       accent: 'red',    players: '2-8',  plays: '1,440', live: 4,  hot: false },
  { id: 'type-wars',     title: 'TYPE WARS',      description: 'Speed-typing duels. WPM is a personality trait.',                         category: 'multiplayer', accent: 'yellow', players: '2-6',  plays: '990',   live: 2,  hot: false },
  { id: 'trivia-tower',  title: 'TRIVIA TOWER',   description: 'Climb the tower one question at a time. Wrong = fall.',                   category: 'party',       accent: 'green',  players: '4-20', plays: '2,310', live: 6,  hot: true  },
];

const CATEGORIES = [
  { id: 'all',        label: 'all_games',  accent: 'yellow' as const, count: PLACEHOLDER_GAMES.length },
  { id: 'multiplayer', label: 'multiplayer', accent: 'red' as const,    count: PLACEHOLDER_GAMES.filter(g => g.category === 'multiplayer').length },
  { id: 'party',      label: 'party',      accent: 'yellow' as const, count: PLACEHOLDER_GAMES.filter(g => g.category === 'party').length },
  { id: 'solo',       label: 'solo',       accent: 'green' as const,  count: PLACEHOLDER_GAMES.filter(g => g.category === 'solo').length },
  { id: 'esports',    label: 'esports',    accent: 'blue' as const,   count: 0 },
];

function GameCard({ game }: { game: Game }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -4, boxShadow: `0 0 24px var(--c-${game.accent})22` }}
      transition={{ duration: 0.2 }}
      style={{ border: `1px solid rgba(255,255,255,0.1)`, background: 'var(--bg-1)' }}
    >
      {/* Art area */}
      <div style={{
        height: 120, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(var(--c-${game.accent}-rgb,255,217,59),0.08), transparent)`,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Hatched grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
        }} />
        <span style={{
          fontFamily: '"Audiowide", sans-serif', fontSize: '48px',
          color: `var(--c-${game.accent})`, opacity: 0.3,
        }}>{game.title.charAt(0)}</span>

        {game.hot && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            style={{
              position: 'absolute', top: 10, right: 10,
              padding: '3px 8px', background: 'var(--c-red)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', letterSpacing: '0.12em',
              color: '#fff',
            }}
          >
            ▲ HOT
          </motion.div>
        )}
        {game.live > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px', background: 'rgba(94,255,122,0.15)', border: '1px solid rgba(94,255,122,0.3)',
            fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', letterSpacing: '0.12em',
            color: 'var(--c-green)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-green)', display: 'inline-block', boxShadow: '0 0 6px var(--c-green)' }} />
            {game.live} LIVE
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 20 }}>
        <div className="lb-mono" style={{ fontSize: '10px', color: `var(--c-${game.accent})`, letterSpacing: '0.12em', marginBottom: 8 }}>
          #{game.category}
        </div>
        <h3 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '14px', letterSpacing: '0.06em', marginBottom: 8 }}>
          {game.title}
        </h3>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 12 }}>
          {game.description}
        </p>
        <div className="lb-mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: 16, display: 'flex', gap: 16 }}>
          <span><strong style={{ color: 'rgba(255,255,255,0.6)' }}>{game.players}</strong> players</span>
          <span><strong style={{ color: 'rgba(255,255,255,0.6)' }}>{game.plays}</strong> plays</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to={`/games/${game.id}`}
            className="lb-btn-primary"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '11px', padding: '9px 12px' }}
          >
            PLAY ▶
          </Link>
          <Link
            to={`/games/${game.id}`}
            className="lb-btn-ghost"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '11px', padding: '9px 12px' }}
          >
            RANKS
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? PLACEHOLDER_GAMES
    : PLACEHOLDER_GAMES.filter((g) => g.category === activeCategory);

  return (
    <PageShell>
      <Header />

      {/* Hero */}
      <section style={{ padding: '64px 56px 40px', position: 'relative', zIndex: 2 }}>
        <p className="lb-kicker" style={{ marginBottom: 12 }}>// catalog.v1</p>
        <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '52px', letterSpacing: '0.02em', marginBottom: 12 }}>
          PICK YOUR <span className="lb-h-accent">POISON.</span>
        </h1>
        <p className="lb-sub" style={{ marginBottom: 32, maxWidth: 480 }}>
          {PLACEHOLDER_GAMES.length} games registered. New ones drop monthly.
        </p>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={activeCategory === cat.id ? `lb-btn-primary` : `lb-btn-ghost`}
              style={{ fontSize: '11px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span>{cat.label}</span>
              <span className="lb-mono" style={{ fontSize: '10px', opacity: 0.7 }}>{cat.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '0 56px 80px' }}>
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

        {filtered.length === 0 && (
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
