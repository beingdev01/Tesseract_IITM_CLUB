import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brackets, TesseractHero, GateBar } from '@/components/tesseract';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const MODULES = [
  {
    n: '01',
    t: 'MINI-GAMES',
    d: 'Riddles. Puzzles. Teasers. 5-minute dopamine for the break between lectures.',
    meta: ['solo', 'daily', 'ranked'],
    accent: 'red' as const,
    href: '/games',
  },
  {
    n: '02',
    t: 'MULTIPLAYER',
    d: 'Scribbl lobbies, Smash Kart tournaments, whatever the group chat is obsessed with this week.',
    meta: ['party', 'live', 'chaotic'],
    accent: 'green' as const,
    href: '/games',
  },
  {
    n: '03',
    t: 'EVENTS',
    d: 'Movie nights. Play nights. Community challenges. IRL and URL.',
    meta: ['weekly', 'rsvp'],
    accent: 'blue' as const,
    href: '/events',
  },
  {
    n: '04',
    t: 'ESPORTS',
    d: 'Seasonal cups. A global ladder. One leaderboard, every game.',
    meta: ['ranked', 'seasonal'],
    accent: 'purple' as const,
    href: '/leaderboard',
  },
];

const ROW_COLORS = ['red', 'yellow', 'green', 'blue', 'purple'] as const;
const EVENT_ACCENTS = ['red', 'yellow', 'blue'] as const;

function formatEventDay(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
}

function formatEventTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function HomePage() {
  const { user } = useAuth();

  const { data: homeData } = useQuery({
    queryKey: ['homepage'],
    queryFn: api.getHomePageData,
    staleTime: 1000 * 60 * 5,
  });
  const { data: leaderData } = useQuery({
    queryKey: ['leaderboard-peek'],
    queryFn: () => api.getGamesLeaderboard({ limit: 5 }),
    staleTime: 1000 * 60,
  });
  const leaderRows = leaderData?.leaderboard ?? [];

  const stats = homeData?.stats;
  const upcomingEvents = homeData?.upcomingEvents ?? [];

  return (
    <Layout>
      <GateBar />

      {/* HERO */}
      <section className="lb-hero">
        <div className="lb-hero-left">
          <div className="lb-hero-label">&gt; booting tesseract…</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">A PLACE TO</span>
            <span className="lb-h-line lb-h-accent">PLAY, PAUSE,</span>
            <span className="lb-h-line">AND BELONG.</span>
          </h1>
          <p className="lb-sub">
            A student-built community for IITM BS. Mini-games, movie nights, esports ladders,
            and the people who make assignments bearable.
          </p>

          <div className="lb-cta-row">
            {user ? (
              <>
                <Link to="/dashboard" className="lb-btn-primary lb-btn-lg">▶ DASHBOARD</Link>
                <Link to="/games" className="lb-btn-ghost lb-btn-lg">{'// browse games'}</Link>
              </>
            ) : (
              <>
                <Link to="/join" className="lb-btn-primary lb-btn-lg">▶ JOIN TESSERACT</Link>
                <Link to="/about" className="lb-btn-ghost lb-btn-lg">{'// read more'}</Link>
              </>
            )}
          </div>

          <Brackets tag="telemetry" accent="yellow">
            <div className="lb-telemetry">
              <div className="lb-tel-row">
                <span className="lb-tel-k">members_total</span>
                <span className="lb-tel-v">{stats?.members?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">events_total</span>
                <span className="lb-tel-v">{stats?.events ?? '—'}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">upcoming_events</span>
                <span className="lb-tel-v">{upcomingEvents.length}</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">achievements_total</span>
                <span className="lb-tel-v">{stats?.achievements ?? '—'}</span>
              </div>
            </div>
          </Brackets>
        </div>

        <motion.div
          className="lb-hero-right"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="lb-viz-ring" />
          <TesseractHero size={460} speed={1} glow />
          <div className="lb-viz-caption">a tesseract · 4D unfolded</div>
        </motion.div>
      </section>

      {/* MODULES */}
      <section className="lb-modules">
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// modules</div>
            <h2 className="lb-section-title">WHAT RUNS ON TESSERACT</h2>
          </div>
          <div className="lb-kicker-right">4 of 4 live</div>
        </div>

        <div className="lb-module-grid">
          {MODULES.map((m) => (
            <Link key={m.n} to={m.href} className={`lb-module-wrap lb-c-${m.accent}`}>
              <Brackets tag={`module_${m.n}`} accent={m.accent}>
                <div className="lb-module">
                  <div className="lb-module-num">{m.n}</div>
                  <h3 className="lb-module-title">{m.t}</h3>
                  <p className="lb-module-desc">{m.d}</p>
                  <div className="lb-module-meta">
                    {m.meta.map((x) => (
                      <span key={x}>#{x}</span>
                    ))}
                  </div>
                  <div className="lb-module-link">ENTER →</div>
                </div>
              </Brackets>
            </Link>
          ))}
        </div>
      </section>

      {/* EVENTS PREVIEW */}
      <section className="lb-board-section" style={{ paddingBottom: 0 }}>
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// upcoming · this_week</div>
            <h2 className="lb-section-title">EVENTS DROP</h2>
          </div>
          <Link to="/events" className="lb-kicker-right" style={{ color: 'var(--c-yellow)' }}>VIEW ALL →</Link>
        </div>
        <Brackets tag="schedule.live" accent="green">
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lb-mono text-xs">
              {upcomingEvents.slice(0, 3).map((event, index) => {
                const accent = EVENT_ACCENTS[index % EVENT_ACCENTS.length];
                const eventTag = event.eventType ? event.eventType.toLowerCase().replace(/\s+/g, '_') : 'event';
                return (
                  <Link
                    key={event.id}
                    to={`/events/${event.slug || event.id}`}
                    className={`lb-c-${accent}`}
                    style={{
                      padding: 14,
                      border: '1px solid var(--line)',
                      borderLeft: '3px solid var(--acc)',
                      background: 'linear-gradient(90deg, var(--acc-glow), transparent 60%)',
                      textDecoration: 'none',
                    }}
                  >
                    <div className="font-display text-base mb-1" style={{ color: 'var(--acc)', letterSpacing: '0.04em' }}>
                      {formatEventDay(event.startDate)}
                    </div>
                    <div className="lb-mono text-[10px] mb-2" style={{ color: 'var(--fg-mute)' }}>
                      {formatEventTime(event.startDate)} · #{eventTag}
                    </div>
                    <div className="font-display text-sm" style={{ color: 'var(--fg)', letterSpacing: '0.04em' }}>
                      {event.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div
              className="lb-mono"
              style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12 }}
            >
              no upcoming events yet · check back soon
            </div>
          )}
        </Brackets>
      </section>

      {/* LEADERBOARD */}
      <section className="lb-board-section">
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// leaderboard · weekly</div>
            <h2 className="lb-section-title">WHO'S WINNING</h2>
          </div>
          <div className="lb-kicker-right">refresh every 60s</div>
        </div>
        <Brackets tag="ranks.sorted()" accent="yellow">
          <div className="lb-board">
            <div className="lb-board-head">
              <span>RANK</span>
              <span>PLAYER</span>
              <span>PLAYS</span>
              <span>POINTS</span>
              <span>STATUS</span>
            </div>
            {leaderRows.length > 0 ? (
              leaderRows.slice(0, 5).map((entry, i) => {
                const c = ROW_COLORS[i % ROW_COLORS.length];
                return (
                  <div
                    key={entry.user.id}
                    className={`lb-board-row lb-row-${c}${i === 0 ? ' lb-board-row-top' : ''}`}
                  >
                    <span className="lb-mono lb-rank-pill">{String(i + 1).padStart(2, '0')}</span>
                    <span className="lb-board-player">
                      <span className={`lb-avatar-chip lb-c-${c}`} />
                      {entry.user.name}
                    </span>
                    <span className="lb-mono lb-dim">{entry.sessions}</span>
                    <span className="lb-mono lb-board-score">{entry.totalScore.toLocaleString()}</span>
                    <span className="lb-mono lb-green">{i === 0 ? 'TOP' : 'LIVE'}</span>
                  </div>
                );
              })
            ) : (
              <div
                className="lb-mono"
                style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12 }}
              >
                no rankings yet · play a game to appear
              </div>
            )}
          </div>
        </Brackets>
      </section>

      {/* JOIN */}
      <section className="lb-join">
        <Brackets tag="auth · google_oauth" accent="yellow">
          <div className="lb-join-inner">
            <div className="lb-kicker">// entry_point</div>
            <h2 className="lb-join-title">
              ONE DOOR. <span className="lb-h-accent">INSTITUTE EMAIL ONLY.</span>
            </h2>
            <p className="lb-sub" style={{ margin: '0 auto 24px', maxWidth: 540 }}>
              Sign in with your @ds or @es institute Google account. One click and you're in —
              no passwords, no external logins, no scraping allowed.
            </p>
            {user ? (
              <Link to="/dashboard" className="lb-btn-primary lb-btn-lg">▶ GO TO DASHBOARD</Link>
            ) : (
              <Link to="/join" className="lb-btn-primary lb-btn-lg">▶ JOIN TESSERACT</Link>
            )}
            <div className="lb-join-steps">
              <div><span>01</span> verify email</div>
              <div><span>02</span> join tesseract</div>
              <div><span>03</span> pick a game</div>
              <div><span>04</span> climb the board</div>
            </div>
          </div>
        </Brackets>
      </section>

    </Layout>
  );
}
