import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useSettings } from '@/context/SettingsContext';
import { Brackets, MetaChip } from '@/components/tesseract';

export default function VerifyCertificatePage() {
  const { certId } = useParams<{ certId?: string }>();
  const { settings } = useSettings();
  const enabled = settings?.certificatesEnabled !== false;
  const navigate = useNavigate();
  const [code, setCode] = useState(certId ?? '');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().replace(/\s+/g, '').toUpperCase();
    if (!trimmed) return;
    navigate(`/verify/${trimmed}`);
  };

  return (
    <Layout>
      <section className="lb-hero">
        <div className="lb-hero-left">
          <div className="lb-kicker">// certificate.verify</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">PROOF OF</span>
            <span className="lb-h-line lb-h-accent">PARTICIPATION.</span>
          </h1>
          <p className="lb-sub">
            Paste a certificate ID to verify it was issued by Tesseract. Each cert has a unique
            12-character code printed at the bottom of the PDF.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <MetaChip label="STATUS" value={enabled ? 'live' : 'disabled'} accent={enabled ? 'green' : 'red'} />
            <MetaChip label="FORMAT" value="ABCD-EFGH-IJKL" accent="yellow" />
            <MetaChip label="ISSUED_BY" value="tesseract" accent="purple" />
          </div>
        </div>

        <div className="lb-hero-right" style={{ flexDirection: 'column', minHeight: 'auto', alignItems: 'stretch', gap: 16 }}>
          <Brackets tag="verify.lookup" accent={enabled ? 'yellow' : 'red'}>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4" style={{ color: enabled ? 'var(--c-yellow)' : 'var(--c-red)' }} />
                <span className="lb-mono text-xs" style={{ letterSpacing: '0.1em' }}>
                  {enabled ? 'CERTIFICATE LOOKUP' : 'VERIFICATION DISABLED'}
                </span>
              </div>

              {enabled ? (
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                  <div className="t-field">
                    <label className="t-label">CERTIFICATE ID</label>
                    <input
                      className="t-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="ABCD-EFGH-IJKL"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="lb-btn-primary lb-btn-lg w-full justify-center">
                    VERIFY <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p style={{ textTransform: 'none', letterSpacing: 0, lineHeight: 1.5 }}>
                    Certificate generation has been disabled by an admin. Contact the team if you
                    believe this is a mistake.
                  </p>
                </div>
              )}
            </div>
          </Brackets>

          {certId && (
            <Brackets tag="result · pending" accent="purple">
              <div className="flex flex-col gap-2">
                <span className="lb-mono text-xs" style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
                  // looking up
                </span>
                <code
                  className="lb-mono text-sm"
                  style={{ color: 'var(--c-yellow)', letterSpacing: '0.1em' }}
                >
                  {certId}
                </code>
                <p className="text-xs" style={{ color: 'var(--fg-dim)' }}>
                  Public verification API not yet wired. The cert ID will be checked against the
                  certificate registry when the verify endpoint goes live.
                </p>
                <p className="lb-mono text-[10px]" style={{ color: 'var(--fg-mute)' }}>
                  // TODO(backend): GET /api/certificates/verify/:certId
                </p>
              </div>
            </Brackets>
          )}

          <Link to="/" className="lb-mono text-xs self-start mt-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
            ← back to landing
          </Link>
        </div>
      </section>
    </Layout>
  );
}
