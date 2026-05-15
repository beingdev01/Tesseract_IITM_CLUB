import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Brackets, TesseractHero, GateBar, MetaChip } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: 'Google authentication failed. Try again.',
  google_not_configured: 'Google Sign-In is not configured on this server.',
  invalid_domain: 'Only @ds.study.iitm.ac.in and @es.study.iitm.ac.in accounts are allowed.',
  invalid_oauth_callback: 'OAuth callback was invalid. Try again.',
};

export default function SignInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? `Auth error: ${errorParam}` : null;

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = () => {
    window.location.href = api.getGoogleOAuthUrl();
  };

  return (
    <Layout>
      <GateBar />

      <section className="lb-hero" style={{ paddingBottom: 60 }}>
        {/* LEFT — quote + hypercube */}
        <div className="lb-hero-left">
          <div className="lb-kicker">// auth.gate</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">ONE DOOR.</span>
            <span className="lb-h-line lb-h-accent">INSTITUTE</span>
            <span className="lb-h-line">EMAIL ONLY.</span>
          </h1>
          <p className="lb-sub">
            Sign in with your @ds or @es Google account. One click. No passwords,
            no external logins, no scraping. Admins are bootstrapped via SEED_ADMIN_EMAIL on first OAuth login.
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            <MetaChip label="STEP" value="1/3" accent="yellow" />
            <MetaChip label="ACCESS" value="restricted" accent="green" />
            <MetaChip label="DOMAIN" value="iitm.ac.in" accent="blue" />
          </div>
        </div>

        {/* RIGHT — auth card */}
        <div className="lb-hero-right" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 24, minHeight: 'auto' }}>
          {/* Step pills */}
          <div className="flex gap-2 flex-wrap" style={{ width: '100%' }}>
            {[
              { n: '01', label: 'verify email', active: true },
              { n: '02', label: 'gate check', active: false },
              { n: '03', label: 'enter', active: false },
            ].map((s) => (
              <div
                key={s.n}
                className="lb-mono text-[10px] px-3 py-1.5 inline-flex items-center gap-2"
                style={{
                  border: `1px solid ${s.active ? 'var(--c-yellow)' : 'var(--line)'}`,
                  background: s.active ? 'rgba(255,217,59,0.08)' : 'transparent',
                  color: s.active ? 'var(--c-yellow)' : 'var(--fg-mute)',
                  letterSpacing: '0.12em',
                }}
              >
                <span style={{ fontWeight: 600 }}>{s.n}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Hypercube + ring */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
            <div className="lb-viz-ring" style={{ width: 380, height: 380, opacity: 0.18 }} />
            <TesseractHero size={280} speed={0.7} glow />
          </div>

          {/* Google sign-in card */}
          <Brackets tag="step_01 · google_oauth" accent="green" className="w-full">
            <div className="font-display uppercase text-base mb-2" style={{ letterSpacing: '0.06em' }}>
              CONTINUE WITH <span className="lb-h-accent">GOOGLE</span>
            </div>
            <p className="lb-sub" style={{ fontSize: 13, marginBottom: 16, marginTop: 0 }}>
              Pick your IITM Google account. We verify the domain server-side. Non-IITM accounts get bounced.
            </p>

            {errorMessage && (
              <div
                className="lb-mono text-xs mb-4 px-3 py-2 flex items-start gap-2"
                style={{
                  color: 'var(--c-red)',
                  border: '1px solid var(--c-red)',
                  background: 'rgba(255,87,87,0.08)',
                }}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="lb-btn-primary lb-btn-lg w-full justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="currentColor" />
              </svg>
              CONTINUE WITH GOOGLE
            </button>

            <div className="grid grid-cols-1 gap-2 mt-4 lb-mono text-xs">
              <DomainPill ok>@ds.study.iitm.ac.in</DomainPill>
              <DomainPill ok>@es.study.iitm.ac.in</DomainPill>
              <DomainPill>everything else · denied</DomainPill>
            </div>
          </Brackets>

          <p className="lb-mono text-[10px] mt-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
            // by signing in you agree to{' '}
            <Link to="/privacy-policy" style={{ color: 'var(--c-yellow)', textDecoration: 'underline' }}>privacy.policy</Link>
          </p>
        </div>
      </section>
    </Layout>
  );
}

function DomainPill({ children, ok = false }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{
        border: `1px solid ${ok ? 'var(--c-green)' : 'rgba(255,87,87,0.4)'}`,
        background: ok ? 'rgba(94,255,122,0.06)' : 'rgba(255,87,87,0.04)',
        color: ok ? 'var(--c-green)' : 'var(--c-red)',
        letterSpacing: '0.04em',
      }}
    >
      <span>{ok ? '✓' : '✗'}</span>
      <span style={{ textDecoration: ok ? 'none' : 'line-through' }}>{children}</span>
    </div>
  );
}
