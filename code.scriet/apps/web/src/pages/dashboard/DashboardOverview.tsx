import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/lib/api';
import type { Registration, Announcement } from '@/lib/api';
import { Brackets, MetaChip, RowAccent, rotateAccent } from '@/components/tesseract';
import { formatDate } from '@/lib/dateUtils';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};
function stagger(i: number) {
  return { ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.05 } };
}

const PLACEHOLDER_GAMES = [
  { id: 'snake', title: 'SNAKE.EXE', accent: 'green' as const, glyph: 'S', tag: '#solo' },
  { id: 'pong', title: 'PONG.RIVAL', accent: 'blue' as const, glyph: 'P', tag: '#multiplayer' },
  { id: 'tetra', title: 'TETRACUBE', accent: 'purple' as const, glyph: 'T', tag: '#solo' },
];

export default function DashboardOverview() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [regsResult, annsResult] = await Promise.allSettled([
          api.getMyRegistrations(token),
          api.getAnnouncements(),
        ]);
        const regs = regsResult.status === 'fulfilled' ? regsResult.value : [];
        const anns = annsResult.status === 'fulfilled' ? annsResult.value : [];
        setPartialError(
          [regsResult, annsResult].some((r) => r.status === 'rejected')
            ? 'Some dashboard data could not be loaded.'
            : null,
        );
        setRegistrations(regs);
        setAnnouncements(anns.slice(0, 6));
      } catch {
        setPartialError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [token]);

  const firstName = user?.name?.split(' ')[0] || 'player';
  const upcomingRegs = registrations.filter((r) => r.event.status !== 'PAST').slice(0, 2);
  const tonight = upcomingRegs[0];

  const memberSinceYear = user ? new Date().getFullYear() : new Date().getFullYear();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="t-skeleton h-32" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="t-skeleton h-20" />
          <div className="t-skeleton h-20" />
          <div className="t-skeleton h-20" />
          <div className="t-skeleton h-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 t-skeleton h-64" />
          <div className="t-skeleton h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* ─── Greeting ─── */}
      <motion.section {...fadeUp} className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="lb-kicker">// session_resumed</div>
          <h1 className="font-display uppercase text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-[0.02em] mt-2">
            WELCOME BACK, <span className="lb-h-accent">{firstName.toUpperCase()}.</span>
          </h1>
          <p className="lb-sub mt-3">
            {upcomingRegs.length} event{upcomingRegs.length === 1 ? '' : 's'} on your calendar ·{' '}
            {announcements.length} fresh announcement{announcements.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <MetaChip label="ROLE" value={(user?.role ?? 'USER').replace(/_/g, ' ').toLowerCase()} accent="yellow" />
          <MetaChip label="EVENTS" value={String(registrations.length).padStart(2, '0')} accent="blue" />
          <MetaChip label="ANNCS" value={String(announcements.length).padStart(2, '0')} accent="purple" />
          <MetaChip label="SINCE" value={memberSinceYear} accent="green" />
        </div>
      </motion.section>

      {partialError && (
        <motion.div {...stagger(1)}>
          <div className="lb-bracket t-red px-4 py-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
            <div className="lb-bracket-corner lb-c-tl" />
            <div className="lb-bracket-corner lb-c-tr" />
            <div className="lb-bracket-corner lb-c-bl" />
            <div className="lb-bracket-corner lb-c-br" />
            ! {partialError}
          </div>
        </motion.div>
      )}

      {/* ─── Main grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Continue */}
          <motion.div {...stagger(2)}>
            <Brackets tag="continue.playing" accent="yellow">
              {upcomingRegs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                    no upcoming events
                  </p>
                  <Link to="/events" className="lb-btn-ghost mt-4 inline-flex">
                    BROWSE EVENTS →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingRegs.map((reg, i) => {
                    const accent = i === 0 ? 'yellow' : 'blue';
                    return (
                      <Link
                        key={reg.id}
                        to={`/events/${reg.event.slug || reg.event.id}`}
                        className={`lb-mod t-${accent}`}
                      >
                        <div className="lb-mod-num">[{String(i + 1).padStart(2, '0')}] event</div>
                        <div className="lb-mod-title text-base">{reg.event.title.toUpperCase()}</div>
                        <div className="lb-mod-desc text-xs lb-mono uppercase" style={{ letterSpacing: '0.08em' }}>
                          {formatDate(reg.event.startDate)} · {reg.event.status.toLowerCase()}
                        </div>
                        <div className="lb-mod-cta">RESUME →</div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Brackets>
          </motion.div>

          {/* Recommended Games */}
          <motion.div {...stagger(3)}>
            <Brackets tag="recommended" accent="blue">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLACEHOLDER_GAMES.map((g) => (
                  <Link key={g.id} to={`/games/${g.id}`} className={`lb-mod t-${g.accent}`}>
                    <div className="lb-hatch" style={{ height: 100, marginBottom: 4 }}>
                      <div className="lb-hatch-glyph" style={{ fontSize: 56 }}>{g.glyph}</div>
                    </div>
                    <div className="lb-mod-num">{g.tag}</div>
                    <div className="lb-mod-title text-sm">{g.title}</div>
                    <div className="lb-mod-cta text-[10px]">PLAY →</div>
                  </Link>
                ))}
              </div>
            </Brackets>
          </motion.div>

          {/* Activity / Announcements */}
          <motion.div {...stagger(4)}>
            <Brackets tag="activity.feed" accent="purple">
              {announcements.length === 0 ? (
                <p className="py-6 text-center lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                  no new announcements
                </p>
              ) : (
                <div>
                  {announcements.map((a, i) => (
                    <RowAccent
                      key={a.id}
                      accent={rotateAccent(i)}
                      time={formatDate(a.createdAt).split(',')[0]}
                      tag={a.priority?.toLowerCase()}
                    >
                      <Link to={`/announcements/${a.slug || a.id}`} className="hover:text-white transition-colors">
                        {a.title}
                      </Link>
                    </RowAccent>
                  ))}
                </div>
              )}
              <div className="mt-4 text-right">
                <Link to="/dashboard/announcements" className="lb-mono text-xs" style={{ color: 'var(--c-yellow)', letterSpacing: '0.12em' }}>
                  ALL ANNOUNCEMENTS →
                </Link>
              </div>
            </Brackets>
          </motion.div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-8">
          {/* Tonight */}
          <motion.div {...stagger(2)}>
            <Brackets tag="tonight" accent="red">
              {tonight ? (
                <div className="flex flex-col gap-3">
                  <div className="lb-mono text-[10px] uppercase" style={{ color: 'var(--c-red)', letterSpacing: '0.15em' }}>
                    {formatDate(tonight.event.startDate)}
                  </div>
                  <div className="font-display uppercase text-xl" style={{ letterSpacing: '0.04em' }}>
                    {tonight.event.title}
                  </div>
                  <div className="lb-mono text-xs" style={{ color: 'var(--fg-dim)' }}>
                    {tonight.event.venue || tonight.event.location || 'location TBA'}
                  </div>
                  <Link
                    to={`/events/${tonight.event.slug || tonight.event.id}`}
                    className="lb-btn-primary lb-btn-sm self-start mt-2"
                  >
                    VIEW →
                  </Link>
                </div>
              ) : (
                <div className="py-4 text-center lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                  nothing on tonight
                </div>
              )}
            </Brackets>
          </motion.div>

          {/* Quick links */}
          <motion.div {...stagger(3)}>
            <Brackets tag="quick.links" accent="green">
              <div className="flex flex-col gap-2">
                <QuickLink to="/dashboard/events" label="MY EVENTS" />
                <QuickLink to="/dashboard/announcements" label="ANNOUNCEMENTS" />
                <QuickLink to="/dashboard/profile" label="PROFILE" />
                {settings?.certificatesEnabled !== false && (
                  <QuickLink to="/dashboard/certificates" label="CERTIFICATES" />
                )}
                <QuickLink to="/dashboard/leaderboard" label="LEADERBOARD" />
              </div>
            </Brackets>
          </motion.div>

          {/* Domain status */}
          <motion.div {...stagger(4)}>
            <Brackets tag="access.profile" accent="yellow">
              <div className="flex flex-col gap-2 lb-mono text-xs" style={{ letterSpacing: '0.06em' }}>
                <DomainRow label="USER" value={user?.email?.split('@')[0] ?? '—'} />
                <DomainRow label="DOMAIN" value={user?.email?.split('@')[1] ?? '—'} ok />
                <DomainRow label="ROLE" value={(user?.role ?? 'USER').toLowerCase()} ok />
                <DomainRow label="STATUS" value="online" ok />
              </div>
            </Brackets>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-3 py-2 lb-mono text-xs transition-all"
      style={{
        color: 'var(--fg-dim)',
        letterSpacing: '0.1em',
        borderLeft: '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderLeftColor = 'var(--c-yellow)';
        e.currentTarget.style.color = 'var(--c-yellow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderLeftColor = 'transparent';
        e.currentTarget.style.color = 'var(--fg-dim)';
      }}
    >
      <span>{label}</span>
      <span>→</span>
    </Link>
  );
}

function DomainRow({ label, value, ok = false }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="lb-tel-row">
      <span className="lb-tel-k">{label}</span>
      <span className="lb-tel-v" style={{ color: ok ? 'var(--c-green)' : 'var(--c-yellow)' }}>
        {ok && <span className="lb-pulse" />}
        {value}
      </span>
    </div>
  );
}
