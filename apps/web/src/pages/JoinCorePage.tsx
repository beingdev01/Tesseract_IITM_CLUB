import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Brackets, GateBar } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { api, type BsLevel, type CoreRole, type CoreSubmission, type TesseractHouse, type WeeklyHours } from '@/lib/api';
import {
  BS_LEVEL_OPTIONS_CORE,
  CORE_ROLE_OPTIONS,
  HOUSE_LABEL,
  HOUSE_OPTIONS,
  STATUS_LABEL,
  WEEKLY_HOURS_OPTIONS,
  bsLevelFromUserLevel,
} from './join/_shared';

const CORE_HOUSE_OPTIONS = HOUSE_OPTIONS.filter((h) => h !== 'NOT_ALLOTED');

export default function JoinCorePage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [house, setHouse] = useState<Exclude<TesseractHouse, 'NOT_ALLOTED'> | ''>('');
  const [bsLevel, setBsLevel] = useState<BsLevel | ''>('');
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours | ''>('');
  const [rolesApplied, setRolesApplied] = useState<CoreRole[]>([]);
  const [hasExperience, setHasExperience] = useState<'YES' | 'NO' | ''>('');
  const [experienceDesc, setExperienceDesc] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [crazyIdeas, setCrazyIdeas] = useState('');
  const [confirmAccurate, setConfirmAccurate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'PENDING' | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState<{ status: keyof typeof STATUS_LABEL } | null>(null);

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
        const inferredResume = profile.linkedinUrl || profile.websiteUrl || profile.githubUrl || '';
        if (inferredResume && !resumeUrl) setResumeUrl(inferredResume);
      } catch {
        // best effort
      }
    })();
  }, [user, token, profileFetched, phone, bsLevel, resumeUrl]);

  useEffect(() => {
    if (!user || !token) return;
    api
      .getMyHiringApplication(token)
      .then((res) => {
        if (res.core) setAlreadyApplied({ status: res.core.status });
      })
      .catch(() => {});
  }, [user, token]);

  const hiringOpen = settings?.hiringEnabled !== false;

  const canSubmit = useMemo(
    () =>
      Boolean(
        user &&
          phone &&
          house &&
          bsLevel &&
          weeklyHours &&
          rolesApplied.length > 0 &&
          (hasExperience === 'NO' || (hasExperience === 'YES' && experienceDesc.trim().length > 1)) &&
          resumeUrl.trim() &&
          crazyIdeas.trim() &&
          confirmAccurate &&
          !submitting,
      ),
    [user, phone, house, bsLevel, weeklyHours, rolesApplied, hasExperience, experienceDesc, resumeUrl, crazyIdeas, confirmAccurate, submitting],
  );

  if (authLoading) return <LoadingShell />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent('/join/core')}`} replace />;
  if (!hiringOpen) return <ClosedShell />;
  if (submittedStatus) return <SuccessShell />;
  if (alreadyApplied) return <AlreadyAppliedShell status={alreadyApplied.status} />;

  const toggleRole = (r: CoreRole) =>
    setRolesApplied((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    if (house === '') {
      toast.error('Pick a house');
      return;
    }
    const validHouse: Exclude<TesseractHouse, 'NOT_ALLOTED'> = house;

    setSubmitting(true);
    try {
      const payload: CoreSubmission = {
        applicationType: 'CORE',
        name: user.name,
        email: user.email,
        phone: phone.trim(),
        house: validHouse,
        bsLevel: bsLevel as BsLevel,
        weeklyHours: weeklyHours as WeeklyHours,
        rolesApplied,
        hasExperience: hasExperience === 'YES',
        experienceDesc: hasExperience === 'YES' ? experienceDesc.trim() : null,
        resumeUrl: resumeUrl.trim(),
        crazyIdeas: crazyIdeas.trim(),
        confirmAccurate: true,
      };
      await api.submitHiringApplication(payload, token ?? undefined);
      setSubmittedStatus('PENDING');
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

        <Brackets tag="form · core_team.recruitment" accent="green">
          <div className="lb-kicker">// build.it</div>
          <h1 className="font-display uppercase text-3xl sm:text-4xl mt-1 mb-2" style={{ letterSpacing: '0.04em' }}>
            JOIN AS <span className="lb-h-accent">CORE MEMBER</span>
          </h1>
          <p className="lb-sub mb-6" style={{ fontSize: 14 }}>
            Future chaos architects only. Tell us who you are, what you can run, and the kind of mayhem you'll bring.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <PrefilledField label="EMAIL" value={user.email} />
            <PrefilledField label="FULL NAME" value={user.name} />

            <Field label="CONTACT NUMBER (PREFERABLY WHATSAPP)" required>
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

            <Field label="YOUR HOUSE" required>
              <select
                className="t-input"
                value={house}
                onChange={(e) => setHouse(e.target.value as Exclude<TesseractHouse, 'NOT_ALLOTED'>)}
                required
              >
                <option value="">Choose a house…</option>
                {CORE_HOUSE_OPTIONS.map((h) => (
                  <option key={h} value={h}>{HOUSE_LABEL[h]}</option>
                ))}
              </select>
            </Field>

            <RadioField label="LEVEL IN THE BS PROGRAM" required>
              {BS_LEVEL_OPTIONS_CORE.map((opt) => (
                <Radio key={opt.value} name="bsLevel" value={opt.value} checked={bsLevel === opt.value} onChange={() => setBsLevel(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioField>

            <RadioField label="HOURS PER WEEK YOU CAN DEDICATE" required>
              {WEEKLY_HOURS_OPTIONS.map((opt) => (
                <Radio key={opt.value} name="weeklyHours" value={opt.value} checked={weeklyHours === opt.value} onChange={() => setWeeklyHours(opt.value)}>
                  {opt.label}
                </Radio>
              ))}
            </RadioField>

            <fieldset>
              <legend className="lb-mono text-[10px] block mb-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
                ROLES YOU'RE APPLYING FOR (PICK ONE OR MORE) *
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CORE_ROLE_OPTIONS.map((opt) => {
                  const checked = rolesApplied.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${checked ? 'var(--c-green)' : 'var(--line)'}`,
                        background: checked ? 'rgba(94,255,122,0.06)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(opt.value)}
                        className="accent-emerald-400"
                      />
                      <span className="text-sm">
                        <span aria-hidden className="mr-1">{opt.icon}</span> {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <RadioField label="ANY PAST EXPERIENCE OR COOL SKILLS?" required>
              <Radio name="hasExperience" value="YES" checked={hasExperience === 'YES'} onChange={() => setHasExperience('YES')}>Yes</Radio>
              <Radio name="hasExperience" value="NO" checked={hasExperience === 'NO'} onChange={() => { setHasExperience('NO'); setExperienceDesc(''); }}>No</Radio>
            </RadioField>

            {hasExperience === 'YES' && (
              <Field label="DESCRIBE YOUR EXPERIENCE / SKILLS" required>
                <textarea
                  className="t-input min-h-[120px]"
                  value={experienceDesc}
                  onChange={(e) => setExperienceDesc(e.target.value)}
                  placeholder="Past projects, tools, leadership roles, anything relevant…"
                  required
                />
              </Field>
            )}

            <Field label="LINKEDIN / RESUME URL" required>
              <input
                type="url"
                className="t-input"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
                required
              />
            </Field>

            <Field label="CRAZY IDEAS YOU WANNA BRING TO THE CLUB" required>
              <textarea
                className="t-input min-h-[120px]"
                value={crazyIdeas}
                onChange={(e) => setCrazyIdeas(e.target.value)}
                placeholder="The wilder the better. We promise we won't judge… much."
                required
              />
            </Field>

            <label className="flex items-start gap-3 px-3 py-3 cursor-pointer"
              style={{ border: `1px solid ${confirmAccurate ? 'var(--c-green)' : 'var(--line)'}`, background: confirmAccurate ? 'rgba(94,255,122,0.04)' : 'transparent' }}
            >
              <input
                type="checkbox"
                checked={confirmAccurate}
                onChange={(e) => setConfirmAccurate(e.target.checked)}
                className="accent-emerald-400 mt-1"
              />
              <span className="text-sm">
                I confirm that all information provided is accurate, and I'm willing to contribute to Tesseract's growth and success.
              </span>
            </label>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => navigate(-1)} className="lb-btn-ghost lb-btn-lg flex-1 justify-center">CANCEL</button>
              <button type="submit" disabled={!canSubmit} className="lb-btn-primary lb-btn-lg flex-1 justify-center">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> SUBMITTING…</> : <>SUBMIT APPLICATION <ArrowRight size={14} /></>}
              </button>
            </div>
          </form>
        </Brackets>
      </section>
    </Layout>
  );
}

