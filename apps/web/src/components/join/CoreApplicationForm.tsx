import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Brackets } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  api,
  type BsLevel,
  type CoreRole,
  type CoreSubmission,
  type TesseractHouse,
  type WeeklyHours,
  type WingPosition,
} from '@/lib/api';
import {
  BS_LEVEL_OPTIONS_CORE,
  CORE_ROLE_OPTIONS,
  HOUSE_LABEL,
  HOUSE_OPTIONS,
  STATUS_LABEL,
  WEEKLY_HOURS_OPTIONS,
  WING_POSITION_OPTIONS,
  bsLevelFromUserLevel,
} from '@/pages/join/_shared';

const CORE_HOUSE_OPTIONS = HOUSE_OPTIONS.filter((h) => h !== 'NOT_ALLOTED');

interface CoreApplicationFormProps {
  /** Roles to tick on mount — the recruitment page passes the wing(s) the user clicked. */
  presetRoles?: CoreRole[];
  /** Path to send the user back to after signing in. */
  signInNext?: string;
  /**
   * Signed-out behaviour. `true` (default, used by /join/core) redirects straight
   * to the sign-in page. `false` renders a sign-in prompt in place — required when
   * the form is embedded in a public content page like /recruitment, which must
   * stay readable (and crawlable) without an account.
   */
  redirectWhenSignedOut?: boolean;
  /** "Back to …" link rendered above the form. Omit to hide it. */
  backLink?: { to: string; label: string };
  kicker?: string;
  heading?: React.ReactNode;
  intro?: string;
  bracketTag?: string;
  /** Wraps the gate/success states so each host page can supply its own chrome. */
  shell?: (content: React.ReactNode) => React.ReactNode;
}

/**
 * The Core Team application form, shared by /join/core and /recruitment so the two
 * entry points can never drift apart. Owns its own auth gate, hiring-open gate,
 * duplicate-application check, and success state.
 */
export function CoreApplicationForm({
  presetRoles,
  signInNext = '/join/core',
  redirectWhenSignedOut = true,
  backLink,
  kicker = '// build.it',
  heading,
  intro = 'Future chaos architects only. Tell us who you are, what you can run, and the kind of mayhem you’ll bring.',
  bracketTag = 'form · core_team.recruitment',
  shell = (content) => content,
}: CoreApplicationFormProps) {
  const { user, isLoading: authLoading, token } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [house, setHouse] = useState<Exclude<TesseractHouse, 'NOT_ALLOTED'> | ''>('');
  const [bsLevel, setBsLevel] = useState<BsLevel | ''>('');
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours | ''>('');
  const [rolesApplied, setRolesApplied] = useState<CoreRole[]>(presetRoles ?? []);
  const [positionPreference, setPositionPreference] = useState<WingPosition | ''>('');
  const [hasExperience, setHasExperience] = useState<'YES' | 'NO' | ''>('');
  const [experienceDesc, setExperienceDesc] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [crazyIdeas, setCrazyIdeas] = useState('');
  const [confirmAccurate, setConfirmAccurate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'PENDING' | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState<{ status: keyof typeof STATUS_LABEL } | null>(null);

  // Union the roles the host page selects into the form's own selection, without
  // clobbering anything the user ticked by hand.
  const presetKey = (presetRoles ?? []).join('|');
  useEffect(() => {
    if (!presetRoles || presetRoles.length === 0) return;
    setRolesApplied((prev) => {
      const missing = presetRoles.filter((r) => !prev.includes(r));
      return missing.length === 0 ? prev : [...prev, ...missing];
    });
    // presetKey collapses the array into a stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

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
          positionPreference &&
          (hasExperience === 'NO' || (hasExperience === 'YES' && experienceDesc.trim().length > 1)) &&
          resumeUrl.trim() &&
          crazyIdeas.trim() &&
          confirmAccurate &&
          !submitting,
      ),
    [user, phone, house, bsLevel, weeklyHours, rolesApplied, positionPreference, hasExperience, experienceDesc, resumeUrl, crazyIdeas, confirmAccurate, submitting],
  );

  if (authLoading) {
    return <>{shell(
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>,
    )}</>;
  }
  if (!user) {
    if (redirectWhenSignedOut) {
      return <Navigate to={`/signin?next=${encodeURIComponent(signInNext)}`} replace />;
    }
    return <>{shell(<SignInPromptCard next={signInNext} />)}</>;
  }
  if (!hiringOpen) return <>{shell(<ClosedCard />)}</>;
  if (submittedStatus) return <>{shell(<SuccessCard />)}</>;
  if (alreadyApplied) return <>{shell(<AlreadyAppliedCard status={alreadyApplied.status} />)}</>;

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
        positionPreference: positionPreference as WingPosition,
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
    <>
      {backLink && (
        <Link
          to={backLink.to}
          className="lb-mono text-[11px] inline-flex items-center gap-2 mb-6"
          style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}
        >
          <ArrowLeft size={12} /> {backLink.label}
        </Link>
      )}

      <Brackets tag={bracketTag} accent="green">
        <div className="lb-kicker">{kicker}</div>
        <h2 className="font-display uppercase text-3xl sm:text-4xl mt-1 mb-2" style={{ letterSpacing: '0.04em' }}>
          {heading ?? (<>JOIN AS <span className="lb-h-accent">CORE MEMBER</span></>)}
        </h2>
        <p className="lb-sub mb-6" style={{ fontSize: 14 }}>{intro}</p>

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
              WINGS / ROLES YOU'RE APPLYING FOR (PICK ONE OR MORE) *
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

          <RadioField label="POSITION YOU'RE AIMING FOR" required>
            {WING_POSITION_OPTIONS.map((opt) => (
              <Radio
                key={opt.value}
                name="positionPreference"
                value={opt.value}
                checked={positionPreference === opt.value}
                onChange={() => setPositionPreference(opt.value)}
              >
                {opt.label}
                <span className="lb-mono text-[10px] ml-2" style={{ color: 'var(--fg-mute)' }}>
                  {opt.hint}
                </span>
              </Radio>
            ))}
          </RadioField>

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
    </>
  );
}

