import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// TODO(backend): GET /api/games/:id — replace placeholder with real API
const GAMES: Record<string, {
  id: string; title: string; description: string; rules: string[];
  accent: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  players: string; plays: string; live: number; category: string;
}> = {
  'smash-kart':    { id: 'smash-kart',    title: 'SMASH KART',    accent: 'red',    category: 'multiplayer', players: '2-12', plays: '4,210', live: 12, description: 'Top-down karting chaos. Banana peels still legal.', rules: ['3 laps per race', 'Items spawn every 15 seconds', 'Last place gets a speed boost', 'Final lap triggers siren'] },
  'scribbl':       { id: 'scribbl',       title: 'SCRIBBL',       accent: 'yellow', category: 'party',       players: '4-16', plays: '3,890', live: 8,  description: "Draw it. Guess it. Argue about whether 'thingy' counts.", rules: ['80 seconds per round', 'Faster guess = more points', 'Artist earns points per correct guess', '3 rounds by default'] },
  'puzzle-run':    { id: 'puzzle-run',    title: 'PUZZLE RUN',    accent: 'green',  category: 'solo',        players: '1',    plays: '5,620', live: 0,  description: 'Daily logic chain. New set drops at 00:00 IST.', rules: ['5 puzzles per day', 'Points decrease with hints', 'Streak bonus: +10% per day', 'Resets at midnight IST'] },
  'brain-teasers': { id: 'brain-teasers', title: 'BRAIN TEASERS', accent: 'blue',   category: 'solo',        players: '1',    plays: '2,140', live: 0,  description: 'Five teasers a day. Easy, hard, devious, plus a bonus.', rules: ['Daily refresh at 00:00 IST', 'Difficulty: easy→normal→hard→devious→bonus', 'No time limit', 'Submit once — no revisions'] },
  'cipher-lab':    { id: 'cipher-lab',    title: 'CIPHER LAB',    accent: 'purple', category: 'solo',        players: '1',    plays: '1,890', live: 0,  description: 'Crack the cipher before the timer runs out.', rules: ['10-minute timer', 'Hints reduce score by 100', 'Leaderboard resets weekly', 'New cipher every 48 hours'] },
};

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const game = id ? GAMES[id] : null;

  if (!game) {
    return (
      <PageShell>
        <Header />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Brackets tag="error_404" accent="red" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '48px', marginBottom: 16, color: 'var(--c-red)' }}>404</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>Game not found in the Tesseract catalog.</p>
            <Link to="/games" className="lb-btn-primary" style={{ textDecoration: 'none' }}>← BACK TO GAMES</Link>
          </Brackets>
        </div>
        <Footer />
      </PageShell>
    );
  }

  const handlePlay = () => {
    // TODO(backend): POST /api/games/:id/session — create game session
    alert('Game sessions coming soon! Backend integration in progress.');
  };

  return (
    <PageShell>
      <Header />

      {/* Hero */}
      <section style={{
        padding: '64px 56px 48px', position: 'relative', zIndex: 2,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/games" className="lb-mono" style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32,
        }}>
          ← BACK TO GAMES
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 48 }}>
          {/* Art area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              width: 180, height: 180, flexShrink: 0, position: 'relative',
              border: `1px solid rgba(255,255,255,0.1)`,
              background: `linear-gradient(135deg, rgba(255,255,255,0.04), transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)',
              backgroundSize: '10px 10px',
            }} />
            <span style={{
              fontFamily: '"Audiowide", sans-serif', fontSize: '72px',
              color: `var(--c-${game.accent})`, opacity: 0.35, position: 'relative', zIndex: 1,
            }}>{game.title.charAt(0)}</span>
          </motion.div>

          {/* Meta */}
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
              <span><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{game.players}</strong> players</span>
              <span><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{game.plays}</strong> total plays</span>
              {game.live > 0 && (
                <span style={{ color: 'var(--c-green)' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--c-green)', marginRight: 6, boxShadow: '0 0 6px var(--c-green)', verticalAlign: 'middle' }} />
                  {game.live} live now
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button
                className="lb-btn-primary lb-btn-lg"
                onClick={handlePlay}
                whileTap={{ scale: 0.97, x: 1, y: 1 }}
              >
                PLAY ▶
              </motion.button>
              <Link to="/leaderboard" className="lb-btn-ghost lb-btn-lg" style={{ textDecoration: 'none' }}>
                VIEW RANKS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rules + Leaderboard */}
      <section style={{ padding: '48px 56px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, position: 'relative', zIndex: 2 }}>
        <Brackets tag="rules" accent={game.accent}>
          <div style={{ padding: 8 }}>
            <h2 className="lb-mono" style={{ fontSize: '12px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              GAME RULES
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {game.rules.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
          {/* TODO(backend): GET /api/leaderboard/game/:gameId */}
          <div style={{ padding: '8px 0' }}>
            <h2 className="lb-mono" style={{ fontSize: '12px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 20, padding: '0 8px' }}>
              TOP PLAYERS
            </h2>
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 }}>
                per-game leaderboard<br />
                <span style={{ color: 'var(--c-yellow)', opacity: 0.6 }}>// TODO(backend): GET /api/leaderboard/game/:id</span>
              </p>
            </div>
          </div>
        </Brackets>
      </section>

      <Footer />
    </PageShell>
  );
}
