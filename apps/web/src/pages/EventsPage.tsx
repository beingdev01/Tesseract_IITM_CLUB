import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/ui/schema';
import { Brackets, Pill, type Accent } from '@/components/tesseract';
import { api, type Event } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getRegistrationStatus } from '@/lib/registrationStatus';

type EventStatus = 'UPCOMING' | 'ONGOING' | 'PAST';
const ROW_ACCENTS: Accent[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

function formatEventDay(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
}
function formatEventTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatLongDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' }).toUpperCase();
}
function startsIn(d: string): string {
  const ms = new Date(d).getTime() - Date.now();
  if (ms < 0) return 'started';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h < 24) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h`;
}

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState<EventStatus | 'ALL'>('ALL');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());

  // Frontend-only mock events for UI demonstration
  const SPECIAL_EVENTS = [
    {
      id: 's1',
      title: 'Escape Room',
      desc: 'A high-intensity, multi-stage puzzle and escape challenge where teams solve riddles, decode hidden clues, and complete tasks under pressure to unlock their way to victory. Combining logic, teamwork, and creativity, the event progresses from mind games to a real-time escape room experience, testing both intelligence and execution.',
      imageUrl: '/images/events/escaperoom.jpg',
      regUrl: 'https://www.iitmparadox.org/events/sports/86'
    },
    {
      id: 's2',
      title: 'Paradox Got Talent 2.0',
      desc: 'Take the stage, turn the page! Show off your talents and compete against the best in our flagship variety show.',
      imageUrl: '/images/events/gottalent.jpg',
      regUrl: 'https://www.iitmparadox.org/events/cultural/42'
    },
    {
      id: 's3',
      title: 'RAPadox 2.0',
      desc: 'Where beats blend & bars ascend. Showcase your rhythm, flow, and lyrical prowess in this ultimate rap face-off.',
      imageUrl: '/images/events/rapadox.jpg',
      regUrl: 'https://www.iitmparadox.org/events/cultural/47'
    },
  ];


  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getEvents();
        setEvents(data);
        if (token) {
          try {
            const registrations = await api.getMyRegistrations(token);
            setRegisteredEventIds(new Set(registrations.map((r) => r.eventId)));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [token]);

  const handleRegister = async (event: Event) => {
    const regStatus = getRegistrationStatus(event);
    if (!regStatus.canRegister) {
      toast.error(regStatus.message);
      return;
    }
    if (!user || !token) {
      localStorage.setItem('pendingEventRegistration', event.id);
      localStorage.setItem('pendingEventRegistrationType', event.teamRegistration ? 'team' : 'solo');
      navigate('/signin', { state: { from: '/events', pendingEventId: event.id } });
      return;
    }
    if (!user.phone || !user.course || !user.branch || !user.year) {
      localStorage.setItem('pendingEventRegistration', event.id);
      navigate('/dashboard/profile', { state: { message: 'Complete your profile first', pendingEventId: event.id } });
      return;
    }
    if (event.teamRegistration || (event.registrationFields && event.registrationFields.length > 0)) {
      navigate(`/events/${event.slug || event.id}`);
      return;
    }
    try {
      setRegistering(event.id);
      await api.registerForEvent(event.id, token);
      toast.success(`Registered for "${event.title}"`);
      const [updated, regs] = await Promise.all([api.getEvents(), api.getMyRegistrations(token)]);
      setEvents(updated);
      setRegisteredEventIds(new Set(regs.map((r) => r.eventId)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setRegistering(null);
    }
  };

  const filtered = useMemo(
    () => (activeTab === 'ALL' ? events : events.filter((e) => e.status === activeTab)),
    [events, activeTab],
  );

  const featured = useMemo(() => events.find((e) => e.status === 'UPCOMING'), [events]);
  const list = useMemo(() => filtered.filter((e) => e.id !== featured?.id), [filtered, featured]);

  const tabs: Array<{ key: EventStatus | 'ALL'; label: string; accent: Accent }> = [
    { key: 'ALL', label: 'all_events', accent: 'yellow' },
    { key: 'UPCOMING', label: 'upcoming', accent: 'green' },
    { key: 'ONGOING', label: 'ongoing', accent: 'blue' },
    { key: 'PAST', label: 'past', accent: 'purple' },
  ];

  return (
    <Layout>
      <SEO
        title="Events"
        description="Movie nights, tournaments, riddle solves, and play nights — only for IITM BS members."
        url="/events"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
        { name: 'Events', url: 'https://tesseract.iitm.ac.in/events' },
      ]} />

      {/* Hero */}
      <section className="events-hero">
        <div className="lb-kicker">// schedule.live</div>
        <h1 className="events-title">
          SHOW UP. <span className="lb-h-accent">LOG OFF.</span> CONNECT.
        </h1>
        <p className="lb-sub">
          {events.length} event{events.length === 1 ? '' : 's'} on the books · movie nights, tournaments, riddle solves, play nights · members only.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {tabs.map((t) => (
            <Pill
              key={t.key}
              accent={t.accent}
              active={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </Pill>
          ))}
        </div>
      </section>

      {/* Special Frontend Events Section */}
      <section className="events-special mt-16 mb-12">
        <div className="lb-sect-head mb-8 border-b border-[var(--line-sub)] pb-4 flex justify-between items-end">
          <div>
            <div className="lb-kicker">// flagship · showcase</div>
            <h2 className="lb-section-title text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-amber-300">
              PARADOX SPECIALS
            </h2>
          </div>
          <div className="lb-kicker-right font-mono text-[10px] opacity-60">
            [3 ACTIVE EVENTS]
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SPECIAL_EVENTS.map((se) => {
            // Curated, beautiful harmonizing theme styles for each event
            const themes: Record<string, { accent: string; glow: string; badge: string; kicker: string; bgSoft: string }> = {
              s1: { 
                accent: '#ef4444', // Red
                glow: 'rgba(239, 68, 68, 0.25)', 
                badge: '#clues_and_riddles', 
                kicker: '▶ escape room',
                bgSoft: 'rgba(239, 68, 68, 0.05)'
              },
              s2: { 
                accent: '#a855f7', // Purple
                glow: 'rgba(168, 85, 247, 0.25)', 
                badge: '#stage_talent', 
                kicker: '▶ paradox got talent',
                bgSoft: 'rgba(168, 85, 247, 0.05)'
              },
              s3: { 
                accent: '#3bb0ff', // Blue
                glow: 'rgba(59, 176, 255, 0.25)', 
                badge: '#rap_faceoff', 
                kicker: '▶ rapbattle',
                bgSoft: 'rgba(59, 176, 255, 0.05)'
              },
            };

            const theme = themes[se.id] || { 
              accent: 'var(--c-yellow)', 
              glow: 'rgba(255, 217, 59, 0.2)', 
              badge: '#special', 
              kicker: '▶ event',
              bgSoft: 'rgba(255, 217, 59, 0.05)'
            };

            return (
              <motion.div
                key={se.id}
                whileHover={{ y: -6, scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => window.open(se.regUrl, '_blank', 'noopener,noreferrer')}
                className="group relative flex flex-col cursor-pointer overflow-hidden transition-all duration-500 border border-white/10 hover:border-[var(--hover-color)] bg-black/40 backdrop-blur-md hover:shadow-[0_10px_30px_-5px_var(--hover-glow)]"
                style={{ 
                  borderRadius: '16px',
                  ...({
                    '--hover-color': theme.accent,
                    '--hover-glow': theme.glow,
                  } as React.CSSProperties)
                }}
              >
                {/* Glow Backdrop Hover Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% -20%, ${theme.glow}, transparent 60%)`
                  }}
                />

                {/* Card Header telemetries */}
                <div className="px-5 py-4 flex justify-between items-center border-b border-[var(--line-sub)] bg-white/[0.02] z-10">
                  <span className="font-mono text-[10px] tracking-widest uppercase font-bold" style={{ color: theme.accent }}>
                    {theme.kicker}
                  </span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 opacity-70 tracking-tight text-white">
                    {theme.badge}
                  </span>
                </div>

                {/* Taller Image Banner with subtle zoom and overlay - aligned to top */}
                <div className="relative w-full overflow-hidden bg-zinc-950/80 aspect-[3/4] max-h-[380px] border-b border-[var(--line-sub)]">
                  <img 
                    src={se.imageUrl} 
                    alt={se.title} 
                    className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                  />
                  {/* Premium Ambient Dark Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                  
                  {/* Subtle color highlight flare */}
                  <div 
                    className="absolute bottom-0 inset-x-0 h-16 opacity-30 blur-md pointer-events-none transition-opacity group-hover:opacity-60 duration-500" 
                    style={{ background: `linear-gradient(to top, ${theme.accent}, transparent)` }}
                  />
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between relative z-10 bg-gradient-to-b from-transparent to-black/20">
                  <div className="mb-6">
                    <h3 
                      className="font-display text-xl tracking-wide font-extrabold uppercase mb-3 transition-colors duration-300 group-hover:text-[var(--hover-color)] text-white"
                    >
                      {se.title}
                    </h3>
                    <p className="text-sm leading-relaxed font-sans font-normal" style={{ color: 'var(--fg-mute)' }}>
                      {se.desc}
                    </p>
                  </div>

                  {/* Beautiful custom-themed registration button */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <a
                      href={se.regUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 block text-center font-mono text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer bg-[var(--btn-bg)] hover:bg-white text-black active:scale-[0.98]"
                      style={{
                        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                        boxShadow: `0 0 10px var(--btn-glow)`,
                        ...({
                          '--btn-bg': theme.accent,
                          '--btn-glow': theme.glow,
                        } as React.CSSProperties)
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent card click conflict
                    >
                      REGISTER NOW →
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
        </div>
      ) : error ? (
        /* Hiding error visibility as per request — keeping the code commented out
        <div className="events-list-section">
          <div className="events-list">
            <Brackets tag="error" accent="red">
              <p className="lb-mono text-xs" style={{ color: 'var(--c-red)' }}>! {error}</p>
            </Brackets>
          </div>
        </div>
        */
        null
      ) : (
        <>
          {/* Featured */}
          {featured && activeTab !== 'PAST' && activeTab !== 'ONGOING' && (
            <section className="events-featured">
              <Brackets tag="featured · next_up" accent="red">
                <div className="event-feat lb-c-red">
                  <div className="event-feat-art">
                    <div className="event-feat-glyph">▶</div>
                    <div className="event-feat-tag">{featured.eventType ? `#${featured.eventType.toLowerCase().replace(/\s+/g, '_')}` : '#event'}</div>
                  </div>
                  <div>
                    <div className="event-feat-when">
                      <div><span>DATE</span><b>{formatLongDate(featured.startDate)}</b></div>
                      <div><span>TIME</span><b>{formatEventTime(featured.startDate)} IST</b></div>
                      <div><span>WHERE</span><b>{(featured.venue || featured.location || 'TBA').slice(0, 14)}</b></div>
                      <div><span>STARTS_IN</span><b style={{ color: 'var(--c-red)' }}>{startsIn(featured.startDate)}</b></div>
                    </div>
                    <h2 className="event-feat-title">{featured.title}</h2>
                    <p className="event-feat-desc">
                      {featured.shortDescription || featured.description?.slice(0, 240) || 'No description.'}
                    </p>
                    <div className="event-feat-actions">
                      <button
                        disabled={registering === featured.id || registeredEventIds.has(featured.id)}
                        onClick={() => void handleRegister(featured)}
                        className="lb-btn-primary lb-btn-lg"
                      >
                        {registeredEventIds.has(featured.id) ? '✓ REGISTERED' : registering === featured.id ? 'REGISTERING…' : 'RSVP ✓'}
                      </button>
                      <Link to={`/events/${featured.slug || featured.id}`} className="lb-btn-ghost lb-btn-lg">
                        DETAILS →
                      </Link>
                    </div>
                  </div>
                </div>
              </Brackets>
            </section>
          )}

          {/* List */}
          <section className="events-list-section">
            <div className="lb-sect-head">
              <div>
                <div className="lb-kicker">// {activeTab.toLowerCase()} · {list.length}</div>
                <h2 className="lb-section-title">UPCOMING + RECENT</h2>
              </div>
              <div className="lb-kicker-right">filter · {activeTab.toLowerCase()}</div>
            </div>

            {list.length === 0 ? (
              <div className="events-list">
                <Brackets tag="empty">
                  <p className="text-center py-6 lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                    no {activeTab === 'ALL' ? '' : activeTab.toLowerCase()} events yet · check back soon
                  </p>
                </Brackets>
              </div>
            ) : (
              <div className="events-list">
                {list.map((e, i) => {
                  const accent = ROW_ACCENTS[i % ROW_ACCENTS.length];
                  const isRegistered = registeredEventIds.has(e.id);
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link to={`/events/${e.slug || e.id}`} className={`event-row lb-c-${accent}`}>
                        <div>
                          <div className="event-row-day">{formatEventDay(e.startDate)}</div>
                          <div className="event-row-time">{formatEventTime(e.startDate)}</div>
                        </div>
                        <div className="event-row-divider" />
                        <div>
                          <div className="event-row-tag">#{e.eventType?.toLowerCase().replace(/\s+/g, '_') || 'event'}</div>
                          <div className="event-row-title">{e.title}</div>
                          <div className="event-row-desc">
                            {e.shortDescription || e.description?.slice(0, 140) || ''}
                          </div>
                        </div>
                        <div className="event-row-stats">
                          <div className="event-row-going">
                            {e.capacity ? `${e.capacity} cap` : ''} · {e.status.toLowerCase()}
                          </div>
                          <div className="event-row-host">venue · {e.venue || e.location || 'TBA'}</div>
                        </div>
                        <button
                          disabled={isRegistered || registering === e.id || e.status === 'PAST'}
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            void handleRegister(e);
                          }}
                          className="lb-btn-primary event-row-btn"
                          style={{ opacity: isRegistered || e.status === 'PAST' ? 0.5 : 1 }}
                        >
                          {e.status === 'PAST' ? 'PAST' : isRegistered ? '✓' : registering === e.id ? '…' : 'RSVP'}
                        </button>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
