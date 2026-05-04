import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/ui/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Linkedin, Twitter, Instagram, Globe, Loader2, type LucideIcon } from 'lucide-react';
import { api, type TeamMember } from '@/lib/api';
import { Brackets, Pill, type Accent } from '@/components/tesseract';

const TEAM_ACCENTS: Accent[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
};

export default function TeamPage() {
  const [activeTeam, setActiveTeam] = useState('All');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getTeam(undefined, { compact: true });
        setTeamMembers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setLoading(false);
      }
    };
    void fetchTeam();
  }, []);

  const teams = useMemo(() => ['All', ...Array.from(new Set(teamMembers.map((m) => m.team)))], [teamMembers]);

  const filteredMembers = useMemo(
    () => (activeTeam === 'All' ? teamMembers : teamMembers.filter((m) => m.team === activeTeam)),
    [teamMembers, activeTeam],
  );

  return (
    <Layout>
      <SEO
        title="Members — Tesseract"
        description="Meet the people building Tesseract — the IITM BS student community."
        url="/team"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
        { name: 'Members', url: 'https://tesseract.iitm.ac.in/team' },
      ]} />

      {/* Hero */}
      <section className="lb-hero" style={{ paddingBottom: 40 }}>
        <div className="lb-hero-left" style={{ minWidth: 0 }}>
          <div className="lb-kicker">// the.crew</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">BUILT BY</span>
            <span className="lb-h-line lb-h-accent">STUDENTS.</span>
          </h1>
          <p className="lb-sub">
            {teamMembers.length} member{teamMembers.length === 1 ? '' : 's'} run Tesseract — events, games, ladders, the lot.
            All current students. No outsiders. No staff.
          </p>
          {teams.length > 2 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {teams.map((t, i) => (
                <Pill
                  key={t}
                  active={activeTeam === t}
                  accent={TEAM_ACCENTS[i % TEAM_ACCENTS.length]}
                  onClick={() => setActiveTeam(t)}
                >
                  {t.toLowerCase()}
                </Pill>
              ))}
            </div>
          )}
        </div>
        <div className="lb-hero-right" style={{ minHeight: 200 }}>
          {/* visual filler */}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
        </div>
      ) : error ? (
        <section className="lb-modules">
          <div className="lb-module-grid">
            <Brackets tag="error" accent="red">
              <p className="lb-mono text-xs" style={{ color: 'var(--c-red)' }}>! {error}</p>
            </Brackets>
          </div>
        </section>
      ) : (
        <section className="lb-modules">
          <div className="lb-sect-head">
            <div>
              <div className="lb-kicker">// {activeTeam.toLowerCase()} · {filteredMembers.length}</div>
              <h2 className="lb-section-title">CREW INDEX</h2>
            </div>
            <div className="lb-kicker-right">filter · {activeTeam.toLowerCase()}</div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTeam}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lb-module-grid"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {filteredMembers.map((member, i) => {
                const accent = TEAM_ACCENTS[i % TEAM_ACCENTS.length];
                const initial = member.name?.charAt(0)?.toUpperCase() || '?';
                const socials: Array<{ key: string; href?: string }> = [
                  { key: 'github', href: member.github },
                  { key: 'linkedin', href: member.linkedin },
                  { key: 'twitter', href: member.twitter },
                  { key: 'instagram', href: member.instagram },
                ].filter((s) => s.href);

                const slugOrId = member.slug || member.id;
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className={`lb-module-wrap lb-c-${accent}`}
                  >
                    <Link to={`/team/${slugOrId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <Brackets tag={`mem.${String(i + 1).padStart(2, '0')}`} accent={accent}>
                        <div className="lb-module" style={{ minHeight: 280 }}>
                          {/* Avatar */}
                          <div
                            className={`lb-hatch lb-c-${accent}`}
                            style={{ height: 120, marginBottom: 14, position: 'relative' }}
                          >
                            {member.imageUrl ? (
                              <img
                                src={member.imageUrl}
                                alt={member.name}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="lb-hatch-glyph" style={{ fontSize: 56 }}>{initial}</div>
                            )}
                          </div>
                          <div className="lb-mono text-[10px] uppercase" style={{ color: `var(--c-${accent === 'red' ? 'red' : accent === 'yellow' ? 'yellow' : accent === 'green' ? 'green' : accent === 'blue' ? 'blue' : accent === 'purple' ? 'purple' : 'orange'})`, letterSpacing: '0.15em', marginBottom: 6 }}>
                            #{member.team.toLowerCase().replace(/\s+/g, '_')}
                          </div>
                          <h3 className="lb-module-title" style={{ fontSize: 18 }}>{member.name}</h3>
                          <p className="lb-mono text-xs" style={{ color: 'var(--fg-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {member.role}
                          </p>

                          {socials.length > 0 && (
                            <div className="flex gap-2 mt-auto pt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                              {socials.map((s) => {
                                const Icon = SOCIAL_ICONS[s.key] ?? Globe;
                                return (
                                  <a
                                    key={s.key}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={s.key}
                                    style={{ color: 'var(--fg-dim)' }}
                                    className="hover:!text-white transition-colors"
                                  >
                                    <Icon className="h-4 w-4" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          <div className="lb-module-link" style={{ marginTop: socials.length === 0 ? 'auto' : 12, paddingTop: socials.length === 0 ? 12 : 0, borderTop: socials.length === 0 ? '1px dashed var(--line)' : 'none' }}>
                            VIEW PROFILE →
                          </div>
                        </div>
                      </Brackets>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {filteredMembers.length === 0 && (
            <div className="lb-module-grid" style={{ marginTop: 24 }}>
              <Brackets tag="empty" accent="yellow">
                <p className="text-center py-6 lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                  no members in this team
                </p>
              </Brackets>
            </div>
          )}
        </section>
      )}
    </Layout>
  );
}
