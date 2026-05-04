import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PageShell } from '@/components/tesseract/PageShell';
import { Brackets } from '@/components/tesseract/Brackets';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { UserLevel } from '@/lib/api';

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = [
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'BSC', label: 'BSc' },
  { value: 'BS', label: 'BS' },
];

function branchFromEmail(email: string): string {
  const subdomain = email.split('@')[1]?.split('.')[0] ?? '';
  if (subdomain === 'ds') return 'Data Science';
  if (subdomain === 'es') return 'Electronic Systems';
  return subdomain.toUpperCase();
}

export default function OnboardingPage() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingEventId = (location.state as { pendingEventId?: string } | null)?.pendingEventId;

  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [level, setLevel] = useState<UserLevel | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branch = user?.email ? branchFromEmail(user.email) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !level) {
      setError('Please fill in all fields.');
      return;
    }
    if (!token) {
      setError('Session expired — please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateProfile(
        { name: displayName.trim(), level },
        token,
      );

      // Re-fetch the user to get the updated profile
      await login(token);

      if (pendingEventId) {
        navigate(`/events/${pendingEventId}?register=1`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      {/* Minimal nav */}
      <nav className="lb-nav">
        <Link to="/" className="lb-logo-wrap" style={{ textDecoration: 'none' }}>
          <img src="/tesseract-logo.png" alt="Tesseract" className="lb-logo" />
          <div>
            <div className="lb-wordmark">TESSERACT</div>
            <div className="lb-wordmark-sub">// auth.gate</div>
          </div>
        </Link>
      </nav>

      <section style={{
        minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          {/* Progress pills — step 3 active */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {['email', 'verify', 'join'].map((s, i) => (
              <div key={s} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                background: i === 2 ? 'rgba(168,85,247,0.12)' : i < 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 2 ? 'rgba(168,85,247,0.4)' : i < 2 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: '10px', letterSpacing: '0.12em',
                color: i === 2 ? '#a855f7' : i < 2 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                <span>{String(i + 1).padStart(2, '0')}</span> {s}
              </div>
            ))}
          </div>

          <Brackets tag="step_03 · join" accent="purple" style={{ padding: 32 }}>
            <form onSubmit={handleSubmit}>
              {/* Verified pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
                padding: '6px 14px', background: 'rgba(94,255,122,0.1)',
                border: '1px solid rgba(94,255,122,0.3)',
                fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--c-green)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-green)', boxShadow: '0 0 8px var(--c-green)', display: 'inline-block' }} />
                EMAIL VERIFIED
              </div>

              <h2 className="lb-mono" style={{ fontSize: '14px', letterSpacing: '0.1em', marginBottom: 8, color: 'var(--fg)' }}>
                ONE LAST STEP — JOIN TESSERACT
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 24 }}>
                You're verified. Set your display name and year level to become a member.
              </p>

              {error && (
                <div style={{
                  padding: '10px 14px', marginBottom: 20,
                  background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.3)',
                  color: '#ff6b6b', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace',
                }}>
                  ✗ {error}
                </div>
              )}

              <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="lb-mono" style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
                    DISPLAY NAME
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span className="lb-mono" style={{ color: 'var(--c-yellow)', padding: '10px 12px', background: 'rgba(255,217,59,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none', fontSize: '13px' }}>&gt;</span>
                    <input
                      className="t-input"
                      style={{ flex: 1 }}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="your name"
                      required
                      maxLength={80}
                    />
                  </div>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="lb-mono" style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
                    YEAR LEVEL
                  </span>
                  <select
                    className="t-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as UserLevel)}
                    required
                  >
                    <option value="" disabled>select level…</option>
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="lb-mono" style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
                    BRANCH (read-only)
                  </span>
                  <input
                    className="t-input"
                    value={branch}
                    readOnly
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="lb-btn-primary lb-btn-lg"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? '> joining…' : 'JOIN TESSERACT ▶'}
              </button>
            </form>
          </Brackets>

          {/* Footer meta */}
          <div style={{ display: 'flex', gap: 20, marginTop: 24 }}>
            {[['step', '3/3'], ['access', 'IITM only'], ['data', 'email + handle']].map(([k, v]) => (
              <div key={k} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>{k}</span>
                {' '}
                <strong style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
