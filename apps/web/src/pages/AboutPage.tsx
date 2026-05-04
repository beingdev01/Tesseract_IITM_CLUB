import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Brackets, MetaChip, TesseractHero, GateBar, type Accent } from '@/components/tesseract';

const STATS: Array<{ label: string; value: string; accent: Accent }> = [
  { label: 'FOUNDED', value: '2024', accent: 'yellow' },
  { label: 'MEMBERS', value: '1,247', accent: 'red' },
  { label: 'EVENTS', value: '07/mo', accent: 'green' },
  { label: 'GAMES', value: '18', accent: 'blue' },
  { label: 'BRANCHES', value: '@ds · @es', accent: 'purple' },
];

const PRINCIPLES: Array<{ tag: string; accent: Accent; title: string; body: string }> = [
  { tag: '01 · MISSION', accent: 'yellow', title: 'BUILT BY STUDENTS.', body: 'Tesseract is a student-run community for IITM BS. We build the community we wished existed: zero-pressure spaces to play, learn, and meet people who get it.' },
  { tag: '02 · VISION', accent: 'blue', title: 'PLAY MAKES PEOPLE.', body: 'Mini-games, movie nights, and esports ladders are the social glue between lectures. Every interaction is a chance to make a friend, a study partner, or a co-conspirator on the next project.' },
  { tag: '03 · STORY', accent: 'purple', title: 'ORIGIN_LOOP.', body: 'Started as a Discord server with five people who wanted to play Smash Kart between exams. Grew into a community that runs weekly tournaments, hosts movie nights, and ships its own games.' },
];

export default function AboutPage() {
  return (
    <Layout>
      <SEO
        title="About — Tesseract"
        description="Tesseract is the student-built community for IITM BS. Mini-games, movie nights, esports ladders, and the people who make assignments bearable."
        url="/about"
      />

      <GateBar />

      {/* Hero */}
      <section className="lb-hero">
        <div className="lb-hero-left">
          <div className="lb-hero-label">&gt; loading manifesto…</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">WHO WE</span>
            <span className="lb-h-line lb-h-accent">ARE.</span>
          </h1>
          <p className="lb-sub">
            Tesseract is the IITM BS student community. A Discord, a calendar, a leaderboard,
            and a few hundred people who wanted somewhere to belong while doing a degree online.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {STATS.map((s) => (
              <MetaChip key={s.label} label={s.label} value={s.value} accent={s.accent} />
            ))}
          </div>
        </div>

        <motion.div
          className="lb-hero-right"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="lb-viz-ring" />
          <TesseractHero size={360} speed={0.7} glow />
          <div className="lb-viz-caption">manifesto · v1</div>
        </motion.div>
      </section>

      {/* Principles */}
      <section className="lb-modules">
        <div className="lb-sect-head">
          <div>
            <div className="lb-kicker">// principles</div>
            <h2 className="lb-section-title">WHAT WE BELIEVE</h2>
          </div>
          <div className="lb-kicker-right">3 of 3</div>
        </div>
        <div className="lb-module-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.tag}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`lb-module-wrap lb-c-${p.accent}`}
            >
              <Brackets tag={p.tag} accent={p.accent}>
                <div className="lb-module">
                  <h3 className="lb-module-title">{p.title}</h3>
                  <p className="lb-module-desc">{p.body}</p>
                  <div className="lb-module-link">// continued ↓</div>
                </div>
              </Brackets>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Manifesto */}
      <section className="lb-board-section">
        <Brackets tag="manifesto.txt" accent="yellow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-2">
            <div>
              <div className="lb-kicker">// values</div>
              <h2 className="font-display uppercase text-3xl mt-2 mb-6" style={{ letterSpacing: '0.04em' }}>
                THE <span className="lb-h-accent">RULES</span> WE PLAY BY.
              </h2>
              <ul className="lb-mono text-sm space-y-3" style={{ color: 'var(--fg-dim)', letterSpacing: '0.03em', textTransform: 'none' }}>
                <li><span style={{ color: 'var(--c-yellow)' }}>01.</span> Institute email only — @ds, @es. No outsiders.</li>
                <li><span style={{ color: 'var(--c-green)' }}>02.</span> Free — zero ads, zero subscriptions, zero scraping.</li>
                <li><span style={{ color: 'var(--c-blue)' }}>03.</span> Open — built in public, code on GitHub, board public.</li>
                <li><span style={{ color: 'var(--c-purple)' }}>04.</span> Play first — fun before features. Pace yourself.</li>
                <li><span style={{ color: 'var(--c-red)' }}>05.</span> No bots, no spam, no harassment — receipts get banned.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="lb-kicker">// not_for</div>
              <h3 className="font-display uppercase text-2xl" style={{ letterSpacing: '0.04em' }}>WHO IT'S NOT FOR.</h3>
              <p className="lb-sub" style={{ marginTop: 8 }}>
                Came here to recruit, sell something, or scrape contact info — wrong door.
                Tesseract is for active students of IITM BS who want a place to hang out, host events,
                and goof off responsibly between assignments.
              </p>
              <p className="lb-mono text-xs" style={{ color: 'var(--fg-mute)', letterSpacing: '0.05em' }}>
                // ext_users · access_denied
              </p>
            </div>
          </div>
        </Brackets>
      </section>
    </Layout>
  );
}
