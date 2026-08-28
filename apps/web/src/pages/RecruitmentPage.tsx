/**
 * PARKED — not currently routed.
 *
 * /recruitment is served as a standalone static page
 * (apps/web/public/recruitment.html) while the API free tier is capped, so
 * applications go to the Google Form and need no backend.
 *
 * This page is the in-app version: the same content wired to the real hiring
 * flow, writing CORE applications to the database. It is kept here (and still
 * type-checked) so recruitment can be handed back to it. To restore:
 *   1. apps/web/src/App.tsx — re-add the lazy import and point the
 *      /recruitment route at wrap(<RecruitmentPage />) instead of
 *      StaticRecruitmentRedirect.
 *   2. render.yaml — drop the two /recruitment rewrites.
 *   3. apps/web/src/components/layout/Header.tsx — remove `static: true` from
 *      the recruitment NAV_ITEMS entry; Footer.tsx — put the <Link> back.
 */
import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Brackets, GateBar, MetaChip } from '@/components/tesseract';
import { CoreApplicationForm } from '@/components/join/CoreApplicationForm';
import { useSettings } from '@/context/SettingsContext';
import type { CoreRole } from '@/lib/api';
import {
  DOMAINS,
  EXPERTISE_TRACKS,
  FALLBACK_WHATSAPP_URL,
  WING_CATALOG,
  WING_FILTERS,
  WING_NAVIGATOR,
  type WingFilter,
} from './recruitment/_wings';

