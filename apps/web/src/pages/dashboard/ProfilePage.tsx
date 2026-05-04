import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/lib/api';
import type { UserLevel } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Loader2, AlertCircle, CheckCircle, Save, Calendar } from 'lucide-react';
import { Brackets, MetaChip } from '@/components/tesseract';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;

const levelLabels: Record<UserLevel, string> = {
  FOUNDATION: 'Foundation',
  DIPLOMA: 'Diploma',
  BSC: 'BSc',
  BS: 'BS',
};

const programFromEmail = (email: string | undefined): string => {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  if (domain === 'ds.study.iitm.ac.in') return 'Data Science';
  if (domain === 'es.study.iitm.ac.in') return 'Electronic Systems';
  return '—';
};

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  course?: string;
  branch?: string;
  year?: string;
  level?: UserLevel | null;
  githubUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  createdAt: string;
  oauthProvider?: string;
  _count: { registrations: number; qotdSubmissions: number };
}

const getPendingEventRedirectPath = (eventId: string, pendingType: 'solo' | 'team') =>
  pendingType === 'team' ? `/events/${eventId}` : `/events/${eventId}?register=1`;

export default function ProfilePage() {
  const { token, refreshUser } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => { clearTimeout(redirectTimerRef.current); }, []);

  // Form fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [pendingEventType, setPendingEventType] = useState<'solo' | 'team'>('solo');
  const navigationPendingEventId =
    (location.state as { pendingEventId?: string } | null)?.pendingEventId ?? null;

  useEffect(() => {
    const storagePendingId = localStorage.getItem('pendingEventRegistration');
    const storagePendingType = localStorage.getItem('pendingEventRegistrationType');
    const pendingId = navigationPendingEventId || storagePendingId;
    if (pendingId) {
      if (!storagePendingId) localStorage.setItem('pendingEventRegistration', pendingId);
      setPendingEventId(pendingId);
      setPendingEventType(storagePendingType === 'team' ? 'team' : 'solo');
    }

    const fetchProfile = async () => {
      if (!token) return;
      try {
        const data = await api.getProfile(token);
        setProfile(data);
        setName(data.name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar || '');
        setPhone(data.phone || '');
        setYear(data.year || '');
        setGithubUrl(data.githubUrl || '');
        setLinkedinUrl(data.linkedinUrl || '');
        setTwitterUrl(data.twitterUrl || '');
        setWebsiteUrl(data.websiteUrl || '');
      } catch {
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [navigationPendingEventId, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      setMessage({ type: 'error', text: 'Phone number must be exactly 10 digits' });
      setSaving(false);
      return;
    }

    try {
      await api.updateProfile(
        { name, bio, avatarUrl, phone, year, githubUrl, linkedinUrl, twitterUrl, websiteUrl },
        token,
      );
      await refreshUser();
      if (pendingEventId) {
        localStorage.removeItem('pendingEventRegistration');
        localStorage.removeItem('pendingEventRegistrationType');
        setPendingEventId(null);
        setMessage({ type: 'success', text: 'PROFILE SAVED — RESUMING REGISTRATION…' });
        redirectTimerRef.current = setTimeout(() => {
          navigate(getPendingEventRedirectPath(pendingEventId, pendingEventType));
        }, 1000);
        return;
      }
      setMessage({ type: 'success', text: 'PROFILE SAVED — REDIRECTING…' });
      redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--c-yellow)' }} />
      </div>
    );
  }

  const program = programFromEmail(profile?.email);
  const level = profile?.level ? levelLabels[profile.level] : '—';
  const needsAcademicDetails = !profile?.phone || program === '—' || !profile?.level || !profile?.year;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="lb-kicker">// profile.edit</div>
        <h1 className="font-display uppercase text-[clamp(28px,4vw,40px)] mt-2 leading-tight" style={{ letterSpacing: '0.04em' }}>
          YOUR <span className="lb-h-accent">HANDLE.</span>
        </h1>
        <p className="lb-sub mt-2">
          Manage account, academic details, and connected profiles.
        </p>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <MetaChip label="ROLE" value={profile?.role?.replace(/_/g, ' ').toLowerCase() ?? 'user'} accent="yellow" />
        <MetaChip label="EVENTS" value={String(profile?._count?.registrations ?? 0).padStart(2, '0')} accent="blue" />
        <MetaChip label="QOTD" value={String(profile?._count?.qotdSubmissions ?? 0).padStart(2, '0')} accent="purple" />
        <MetaChip label="JOINED" value={profile ? formatDate(profile.createdAt).split(',')[0] : '—'} accent="green" />
      </div>

      {/* Banners */}
      {needsAcademicDetails && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Brackets tag="action_required" accent="orange">
            <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-orange)' }}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">COMPLETE ACADEMIC DETAILS</div>
                <p className="text-[11px]" style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}>
                  Fill phone and year. Program and level are auto-filled from sign-in details.
                </p>
              </div>
            </div>
          </Brackets>
        </motion.div>
      )}

      {pendingEventId && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Brackets tag="pending_registration" accent="blue">
            <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-blue)' }}>
              <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">FINISH EVENT REGISTRATION</div>
                <p className="text-[11px]" style={{ color: 'var(--fg-dim)', textTransform: 'none', letterSpacing: 0 }}>
                  Save below to continue to the event{pendingEventType === 'team' ? ' team registration.' : '.'}
                </p>
              </div>
            </div>
          </Brackets>
        </motion.div>
      )}

      {message && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Brackets tag={message.type} accent={message.type === 'success' ? 'green' : 'red'}>
            <div className="flex items-center gap-2 lb-mono text-xs" style={{ color: message.type === 'success' ? 'var(--c-green)' : 'var(--c-red)' }}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          </Brackets>
        </motion.div>
      )}

      {/* Account info readonly */}
      <Brackets tag="account.identity" accent="yellow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="t-label">EMAIL</div>
            <div className="lb-mono text-sm mt-1" style={{ color: 'var(--fg)' }}>{profile?.email}</div>
          </div>
          <div>
            <div className="t-label">OAUTH</div>
            <div className="lb-mono text-sm mt-1" style={{ color: 'var(--c-green)' }}>
              {profile?.oauthProvider ?? 'google'}
            </div>
          </div>
        </div>
      </Brackets>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Brackets tag="account.profile" accent="yellow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="DISPLAY NAME">
              <input className="t-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" required />
            </Field>
            <Field label="AVATAR URL">
              <input className="t-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="PHONE (10-digit)" className="md:col-span-2">
              <input className="t-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" inputMode="numeric" />
            </Field>
            <Field label="BIO" className="md:col-span-2">
              <textarea className="t-input" style={{ minHeight: 80 }} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few lines about you…" />
            </Field>
          </div>
        </Brackets>

        <Brackets tag="academic.record" accent="green">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="PROGRAM (AUTO)">
              <input className="t-input" value={program} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
            </Field>
            <Field label="LEVEL (AUTO)">
              <input className="t-input" value={level} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
            </Field>
            <Field label="YEAR">
              <select className="t-select" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">select…</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
        </Brackets>

        <Brackets tag="social.profiles" accent="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="GITHUB"><input className="t-input" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you" /></Field>
            <Field label="LINKEDIN"><input className="t-input" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/you" /></Field>
            <Field label="TWITTER"><input className="t-input" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://twitter.com/you" /></Field>
            <Field label="WEBSITE"><input className="t-input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourdomain.dev" /></Field>
          </div>
        </Brackets>

        <Brackets tag="feature.flags" accent="purple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lb-mono text-xs">
            <div className="lb-toggle-row">
              <div>
                <div className="lb-toggle-label">CERTIFICATES</div>
                <div className="lb-toggle-desc">Issued automatically when admin enables.</div>
              </div>
              <span
                className="lb-mono text-[10px] px-2 py-1"
                style={{
                  border: '1px solid',
                  borderColor: settings?.certificatesEnabled ? 'var(--c-green)' : 'var(--c-red)',
                  color: settings?.certificatesEnabled ? 'var(--c-green)' : 'var(--c-red)',
                }}
              >
                {settings?.certificatesEnabled ? 'enabled' : 'disabled'}
              </span>
            </div>
            <div className="lb-toggle-row">
              <div>
                <div className="lb-toggle-label">LEADERBOARD</div>
                <div className="lb-toggle-desc">Shown on dashboard when enabled.</div>
              </div>
              <span
                className="lb-mono text-[10px] px-2 py-1"
                style={{
                  border: '1px solid',
                  borderColor: settings?.showLeaderboard ? 'var(--c-green)' : 'var(--c-red)',
                  color: settings?.showLeaderboard ? 'var(--c-green)' : 'var(--c-red)',
                }}
              >
                {settings?.showLeaderboard ? 'enabled' : 'disabled'}
              </span>
            </div>
          </div>
        </Brackets>

        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button type="submit" disabled={saving} className="lb-btn-primary">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> SAVING…</> : <><Save className="h-4 w-4" /> SAVE CHANGES</>}
          </button>
        </div>
      </form>

    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`t-field ${className}`}>
      <label className="t-label">{label}</label>
      {children}
    </div>
  );
}
