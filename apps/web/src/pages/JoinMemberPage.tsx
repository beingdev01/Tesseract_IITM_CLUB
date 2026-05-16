import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Brackets, GateBar } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api, type BsLevel, type CoreInterest, type HiringGender, type MemberSubmission, type TesseractHouse, type TesseractRegion } from '@/lib/api';
import {
  BS_LEVEL_OPTIONS_MEMBER,
  CORE_INTEREST_OPTIONS,
  GENDER_OPTIONS,
  HOUSE_LABEL,
  HOUSE_OPTIONS,
  REGION_LABEL,
  REGION_OPTIONS,
  bsLevelFromUserLevel,
} from './join/_shared';

export default function JoinMemberPage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<HiringGender | ''>('');
  const [bsLevel, setBsLevel] = useState<BsLevel | ''>('');
  const [house, setHouse] = useState<TesseractHouse | ''>('');
  const [region, setRegion] = useState<TesseractRegion | ''>('');
  const [coreInterest, setCoreInterest] = useState<CoreInterest | ''>('');
  const [crazyIdeas, setCrazyIdeas] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ whatsappUrl: string | null; coreInterest: CoreInterest | null } | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  // Auto-fill from user profile (call /users/me for the full record)
  const [profileFetched, setProfileFetched] = useState(false);
  useEffect(() => {
    if (!user || !token || profileFetched) return;
    setProfileFetched(true);
    (async () => {
      try {
        const profile = await api.getProfile(token);
        if (profile.phone && !phone) setPhone(profile.phone);
        const mapped = bsLevelFromUserLevel(profile.level ?? null);
        if (mapped && !bsLevel) setBsLevel(mapped);
      } catch {
        // best effort
      }
    })();
  }, [user, token, profileFetched, phone, bsLevel]);

  // Pre-check whether user already joined
  useEffect(() => {
    if (!user || !token) return;
    api
      .getMyHiringApplication(token)
      .then((res) => {
        if (res.member) setAlreadyJoined(true);
      })
      .catch(() => {});
  }, [user, token]);

  const hiringOpen = settings?.hiringEnabled !== false;

  const canSubmit = useMemo(
    () => Boolean(user && phone && gender && bsLevel && house && region && coreInterest && !submitting),
    [user, phone, gender, bsLevel, house, region, coreInterest, submitting],
  );

  if (authLoading) return <LoadingShell />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent('/join/member')}`} replace />;
  if (!hiringOpen) return <ClosedShell />;

  if (success) return <SuccessShell whatsappUrl={success.whatsappUrl} coreInterest={success.coreInterest} />;

  if (alreadyJoined) {
    return (
      <Layout>
        <GateBar />
        <section className="lb-hero" style={{ paddingBottom: 60 }}>
          <div className="lb-hero-left">
            <div className="lb-kicker">// already.joined</div>
            <h1 className="lb-headline">
              <span className="lb-h-line">YOU'RE</span>
              <span className="lb-h-line lb-h-accent">ALREADY IN.</span>
            </h1>
            <p className="lb-sub">You've joined Tesseract as a Member. Head to your dashboard for the WhatsApp invite.</p>
            <div className="flex gap-3 mt-4">
              <Link to="/dashboard" className="lb-btn-primary lb-btn-lg">OPEN DASHBOARD <ArrowRight size={14} /></Link>
              <Link to="/join/core" className="lb-btn-ghost lb-btn-lg">JOIN CORE INSTEAD</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      const payload: MemberSubmission = {
        applicationType: 'MEMBER',
        name: user.name,
        email: user.email,
        phone: phone.trim(),
        house: house as TesseractHouse,
        bsLevel: bsLevel as BsLevel,
        gender: gender as HiringGender,
        region: region as TesseractRegion,
        coreInterest: coreInterest as CoreInterest,
        crazyIdeas: crazyIdeas.trim() ? crazyIdeas.trim() : null,
      };
      const res = await api.submitHiringApplication(payload, token ?? undefined);
      setSuccess({ whatsappUrl: res.whatsappCommunityUrl ?? null, coreInterest: payload.coreInterest });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <GateBar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/join" className="lb-mono text-[11px] inline-flex items-center gap-2 mb-6" style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
          <ArrowLeft size={12} /> BACK TO ENTRY VECTORS
        </Link>

        <Brackets tag="form · member.intake" accent="yellow">
          <div className="lb-kicker">// quick.join</div>
          <h1 className="font-display uppercase text-3xl sm:text-4xl mt-1 mb-2" style={{ letterSpacing: '0.04em' }}>
            JOIN AS <span className="lb-h-accent">MEMBER</span>
          </h1>
          <p className="lb-sub mb-6" style={{ fontSize: 14 }}>
            Welcome, brave soul. Fill this to drop into the Tesseract Interest Group community.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <PrefilledField label="EMAIL" value={user.email} />
            <PrefilledField label="FULL NAME" value={user.name} />

            <Field label="PHONE (WHATSAPP)" required>
              <input
                type="tel"
                inputMode="tel"
                className="t-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 …"
                required
              />
            </Field>

            <RadioField label="GENDER" required>
              {GENDER_OPTIONS.map((opt) => (
                <Radio key={opt.value} name="gender" value={opt.value} checked={gender === opt.value} onChange={() => setGender(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioField>

            <RadioField label="LEVEL IN THE BS PROGRAM" required>
              {BS_LEVEL_OPTIONS_MEMBER.map((opt) => (
                <Radio key={opt.value} name="bsLevel" value={opt.value} checked={bsLevel === opt.value} onChange={() => setBsLevel(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioField>

            <Field label="YOUR HOUSE" required>
              <select className="t-input" value={house} onChange={(e) => setHouse(e.target.value as TesseractHouse)} required>
                <option value="">Choose a house…</option>
                {HOUSE_OPTIONS.map((h) => (
                  <option key={h} value={h}>{HOUSE_LABEL[h]}</option>
                ))}
              </select>
            </Field>

            <Field label="YOUR REGION" required>
              <select className="t-input" value={region} onChange={(e) => setRegion(e.target.value as TesseractRegion)} required>
                <option value="">Choose a region…</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{REGION_LABEL[r]}</option>
                ))}
              </select>
            </Field>

            <RadioField label="INTERESTED IN THE CORE TEAM?" required>
              {CORE_INTEREST_OPTIONS.map((opt) => (
                <Radio key={opt.value} name="coreInterest" value={opt.value} checked={coreInterest === opt.value} onChange={() => setCoreInterest(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioField>

            <Field label="CRAZY IDEAS FOR ACTIVITIES (OPTIONAL)">
              <textarea
                className="t-input min-h-[100px]"
                value={crazyIdeas}
                onChange={(e) => setCrazyIdeas(e.target.value)}
                placeholder="Drop your wildest, wackiest, most legendary ideas…"
              />
            </Field>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => navigate(-1)} className="lb-btn-ghost lb-btn-lg flex-1 justify-center">CANCEL</button>
              <button type="submit" disabled={!canSubmit} className="lb-btn-primary lb-btn-lg flex-1 justify-center">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> JOINING…</> : <>JOIN THE COMMUNITY <ArrowRight size={14} /></>}
              </button>
            </div>
          </form>
        </Brackets>
      </section>
    </Layout>
  );
}

// ── helper components ─────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lb-mono text-[10px] block mb-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function RadioField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="block">
      <legend className="lb-mono text-[10px] block mb-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
        {label}{required ? ' *' : ''}
      </legend>
      <div className="grid grid-cols-1 gap-2">{children}</div>
    </fieldset>
  );
}

function Radio({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
      style={{
        border: `1px solid ${checked ? 'var(--c-yellow)' : 'var(--line)'}`,
        background: checked ? 'rgba(255,217,59,0.06)' : 'transparent',
      }}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-yellow-400" />
      <span className="text-sm">{children}</span>
    </label>
  );
}

function PrefilledField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={`${label} (FROM YOUR ACCOUNT)`}>
      <input className="t-input" value={value} readOnly aria-readonly style={{ opacity: 0.85, cursor: 'not-allowed' }} />
    </Field>
  );
}

function LoadingShell() {
  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    </Layout>
  );
}

function ClosedShell() {
  return (
    <Layout>
      <GateBar />
      <section className="lb-hero" style={{ paddingBottom: 60 }}>
        <div className="lb-hero-left">
          <div className="lb-kicker">// closed</div>
          <h1 className="lb-headline">
            <span className="lb-h-line">JOIN FLOW IS</span>
            <span className="lb-h-line lb-h-accent">PAUSED.</span>
          </h1>
          <p className="lb-sub">Hiring is currently closed. Follow our socials for the next intake.</p>
          <Link to="/" className="lb-btn-ghost lb-btn-lg mt-4" style={{ width: 'fit-content' }}>BACK TO HOME</Link>
        </div>
      </section>
    </Layout>
  );
}

function SuccessShell({ whatsappUrl, coreInterest }: { whatsappUrl: string | null; coreInterest: CoreInterest | null }) {
  return (
    <Layout>
      <GateBar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Brackets tag="status · joined" accent="green">
          <div className="flex items-start gap-4 mb-6">
            <CheckCircle2 size={36} className="text-emerald-400 shrink-0" />
            <div>
              <div className="lb-kicker">// welcome</div>
              <h1 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
                YOU'RE <span className="lb-h-accent">IN.</span>
              </h1>
              <p className="lb-sub mt-2">
                Welcome to the Tesseract Interest Group community.
              </p>
            </div>
          </div>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lb-btn-primary lb-btn-lg w-full justify-center"
              style={{ background: '#25d366', borderColor: '#25d366', color: '#000' }}
            >
              OPEN WHATSAPP COMMUNITY <ExternalLink size={14} />
            </a>
          ) : (
            <div
              className="lb-mono text-xs px-4 py-3"
              style={{ border: '1px dashed var(--line-2)', color: 'var(--fg-mute)', letterSpacing: '0.06em' }}
            >
              // the WhatsApp invite isn't set yet — check your dashboard in a day or two
            </div>
          )}

          {coreInterest === 'YES' && (
            <Link to="/join/core" className="lb-btn-ghost lb-btn-lg w-full justify-center mt-4">
              ALSO APPLY FOR THE CORE TEAM <ArrowRight size={14} />
            </Link>
          )}

          <Link to="/dashboard" className="lb-mono text-[11px] inline-flex items-center gap-2 mt-6" style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
            <ArrowRight size={12} /> GO TO YOUR DASHBOARD
          </Link>
        </Brackets>
      </section>
    </Layout>
  );
}