const DESCRIPTION =
  'Roles and responsibilities at Tesseract, the official Esports Society of the IIT Madras BS Program. Explore the 8 recruitment wings and apply to the Core Team.';

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  // Focus the destination before scrolling: keyboard users land where sighted users
  // do, and the browser stops trying to scroll the clicked button back into view
  // (which otherwise overshoots the smooth scroll). Targets carry tabIndex={-1}.
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function RecruitmentPage() {
  const { settings } = useSettings();
  const [filter, setFilter] = useState<WingFilter | 'all'>('all');
  const [selectedWings, setSelectedWings] = useState<CoreRole[]>([]);

  const whatsappUrl = settings?.whatsappCommunityUrl || FALLBACK_WHATSAPP_URL;

  const visibleWings = useMemo(
    () => (filter === 'all' ? WING_CATALOG : WING_CATALOG.filter((w) => w.filter === filter)),
    [filter],
  );

  /** Pre-tick the wing on the application form, then scroll down to it. */
  const applyForWing = useCallback((role: CoreRole) => {
    setSelectedWings((prev) => (prev.includes(role) ? prev : [...prev, role]));
    scrollToId('apply');
  }, []);

  return (
    <Layout>
      <SEO title="Recruitment — Tesseract" description={DESCRIPTION} url="/recruitment" />

      <GateBar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="lb-hero" style={{ paddingBottom: 48 }}>
        <div className="lb-hero-left">
          <div className="lb-hero-label">&gt; core team recruitment · 2026</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">ROLES &amp;</span>
            <span className="lb-h-line lb-h-accent">RESPONSIBILITIES.</span>
          </h1>
          <p className="lb-sub">
            Tesseract is the <strong>official Esports Society of the IIT Madras BS Program</strong>.
            We are assembling leaders, creators, casters, strategists, organizers, and developers
            to build the ultimate competitive &amp; gaming ecosystem.
          </p>

          <div className="lb-cta-row">
            <button type="button" onClick={() => scrollToId('apply')} className="lb-btn-primary lb-btn-lg">
              ▶ APPLY FOR CORE TEAM
            </button>
            <button type="button" onClick={() => scrollToId('wings')} className="lb-btn-ghost lb-btn-lg">
              {'// explore 8 wings'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-2">
            <MetaChip label="WINGS" value="08" accent="red" />
            <MetaChip label="DOMAINS" value="03" accent="blue" />
            <MetaChip label="OPEN TO" value="all BS students" accent="green" />
            <MetaChip label="ACTION" value="365 days" accent="yellow" />
          </div>
        </div>

        <div className="lb-hero-right" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 16, minHeight: 'auto' }}>
          <Brackets tag="recruitment.manifest" accent="red">
            <div className="lb-telemetry">
              <div className="lb-tel-row">
                <span className="lb-tel-k">recruitment_wings</span>
                <span className="lb-tel-v">08</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">core_domains</span>
                <span className="lb-tel-v">03</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">open_to_all_bs</span>
                <span className="lb-tel-v">100%</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">year_round_action</span>
                <span className="lb-tel-v">365</span>
              </div>
              <div className="lb-tel-row">
                <span className="lb-tel-k">prior_experience</span>
                <span className="lb-tel-v">not required</span>
              </div>
            </div>
          </Brackets>
        </div>
      </section>

      {/* ── What is Tesseract? + the 3 domains ───────────────────────────── */}
      <section className="lb-modules" id="about">
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// foundation &amp; identity</div>
            <h2 className="lb-section-title">WHAT IS TESSERACT?</h2>
          </div>
          <div className="lb-kicker-right">3 domains</div>
        </div>

        <div style={{ padding: '0 40px', maxWidth: 900, marginBottom: 28 }}>
          <p className="lb-sub">
            Tesseract is the official Esports Society of the IIT Madras BS Program, built around
            competitive esports, casual gaming, mind games, puzzles, strategy, and community. What
            started as a small gaming community has grown into a recognized society focused on
            creating an active ecosystem where students can compete, create, organize, collaborate,
            and have fun.
          </p>
        </div>

        <div className="lb-module-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {DOMAINS.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.08 }}
              className={`lb-module-wrap lb-c-${d.accent}`}
            >
              <Brackets tag={d.title.toLowerCase().replace(/[^a-z]+/g, '_')} accent={d.accent}>
                <div className="lb-module">
                  <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 12 }} aria-hidden>{d.icon}</div>
                  <h3 className="lb-module-title">{d.title}</h3>
                  <p className="lb-module-desc">{d.body}</p>
                  <TagRow tags={d.tags} />
                </div>
              </Brackets>
            </motion.div>
          ))}
        </div>

        {/* The Tesseract formula */}
        <div style={{ padding: '28px 40px 0' }}>
          <Brackets tag="the_tesseract_formula" accent="yellow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="lb-kicker">// the formula</div>
                <p className="font-display uppercase text-lg sm:text-xl mt-1" style={{ letterSpacing: '0.04em' }}>
                  ESPORTS + GAMING + MIND GAMES + PUZZLES + STRATEGY + COMMUNITY
                </p>
              </div>
              <button type="button" onClick={() => scrollToId('wings')} className="lb-btn-ghost" style={{ whiteSpace: 'nowrap' }}>
                EXPLORE WINGS →
              </button>
            </div>
          </Brackets>
        </div>
      </section>

      {/* ── The 8 recruitment wings ──────────────────────────────────────── */}
      <section className="lb-modules" id="wings" tabIndex={-1} style={{ outline: 'none' }}>
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// join the team behind tesseract</div>
            <h2 className="lb-section-title">THE 8 RECRUITMENT WINGS</h2>
          </div>
          <div className="lb-kicker-right">{visibleWings.length} of {WING_CATALOG.length}</div>
        </div>

        <div style={{ padding: '0 40px', maxWidth: 900, marginBottom: 20 }}>
          <p className="lb-sub">
            Tesseract's operations are divided across 8 wings. Choose the domain where you want to
            lead, create, manage, or learn.
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ padding: '0 40px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {WING_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`lb-pill${filter === f.value ? ' active' : ''}`}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="lb-module-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {visibleWings.map((w) => (
            <motion.div
              key={w.id}
              id={w.id}
              tabIndex={-1}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`lb-module-wrap lb-c-${w.accent}`}
              style={{ scrollMarginTop: 96, outline: 'none' }}
            >
              <Brackets tag={`wing ${w.num} · ${w.category.toLowerCase()}`} accent={w.accent}>
                <div className="lb-module" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="lb-module-title">{w.name}</h3>
                    <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden>{w.icon}</span>
                  </div>

                  <p className="lb-module-desc">{w.blurb}</p>

                  {w.games && (
                    <>
                      <SubLabel>🎮 games covered</SubLabel>
                      <TagRow tags={w.games} />
                    </>
                  )}

                  <SubLabel>available roles</SubLabel>
                  <TagRow tags={w.positions} strong />

                  <SubLabel>what you will do</SubLabel>
                  <ul className="space-y-2" style={{ color: 'var(--fg-dim)', fontSize: 13, marginTop: 4 }}>
                    {w.duties.map((d) => (
                      <li key={d} className="flex items-start gap-2">
                        <span aria-hidden style={{ color: `var(--c-${w.accent})`, flexShrink: 0 }}>▸</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => applyForWing(w.role)}
                    className="lb-btn-ghost"
                    style={{ marginTop: 'auto', paddingTop: 10, width: '100%', justifyContent: 'center' }}
                  >
                    APPLY FOR {w.name} →
                  </button>
                </div>
              </Brackets>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Find your wing ───────────────────────────────────────────────── */}
      <section className="lb-modules" id="matcher">
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// quick navigator</div>
            <h2 className="lb-section-title">FIND YOUR WING</h2>
          </div>
          <div className="lb-kicker-right">8 shortcuts</div>
        </div>

        <div style={{ padding: '0 40px', maxWidth: 900, marginBottom: 20 }}>
          <p className="lb-sub">Pick your primary interest to jump straight to the matching wing:</p>
        </div>

        <div
          style={{
            padding: '0 40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {WING_NAVIGATOR.map((n) => (
            <button
              key={n.target}
              type="button"
              onClick={() => {
                // The target may be filtered out — show every wing, then jump once
                // the grid has re-rendered with it in place.
                setFilter('all');
                requestAnimationFrame(() => scrollToId(n.target));
              }}
              className={`lb-c-${n.accent}`}
              style={{
                border: '1px solid var(--line)',
                background: 'transparent',
                padding: '16px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--fg)',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(--c-${n.accent})`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
            >
              <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }} aria-hidden>{n.icon}</span>
              <span className="lb-mono" style={{ fontSize: 11, letterSpacing: '0.06em', display: 'block' }}>
                {n.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── You don't have to be an expert ───────────────────────────────── */}
      <section className="lb-board-section">
        <Brackets tag="culture.txt" accent="yellow">
          <div className="lb-kicker">// no gatekeeping</div>
          <h2 className="font-display uppercase text-2xl sm:text-4xl mt-2 mb-4" style={{ letterSpacing: '0.04em' }}>
            YOU DON'T HAVE TO BE AN <span className="lb-h-accent">EXPERT.</span>
          </h2>
          <p className="lb-sub mb-6">
            Tesseract isn't looking only for professional gamers, experienced developers, seasoned
            designers, or veteran organizers. We are looking for students who want to build.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {EXPERTISE_TRACKS.map((t) => (
              <div
                key={t.title}
                className={`lb-c-${t.accent}`}
                style={{ border: '1px solid var(--line)', padding: 16, borderLeft: `2px solid var(--c-${t.accent})` }}
              >
                <div className="lb-mono" style={{ fontSize: 12, color: `var(--c-${t.accent})`, marginBottom: 6 }}>
                  ✦ {t.title}
                </div>
                <p style={{ fontSize: 13, color: 'var(--fg-dim)' }}>{t.body}</p>
              </div>
            ))}
          </div>

          <p className="text-sm" style={{ color: 'var(--fg)' }}>
            What matters most is your <span style={{ color: 'var(--c-blue)' }}>interest</span>,{' '}
            <span style={{ color: 'var(--c-red)' }}>initiative</span>,{' '}
            <span style={{ color: 'var(--c-yellow)' }}>willingness to learn</span>, and willingness
            to take ownership.
          </p>
        </Brackets>
      </section>

      {/* ── The application ──────────────────────────────────────────────── */}
      <section id="apply" tabIndex={-1} className="max-w-3xl mx-auto px-4 sm:px-6 py-10" style={{ scrollMarginTop: 80, outline: 'none' }}>
        <CoreApplicationForm
          presetRoles={selectedWings}
          signInNext="/recruitment"
          redirectWhenSignedOut={false}
          kicker="// step.into.the.arena"
          bracketTag="form · core_team.recruitment"
          heading={<>BUILD TESSERACT <span className="lb-h-accent">WITH US.</span></>}
          intro="If you want to play, organize, create, compete, broadcast, build or lead — there's a place for you here. Pick your wing, tell us what you'd bring, and we'll take it from there."
        />
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="lb-board-section">
        <Brackets tag="community.link" accent="green">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="lb-kicker">// not ready to apply yet?</div>
              <p className="lb-sub" style={{ marginTop: 6 }}>
                Hop into the community first. Meet the people, play a few nights, then come back
                and pick a wing.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lb-btn-ghost lb-btn-lg"
              style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              💬 JOIN WHATSAPP COMMUNITY
            </a>
          </div>
        </Brackets>
      </section>
    </Layout>
  );
}

// ── small presentational helpers ───────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="lb-mono"
      style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginTop: 16, marginBottom: 6 }}
    >
      {children}
    </div>
  );
}

function TagRow({ tags, strong }: { tags: string[]; strong?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="lb-mono"
          style={{
            fontSize: 11,
            padding: '3px 8px',
            border: '1px solid var(--line)',
            color: strong ? 'var(--fg)' : 'var(--fg-dim)',
            background: strong ? 'var(--acc-glow, transparent)' : 'transparent',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
