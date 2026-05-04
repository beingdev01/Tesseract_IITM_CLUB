import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Award, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/lib/api';
import { Brackets, MetaChip, type Accent } from '@/components/tesseract';

interface CertificateLite {
  id: string;
  certId: string;
  recipientName: string;
  eventName?: string | null;
  type?: string;
  issuedAt?: string;
  pdfUrl?: string | null;
  isRevoked?: boolean;
}

const TYPE_ACCENTS: Record<string, Accent> = {
  PARTICIPATION: 'blue',
  COMPLETION: 'green',
  WINNER: 'yellow',
  SPEAKER: 'purple',
};

export default function DashboardCertificates() {
  const { token } = useAuth();
  const { settings } = useSettings();
  const enabled = settings?.certificatesEnabled !== false;

  const [items, setItems] = useState<CertificateLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getMyCertificates(token, { limit: 50 });
        if (cancelled) return;
        setItems((res.certificates as CertificateLite[]) ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load certificates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  if (!enabled) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <div className="lb-kicker">// dashboard.certificates</div>
          <h1 className="font-display uppercase text-3xl mt-2" style={{ letterSpacing: '0.04em' }}>
            CERTIFICATES <span className="lb-h-accent">DISABLED.</span>
          </h1>
        </div>
        <Brackets tag="status · disabled" accent="red">
          <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">CERTIFICATE GENERATION DISABLED</div>
              <p
                className="text-[11px]"
                style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}
              >
                Admin has disabled certificate issuance. New certificates won't appear here until it's re-enabled.
              </p>
            </div>
          </div>
        </Brackets>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="lb-kicker">// dashboard.certificates</div>
        <h1 className="font-display uppercase text-[clamp(28px,4vw,40px)] mt-2 leading-tight" style={{ letterSpacing: '0.04em' }}>
          YOUR <span className="lb-h-accent">CERTIFICATES.</span>
        </h1>
        <p className="lb-sub mt-2">
          {items.length} certificate{items.length === 1 ? '' : 's'} issued · download as PDF or share the verify link.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <MetaChip label="ISSUED" value={items.length} accent="yellow" />
        <MetaChip label="ACTIVE" value={items.filter((c) => !c.isRevoked).length} accent="green" />
        <MetaChip label="REVOKED" value={items.filter((c) => c.isRevoked).length} accent="red" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
        </div>
      ) : error ? (
        <Brackets tag="error" accent="red">
          <p className="lb-mono text-xs" style={{ color: 'var(--c-red)' }}>! {error}</p>
        </Brackets>
      ) : items.length === 0 ? (
        <Brackets tag="empty" accent="yellow">
          <div className="text-center py-6">
            <Award className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--fg-mute)' }} />
            <p className="lb-mono text-xs uppercase mb-3" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              no certificates yet
            </p>
            <p className="text-xs" style={{ color: 'var(--fg-dim)', maxWidth: 360, margin: '0 auto' }}>
              Attend events that issue certificates and they'll show up here.
            </p>
            <Link to="/events" className="lb-btn-ghost mt-4 inline-flex">
              BROWSE EVENTS →
            </Link>
          </div>
        </Brackets>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((cert, i) => {
            const accent = TYPE_ACCENTS[cert.type ?? 'PARTICIPATION'] ?? (['red', 'blue', 'green', 'purple', 'yellow', 'orange'][i % 6] as Accent);
            return (
              <div key={cert.id} className={`lb-c-${accent}`}>
                <Brackets
                  tag={`cert · ${(cert.type ?? 'cert').toLowerCase()}`}
                  accent={accent}
                >
                  <div className="flex flex-col gap-3 py-1">
                    <div className="font-display uppercase text-base" style={{ letterSpacing: '0.04em' }}>
                      {cert.eventName || 'Tesseract'}
                    </div>
                    <div className="lb-mono text-[10px]" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                      {cert.certId}
                      {cert.issuedAt && (
                        <> · {new Date(cert.issuedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                      )}
                    </div>

                    {cert.isRevoked && (
                      <span
                        className="lb-mono text-[10px] px-2 py-1 self-start"
                        style={{
                          background: 'rgba(255,87,87,0.12)',
                          border: '1px solid var(--c-red)',
                          color: 'var(--c-red)',
                          letterSpacing: '0.12em',
                        }}
                      >
                        REVOKED
                      </span>
                    )}

                    <div className="flex gap-2 mt-2">
                      {cert.pdfUrl && (
                        <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer" className="lb-btn-ghost lb-btn-sm">
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                      <Link to={`/verify/${cert.certId}`} className="lb-btn-ghost lb-btn-sm">
                        <ExternalLink className="h-3 w-3" /> VERIFY
                      </Link>
                    </div>
                  </div>
                </Brackets>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