// ── helper components (mirror JoinMemberPage to keep things isolated) ────

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
    <fieldset>
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
        border: `1px solid ${checked ? 'var(--c-green)' : 'var(--line)'}`,
        background: checked ? 'rgba(94,255,122,0.06)' : 'transparent',
      }}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-emerald-400" />
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
            <span className="lb-h-line">CORE INTAKE IS</span>
            <span className="lb-h-line lb-h-accent">PAUSED.</span>
          </h1>
          <p className="lb-sub">We're not accepting Core Team applications right now. Watch socials for the next call.</p>
          <Link to="/" className="lb-btn-ghost lb-btn-lg mt-4" style={{ width: 'fit-content' }}>BACK TO HOME</Link>
        </div>
      </section>
    </Layout>
  );
}

function SuccessShell() {
  return (
    <Layout>
      <GateBar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Brackets tag="status · received" accent="green">
          <div className="flex items-start gap-4 mb-6">
            <CheckCircle2 size={36} className="text-emerald-400 shrink-0" />
            <div>
              <div className="lb-kicker">// pending.review</div>
              <h1 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
                APPLICATION <span className="lb-h-accent">RECEIVED.</span>
              </h1>
              <p className="lb-sub mt-2">
                We'll review and reach out via email if you're shortlisted. Check your dashboard for status updates.
              </p>
            </div>
          </div>
          <Link to="/dashboard" className="lb-btn-primary lb-btn-lg w-full justify-center">OPEN DASHBOARD <ArrowRight size={14} /></Link>
        </Brackets>
      </section>
    </Layout>
  );
}

function AlreadyAppliedShell({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <Layout>
      <GateBar />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Brackets tag={`status · ${status.toLowerCase()}`} accent="yellow">
          <div className="lb-kicker">// existing.application</div>
          <h1 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
            YOU'VE ALREADY <span className="lb-h-accent">APPLIED.</span>
          </h1>
          <p className="lb-sub mt-2 mb-6">{STATUS_LABEL[status]}.</p>
          <Link to="/dashboard" className="lb-btn-primary lb-btn-lg w-full justify-center">OPEN DASHBOARD <ArrowRight size={14} /></Link>
        </Brackets>
      </section>
    </Layout>
  );
}
