import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, QrCode, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Registration } from '@/lib/api';
import { Brackets, MetaChip, RowAccent, rotateAccent } from '@/components/tesseract';
import { formatDate } from '@/lib/dateUtils';

export default function AttendancePage() {
  const { user, token } = useAuth();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = true;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getMyRegistrations(token);
        if (!cancelled) setRegs(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load registrations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const eligibleEvents = regs.filter((r) => r.event.status !== 'PAST' || r.attended);
  const attended = regs.filter((r) => r.attended);
  const isStaff = user?.role === 'CORE_MEMBER' || user?.role === 'ADMIN' || user?.role === 'PRESIDENT';

  if (!enabled) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <div className="lb-kicker">// attendance</div>
          <h1 className="font-display uppercase text-3xl mt-2" style={{ letterSpacing: '0.04em' }}>
            ATTENDANCE <span className="lb-h-accent">DISABLED.</span>
          </h1>
        </div>
        <Brackets tag="status · disabled" accent="red">
          <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>QR attendance is disabled by an admin.</span>
          </div>
        </Brackets>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="lb-kicker">// attendance · qr_check_in</div>
        <h1 className="font-display uppercase text-[clamp(28px,4vw,40px)] mt-2 leading-tight" style={{ letterSpacing: '0.04em' }}>
          YOUR <span className="lb-h-accent">QR TICKETS.</span>
        </h1>
        <p className="lb-sub mt-2">
          Open an event to view your QR ticket. Scanners at the venue mark attendance instantly.
          Multi-day events show one ticket per day.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <MetaChip label="REGISTERED" value={regs.length} accent="yellow" />
        <MetaChip label="ATTENDED" value={attended.length} accent="green" />
        <MetaChip label="UPCOMING" value={eligibleEvents.filter((r) => r.event.status !== 'PAST').length} accent="blue" />
      </div>

      {isStaff && (
        <Brackets tag="staff · scan_panel" accent="purple">
          <div className="flex items-center gap-3 flex-wrap">
            <QrCode className="h-5 w-5" style={{ color: 'var(--c-purple)' }} />
            <div className="flex-1 min-w-[240px]">
              <div className="lb-mono text-xs uppercase" style={{ color: 'var(--fg)', letterSpacing: '0.05em' }}>
                CORE MEMBER ACCESS
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-dim)' }}>
                Open an event's admin hub to scan attendees, mark manually, and export rosters.
              </div>
            </div>
            <Link to="/admin/event-registrations" className="lb-btn-ghost">
              EVENT HUB <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Brackets>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
        </div>
      ) : error ? (
        <Brackets tag="error" accent="red">
          <p className="lb-mono text-xs" style={{ color: 'var(--c-red)' }}>! {error}</p>
        </Brackets>
      ) : eligibleEvents.length === 0 ? (
        <Brackets tag="empty" accent="yellow">
          <div className="text-center py-6">
            <Calendar className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--fg-mute)' }} />
            <p className="lb-mono text-xs uppercase" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
              no upcoming events you've registered for
            </p>
            <Link to="/events" className="lb-btn-ghost mt-4 inline-flex">
              BROWSE EVENTS →
            </Link>
          </div>
        </Brackets>
      ) : (
        <Brackets tag="my.tickets" accent="yellow">
          <div className="flex flex-col">
            {eligibleEvents.map((r, i) => (
              <RowAccent
                key={r.id}
                accent={rotateAccent(i)}
                time={formatDate(r.event.startDate).split(',')[0]}
                tag={r.event.status.toLowerCase()}
                trailing={
                  <Link to={`/events/${r.event.slug || r.event.id}`} className="lb-btn-ghost lb-btn-sm">
                    {r.attended ? '✓ ATTENDED' : 'OPEN QR →'}
                  </Link>
                }
              >
                <Link to={`/events/${r.event.slug || r.event.id}`} className="hover:text-white transition-colors">
                  {r.event.title}
                </Link>
              </RowAccent>
            ))}
          </div>
        </Brackets>
      )}
    </div>
  );
}