// ── helper components ────────────────────────────────────────────────────

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

function SignInPromptCard({ next }: { next: string }) {
  return (
    <Brackets tag="auth · required" accent="yellow">
      <div className="lb-kicker">// sign_in.required</div>
      <h2 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
        SIGN IN TO <span className="lb-h-accent">APPLY.</span>
      </h2>
      <p className="lb-sub mt-2 mb-6">
        Core Team applications are tied to your Tesseract account, so we can track your status and
        reach you about interviews. Sign in with your institute email to continue — everything
        above stays readable either way.
      </p>
      <Link
        to={`/signin?next=${encodeURIComponent(next)}`}
        className="lb-btn-primary lb-btn-lg w-full justify-center"
        style={{ textDecoration: 'none' }}
      >
        SIGN IN TO CONTINUE <ArrowRight size={14} />
      </Link>
    </Brackets>
  );
}

function ClosedCard() {
  return (
    <Brackets tag="status · closed" accent="red">
      <div className="lb-kicker">// closed</div>
      <h2 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
        CORE INTAKE IS <span className="lb-h-accent">PAUSED.</span>
      </h2>
      <p className="lb-sub mt-2 mb-6">
        We're not accepting Core Team applications right now. Watch our socials for the next call.
      </p>
      <Link to="/" className="lb-btn-ghost lb-btn-lg" style={{ width: 'fit-content' }}>BACK TO HOME</Link>
    </Brackets>
  );
}

function SuccessCard() {
  return (
    <Brackets tag="status · received" accent="green">
      <div className="flex items-start gap-4 mb-6">
        <CheckCircle2 size={36} className="text-emerald-400 shrink-0" />
        <div>
          <div className="lb-kicker">// pending.review</div>
          <h2 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
            APPLICATION <span className="lb-h-accent">RECEIVED.</span>
          </h2>
          <p className="lb-sub mt-2">
            We'll review and reach out via email if you're shortlisted. Check your dashboard for status updates.
          </p>
        </div>
      </div>
      <Link to="/dashboard" className="lb-btn-primary lb-btn-lg w-full justify-center">OPEN DASHBOARD <ArrowRight size={14} /></Link>
    </Brackets>
  );
}

function AlreadyAppliedCard({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <Brackets tag={`status · ${status.toLowerCase()}`} accent="yellow">
      <div className="lb-kicker">// existing.application</div>
      <h2 className="font-display uppercase text-3xl mt-1" style={{ letterSpacing: '0.04em' }}>
        YOU'VE ALREADY <span className="lb-h-accent">APPLIED.</span>
      </h2>
      <p className="lb-sub mt-2 mb-6">{STATUS_LABEL[status]}.</p>
      <Link to="/dashboard" className="lb-btn-primary lb-btn-lg w-full justify-center">OPEN DASHBOARD <ArrowRight size={14} /></Link>
    </Brackets>
  );
}
