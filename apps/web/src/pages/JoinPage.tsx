import { Link } from 'react-router-dom';
import { ArrowRight, Users2, Crown } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Brackets, GateBar, MetaChip } from '@/components/tesseract';
import { useSettings } from '@/context/SettingsContext';

const iconBoxStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--line-2)',
  background: 'rgba(255,217,59,0.04)',
  color: 'var(--c-yellow)',
  flexShrink: 0,
};

export default function JoinPage() {
  const { settings } = useSettings();
  const hiringOpen = settings?.hiringEnabled !== false;

  return (
    <Layout>
      <GateBar />

      <section className="lb-hero" style={{ paddingBottom: 60 }}>
        <div className="lb-hero-left">
          <div className="lb-kicker">// join.tesseract</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">PICK YOUR</span>
            <span className="lb-h-line lb-h-accent">ENTRY</span>
            <span className="lb-h-line">VECTOR.</span>
          </h1>
          <p className="lb-sub">
            Two ways in. Drop into the community as a Member for the chaos, events,
            and game nights — or apply to the Core Team to actually run the place.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <MetaChip label="STATUS" value={hiringOpen ? 'open' : 'closed'} accent={hiringOpen ? 'green' : 'red'} />
            <MetaChip label="DOMAIN" value="iitm.bs" accent="blue" />
          </div>
        </div>

        <div
          className="lb-hero-right"
          style={{ alignItems: 'stretch', flexDirection: 'column', gap: 20, minHeight: 'auto' }}
        >
          <Link to={hiringOpen ? '/join/member' : '#'} className="block group" style={{ textDecoration: 'none', pointerEvents: hiringOpen ? 'auto' : 'none', opacity: hiringOpen ? 1 : 0.55 }}>
            <Brackets tag="path_01 · member" accent="yellow">
              <div className="flex items-start gap-4">
                <div style={iconBoxStyle}>
                  <Users2 size={28} />
                </div>
                <div className="flex-1">
                  <div className="lb-kicker">// quick.join</div>
                  <h2 className="font-display uppercase text-2xl mt-1" style={{ letterSpacing: '0.04em' }}>
                    JOIN AS <span className="lb-h-accent">MEMBER</span>
                  </h2>
                  <p className="lb-sub" style={{ marginTop: 8, fontSize: 13 }}>
                    A few questions, instant access. You're in the WhatsApp community
                    by the time you close the tab.
                  </p>
                  <div className="lb-mono text-[10px] mt-3 flex items-center gap-2" style={{ color: 'var(--c-yellow)', letterSpacing: '0.12em' }}>
                    JOIN THE COMMUNITY <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Brackets>
          </Link>

          <Link to={hiringOpen ? '/join/core' : '#'} className="block group" style={{ textDecoration: 'none', pointerEvents: hiringOpen ? 'auto' : 'none', opacity: hiringOpen ? 1 : 0.55 }}>
            <Brackets tag="path_02 · core_team" accent="green">
              <div className="flex items-start gap-4">
                <div style={iconBoxStyle}>
                  <Crown size={28} />
                </div>
                <div className="flex-1">
                  <div className="lb-kicker">// build.it</div>
                  <h2 className="font-display uppercase text-2xl mt-1" style={{ letterSpacing: '0.04em' }}>
                    JOIN AS <span className="lb-h-accent">CORE MEMBER</span>
                  </h2>
                  <p className="lb-sub" style={{ marginTop: 8, fontSize: 13 }}>
                    Help run Tesseract. Pick the role you want, share your work, get
                    interviewed, then ship cool stuff with the team.
                  </p>
                  <div className="lb-mono text-[10px] mt-3 flex items-center gap-2" style={{ color: 'var(--c-green)', letterSpacing: '0.12em' }}>
                    START APPLICATION <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Brackets>
          </Link>

          {!hiringOpen && (
            <div
              className="lb-mono text-xs px-4 py-3"
              style={{ border: '1px dashed var(--line-2)', color: 'var(--fg-mute)', letterSpacing: '0.06em' }}
            >
              // hiring is currently <span style={{ color: 'var(--c-red)' }}>closed</span> — follow socials for the next intake
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
