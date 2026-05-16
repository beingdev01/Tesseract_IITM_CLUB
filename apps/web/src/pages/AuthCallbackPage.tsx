import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Brackets, TesseractHero, PageShell, GateBar } from '@/components/tesseract';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Completing sign in…');
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    let timeout: number | null = null;

    const run = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const token =
          hashParams.get('token') ||
          searchParams.get('token') ||
          await (async () => {
            const code = searchParams.get('code');
            if (!code) return null;
            const exchange = await api.exchangeAuthCode(code);
            return exchange.token;
          })();

        const errorParam = searchParams.get('error');
        if (errorParam) {
          navigate('/signin?error=' + errorParam);
          return;
        }

        if (!token) {
          navigate('/signin?error=invalid_oauth_callback');
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        const user = await login(token);

        setStatus('Checking profile…');

        // If level is missing, send to onboarding
        if (!user.level) {
          const pendingEventId = localStorage.getItem('pendingEventRegistration');
          navigate('/onboarding', { state: { pendingEventId } });
          return;
        }

        // Check for pending event registration
        const pendingEventId = localStorage.getItem('pendingEventRegistration');
        const pendingEventType = localStorage.getItem('pendingEventRegistrationType');
        if (pendingEventId) {
          setStatus('Redirecting to event…');
          localStorage.removeItem('pendingEventRegistration');
          localStorage.removeItem('pendingEventRegistrationType');
          navigate(
            pendingEventType === 'team'
              ? `/events/${pendingEventId}`
              : `/events/${pendingEventId}?register=1`
          );
          return;
        }

        // Honor ?next= stashed by SignInPage before OAuth handoff
        const stashedNext = sessionStorage.getItem('tesseract_post_signin_next');
        if (stashedNext && stashedNext.startsWith('/') && !stashedNext.startsWith('//')) {
          sessionStorage.removeItem('tesseract_post_signin_next');
          setStatus('Returning to where you were…');
          navigate(stashedNext, { replace: true });
          return;
        }

        setStatus('Welcome back.');
        navigate('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        timeout = window.setTimeout(() => navigate('/signin'), 2500);
      }
    };

    run();
    return () => { if (timeout) window.clearTimeout(timeout); };
  }, []);

  return (
    <PageShell>
      <GateBar />
      <div style={{ minHeight: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-3xl w-full">
          <div className="flex justify-center">
            <TesseractHero size={220} speed={error ? 0.4 : 1} glow />
          </div>
          <Brackets tag="auth.callback" accent={error ? 'red' : 'green'}>
            {error ? (
              <div className="text-center py-2">
                <div className="font-display uppercase text-3xl mb-2" style={{ color: 'var(--c-red)', letterSpacing: '0.04em' }}>
                  ✗ AUTH FAIL
                </div>
                <p className="lb-mono text-xs mb-3" style={{ color: 'var(--fg-dim)', letterSpacing: '0.05em' }}>
                  {error}
                </p>
                <p className="lb-mono text-[10px]" style={{ color: 'var(--fg-mute)', letterSpacing: '0.15em' }}>
                  // redirecting to /signin…
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="lb-pulse" />
                  <span className="lb-mono ts-blink" style={{ color: 'var(--c-green)', fontSize: 12, letterSpacing: '0.15em' }}>
                    {status.toUpperCase()}
                  </span>
                </div>
                <div className="font-display uppercase text-2xl" style={{ letterSpacing: '0.04em' }}>
                  AUTHENTICATING<span className="lb-h-accent">…</span>
                </div>
                <p className="lb-mono text-[10px] mt-3" style={{ color: 'var(--fg-mute)', letterSpacing: '0.15em' }}>
                  // verifying institute domain
                </p>
              </div>
            )}
          </Brackets>
        </div>
      </div>
    </PageShell>
  );
}
