import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { api } from '@/lib/api';
import type { Settings, SecurityEnvStatus } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Brackets, ToggleRow } from '@/components/tesseract';
import { Markdown } from '@/components/ui/markdown';
import { formatDateTime } from '@/lib/dateUtils';

const EMAIL_CATEGORIES = [
  { key: 'emailWelcomeEnabled' as const,         label: 'WELCOME',         desc: 'Sent when new user registers' },
  { key: 'emailEventCreationEnabled' as const,   label: 'EVENT CREATION',  desc: 'Sent to all users on new event' },
  { key: 'emailRegistrationEnabled' as const,    label: 'REGISTRATION',    desc: 'Sent on event registration' },
  { key: 'emailAnnouncementEnabled' as const,    label: 'ANNOUNCEMENTS',   desc: 'Sent to all users on new announcement' },
  { key: 'emailCertificateEnabled' as const,     label: 'CERTIFICATES',    desc: 'Sent on certificate issuance' },
  { key: 'emailReminderEnabled' as const,        label: 'REMINDERS',       desc: 'Auto reminders before events' },
  { key: 'emailInvitationEnabled' as const,      label: 'INVITATIONS',     desc: 'Sent on guest/speaker invitation' },
  { key: 'mailingEnabled' as const,              label: 'ADMIN BULK MAIL', desc: 'Enable admin email composer' },
];

export default function AdminSettings() {
  const { user, token } = useAuth();
  const { refreshSettings: refreshGlobalSettings } = useSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    id: 'default',
    clubName: 'Tesseract',
    clubEmail: 'contact@tesseract.iitm.ac.in',
    clubDescription: '',
    registrationOpen: true,
    maxEventsPerUser: 5,
    announcementsEnabled: true,
    showLeaderboard: false,
    showAchievements: true,
    show_tech_blogs: true,
    hiringEnabled: false,
    whatsappCommunityUrl: '',
    showNetwork: false,
    mailingEnabled: true,
    emailWelcomeEnabled: true,
    emailEventCreationEnabled: true,
    emailRegistrationEnabled: true,
    emailAnnouncementEnabled: true,
    emailCertificateEnabled: true,
    emailReminderEnabled: true,
    emailInvitationEnabled: true,
    emailTestingMode: false,
    emailTestRecipients: null,
    certificatesEnabled: true,
    attendanceEnabled: true,
    competitionEnabled: false,
    githubUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    discordUrl: '',
    emailWelcomeBody: '',
    emailAnnouncementBody: '',
    emailEventBody: '',
    emailFooterText: '',
    updatedAt: new Date().toISOString(),
  });

  const [activeEmailTab, setActiveEmailTab] = useState<'welcome' | 'announcement' | 'event'>('welcome');
  const [showPreview, setShowPreview] = useState(false);
  const [eventSyncSubmitting, setEventSyncSubmitting] = useState(false);
  const [eventSyncResult, setEventSyncResult] = useState<
    { toOngoing: number; toPastFromOngoing: number; toPastFromUpcoming: number; error?: string } | null
  >(null);
  const [securityEnvValues, setSecurityEnvValues] = useState({ attendanceJwtSecret: '', indexNowKey: '' });
  const [securityEnvStatus, setSecurityEnvStatus] = useState<SecurityEnvStatus | null>(null);
  const [securityEnvSaving, setSecurityEnvSaving] = useState(false);
  const [securityEnvChecking, setSecurityEnvChecking] = useState(false);
  const savedTimerRef = useRef<number | null>(null);
  const canManageSecurityEnv = Boolean(user?.isSuperAdmin || user?.role === 'PRESIDENT');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = token ? await api.getAdminSettings(token) : await api.getSettings();
      setSettings({
        ...data,
        emailWelcomeBody: data.emailWelcomeBody ?? '',
        emailAnnouncementBody: data.emailAnnouncementBody ?? '',
        emailEventBody: data.emailEventBody ?? '',
        emailFooterText: data.emailFooterText ?? '',
      });
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchSettings(); }, [fetchSettings]);
  useEffect(() => () => { if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current); }, []);

  const fetchSecurityEnvStatus = useCallback(async () => {
    if (!token || !canManageSecurityEnv) return;
    setSecurityEnvChecking(true);
    try {
      const status = await api.getSecurityEnvStatus(token);
      setSecurityEnvStatus(status);
    } catch {
      setError('Failed to refresh security key status');
    } finally {
      setSecurityEnvChecking(false);
    }
  }, [token, canManageSecurityEnv]);

  useEffect(() => {
    if (canManageSecurityEnv) void fetchSecurityEnvStatus();
  }, [canManageSecurityEnv, fetchSecurityEnvStatus]);

  const handleToggle = async (key: keyof Settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (!token) return;
    try {
      await api.patchSetting(key as string, value, token);
      await refreshGlobalSettings();
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !value }));
      setError(`Failed to save ${key}`);
    }
  };

  const handleSave = async () => {
    if (!token) {
      setError('Authentication required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { id: _id, updatedAt: _u, emailWelcomeBody, emailAnnouncementBody, emailEventBody, emailFooterText, ...updateData } = settings;
      const updated = await api.updateSettings(updateData, token);
      await api.updateEmailTemplates({
        emailWelcomeBody: emailWelcomeBody ?? '',
        emailAnnouncementBody: emailAnnouncementBody ?? '',
        emailEventBody: emailEventBody ?? '',
        emailFooterText: emailFooterText ?? '',
      }, token);
      setSettings({ ...updated, emailWelcomeBody: emailWelcomeBody ?? '', emailAnnouncementBody: emailAnnouncementBody ?? '', emailEventBody: emailEventBody ?? '', emailFooterText: emailFooterText ?? '' });
      await refreshGlobalSettings();
      setSaved(true);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="lb-kicker">// admin · settings</div>
          <h1 className="font-display uppercase text-[clamp(28px,4vw,40px)] mt-2 leading-tight" style={{ letterSpacing: '0.04em' }}>
            CONTROL <span className="lb-h-accent">PANEL.</span>
          </h1>
          <p className="lb-sub max-w-xl mt-2">Configure platform behavior. Toggles auto-save. Save button persists text fields.</p>
        </div>
        <button onClick={fetchSettings} disabled={loading} className="lb-btn-ghost">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Brackets tag="error" accent="red">
            <div className="flex items-start gap-3 lb-mono text-xs" style={{ color: 'var(--c-red)' }}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          </Brackets>
        </motion.div>
      )}

      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Brackets tag="saved" accent="green">
            <div className="flex items-center gap-2 lb-mono text-xs" style={{ color: 'var(--c-green)' }}>
              <CheckCircle className="h-4 w-4" />
              <span>SETTINGS PERSISTED</span>
              <span className="lb-pulse" />
            </div>
          </Brackets>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Identity */}
        <Brackets tag="club.identity" accent="yellow">
          <div className="flex flex-col gap-4">
            <Field label="CLUB NAME">
              <input className="t-input" value={settings.clubName} onChange={(e) => setSettings({ ...settings, clubName: e.target.value })} placeholder="tesseract" />
            </Field>
            <Field label="CONTACT EMAIL">
              <input className="t-input" type="email" value={settings.clubEmail} onChange={(e) => setSettings({ ...settings, clubEmail: e.target.value })} placeholder="contact@tesseract.iitm.ac.in" />
            </Field>
            <Field label="DESCRIPTION">
              <textarea
                className="t-input"
                style={{ minHeight: 80 }}
                value={settings.clubDescription}
                onChange={(e) => setSettings({ ...settings, clubDescription: e.target.value })}
                placeholder="A student-built community for IITM BS…"
              />
            </Field>
            <Field label="MAX EVENTS PER USER">
              <input
                className="t-input"
                type="number"
                min={1}
                max={50}
                value={settings.maxEventsPerUser}
                onChange={(e) => setSettings({ ...settings, maxEventsPerUser: parseInt(e.target.value) || 5 })}
              />
            </Field>
          </div>
        </Brackets>

        {/* Features */}
        <Brackets tag="features" accent="green">
          <ToggleRow
            label="REGISTRATION OPEN"
            description="Allow users to register for events"
            checked={settings.registrationOpen}
            onChange={(v) => void handleToggle('registrationOpen', v)}
          />
          <ToggleRow
            label="ANNOUNCEMENTS"
            description="Enable announcement notifications"
            checked={settings.announcementsEnabled}
            onChange={(v) => void handleToggle('announcementsEnabled', v)}
          />
          <ToggleRow
            label="LEADERBOARD"
            description="Show leaderboard on dashboard"
            checked={settings.showLeaderboard ?? false}
            onChange={(v) => void handleToggle('showLeaderboard', v)}
          />
          <ToggleRow
            label="ACHIEVEMENTS"
            description="Show achievements section"
            checked={settings.showAchievements ?? true}
            onChange={(v) => void handleToggle('showAchievements', v)}
          />
          <ToggleRow
            label="CERTIFICATES"
            description="Allow admins to issue certificates"
            checked={settings.certificatesEnabled ?? true}
            onChange={(v) => void handleToggle('certificatesEnabled', v)}
          />
          <ToggleRow
            label="ATTENDANCE"
            description="QR check-in, scan, and attendance reports"
            checked={settings.attendanceEnabled ?? true}
            onChange={(v) => void handleToggle('attendanceEnabled', v)}
          />
        </Brackets>

        {/* Email notifications */}
        <Brackets tag="email.notifications" accent="blue" className="xl:col-span-2">
          {settings.emailTestingMode && (
            <div
              className="lb-mono text-xs mb-4 px-3 py-2"
              style={{ color: 'var(--c-yellow)', border: '1px solid var(--c-yellow)', background: 'rgba(255,217,59,0.08)' }}
            >
              ! TESTING MODE ACTIVE — emails redirect to test recipients
              {!settings.emailTestRecipients?.trim() && (
                <span style={{ color: 'var(--c-red)' }}> · NO RECIPIENTS CONFIGURED — ALL EMAILS SUPPRESSED</span>
              )}
            </div>
          )}

          <ToggleRow
            label="TESTING MODE"
            description="Redirect all emails to test addresses instead of real users"
            checked={settings.emailTestingMode ?? false}
            onChange={(v) => void handleToggle('emailTestingMode', v)}
          />

          {settings.emailTestingMode && (
            <div className="ml-4 my-3 pl-4" style={{ borderLeft: '2px solid var(--c-yellow)' }}>
              <Field label="TEST RECIPIENTS">
                <input
                  className="t-input"
                  value={settings.emailTestRecipients || ''}
                  onChange={(e) => setSettings({ ...settings, emailTestRecipients: e.target.value })}
                  onBlur={async () => {
                    if (!token) return;
                    try {
                      await api.patchSetting('emailTestRecipients', settings.emailTestRecipients || '', token);
                    } catch {
                      setError('Failed to save test recipients');
                    }
                  }}
                  placeholder="admin@example.com, dev@example.com"
                />
              </Field>
            </div>
          )}

          <div className="lb-kicker mt-4 mb-2">// category_toggles</div>
          {EMAIL_CATEGORIES.map(({ key, label, desc }) => (
            <ToggleRow
              key={key}
              label={label}
              description={desc}
              checked={settings[key] ?? true}
              onChange={(v) => void handleToggle(key, v)}
            />
          ))}
        </Brackets>

        {/* Social */}
        <Brackets tag="social.links" accent="purple" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="GITHUB">
              <input className="t-input" value={settings.githubUrl || ''} onChange={(e) => setSettings({ ...settings, githubUrl: e.target.value })} placeholder="https://github.com/your-org" />
            </Field>
            <Field label="LINKEDIN">
              <input className="t-input" value={settings.linkedinUrl || ''} onChange={(e) => setSettings({ ...settings, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/company/your-org" />
            </Field>
            <Field label="TWITTER">
              <input className="t-input" value={settings.twitterUrl || ''} onChange={(e) => setSettings({ ...settings, twitterUrl: e.target.value })} placeholder="https://twitter.com/your-org" />
            </Field>
            <Field label="INSTAGRAM">
              <input className="t-input" value={settings.instagramUrl || ''} onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })} placeholder="https://instagram.com/your-org" />
            </Field>
            <Field label="DISCORD">
              <input className="t-input" value={settings.discordUrl || ''} onChange={(e) => setSettings({ ...settings, discordUrl: e.target.value })} placeholder="https://discord.gg/invite-code" />
            </Field>
            <Field label="WHATSAPP COMMUNITY INVITE">
              <input
                className="t-input"
                value={settings.whatsappCommunityUrl || ''}
                onChange={(e) => setSettings({ ...settings, whatsappCommunityUrl: e.target.value })}
                placeholder="https://chat.whatsapp.com/…"
              />
              <p className="lb-mono text-[10px] mt-1" style={{ color: 'var(--fg-mute)', letterSpacing: '0.06em' }}>
                // shown on the Join Tesseract success screen + dashboard tile for members
              </p>
            </Field>
          </div>
        </Brackets>

        {/* Email templates */}
        <Brackets tag="email.templates" accent="orange" className="xl:col-span-2">
          <Field label="EMAIL FOOTER TEXT">
            <input
              className="t-input"
              value={settings.emailFooterText || ''}
              onChange={(e) => setSettings({ ...settings, emailFooterText: e.target.value })}
              placeholder="Building tomorrow's community."
            />
          </Field>

          <div className="flex gap-2 mt-4 mb-3 flex-wrap">
            {(['welcome', 'announcement', 'event'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveEmailTab(t)}
                className={`lb-pill ${activeEmailTab === t ? 'active t-yellow' : ''}`}
                style={{ textTransform: 'lowercase' }}
              >
                {t}
              </button>
            ))}
            <button onClick={() => setShowPreview(!showPreview)} className="lb-pill ml-auto">
              {showPreview ? '// edit' : '// preview'}
            </button>
          </div>

          {(['welcome', 'announcement', 'event'] as const).map((tab) => {
            if (activeEmailTab !== tab) return null;
            const fieldKey = tab === 'welcome' ? 'emailWelcomeBody' : tab === 'announcement' ? 'emailAnnouncementBody' : 'emailEventBody';
            const value = settings[fieldKey] as string | undefined;
            return showPreview ? (
              <div key={tab} className="p-4 lb-mono text-sm" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', minHeight: 150 }}>
                <Markdown>{value || '*No custom body — default template will be used.*'}</Markdown>
              </div>
            ) : (
              <textarea
                key={tab}
                className="t-input"
                style={{ minHeight: 200, fontFamily: '"JetBrains Mono", monospace' }}
                value={value || ''}
                onChange={(e) => setSettings({ ...settings, [fieldKey]: e.target.value })}
                placeholder={`Custom ${tab} body — Markdown supported. Variables: {{name}} {{clubName}}`}
              />
            );
          })}

          <p className="lb-mono text-[10px] mt-3" style={{ color: 'var(--fg-mute)', letterSpacing: '0.05em' }}>
            **bold** *italic* ## heading - bullet [text](url)
          </p>
        </Brackets>

        {/* Event status sync */}
        <Brackets tag="ops.event_sync" accent="green">
          <p className="lb-sub mb-4" style={{ marginTop: 0 }}>
            Auto-sync runs every 30 min. Trigger an instant sync now.
          </p>
          <button
            disabled={eventSyncSubmitting}
            className="lb-btn-ghost"
            onClick={async () => {
              if (!token) return;
              setEventSyncSubmitting(true);
              setEventSyncResult(null);
              try {
                const data = await api.syncEventStatus(token);
                setEventSyncResult(data);
              } catch (err) {
                setEventSyncResult({
                  toOngoing: 0,
                  toPastFromOngoing: 0,
                  toPastFromUpcoming: 0,
                  error: err instanceof Error ? err.message : 'Sync failed',
                });
              } finally {
                setEventSyncSubmitting(false);
              }
            }}
          >
            {eventSyncSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            SYNC NOW
          </button>
          {eventSyncResult && !eventSyncResult.error && (
            <p className="lb-mono text-xs mt-3" style={{ color: 'var(--c-green)' }}>
              ✓ UPDATED {eventSyncResult.toOngoing + eventSyncResult.toPastFromOngoing + eventSyncResult.toPastFromUpcoming}
              {' · '}
              upcoming→ongoing {eventSyncResult.toOngoing} · ongoing→past {eventSyncResult.toPastFromOngoing} · upcoming→past {eventSyncResult.toPastFromUpcoming}
            </p>
          )}
          {eventSyncResult?.error && (
            <p className="lb-mono text-xs mt-3" style={{ color: 'var(--c-red)' }}>! {eventSyncResult.error}</p>
          )}
        </Brackets>

        {/* Security keys */}
        {canManageSecurityEnv && (
          <Brackets tag="security.keys" accent="red">
            <p className="lb-sub mb-4" style={{ marginTop: 0 }}>
              ATTENDANCE_JWT_SECRET and INDEXNOW_KEY managed from privileged settings. Visible only to super admin / PRESIDENT.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ATTENDANCE_JWT_SECRET">
                <input
                  className="t-input"
                  type="password"
                  value={securityEnvValues.attendanceJwtSecret}
                  onChange={(e) => setSecurityEnvValues((prev) => ({ ...prev, attendanceJwtSecret: e.target.value }))}
                  placeholder="paste new secret"
                />
              </Field>
              <Field label="INDEXNOW_KEY">
                <input
                  className="t-input"
                  value={securityEnvValues.indexNowKey}
                  onChange={(e) => setSecurityEnvValues((prev) => ({ ...prev, indexNowKey: e.target.value }))}
                  placeholder="paste new key"
                />
              </Field>
            </div>
            <div className="flex gap-3 mt-4 flex-wrap">
              <button className="lb-btn-ghost" disabled={securityEnvChecking} onClick={() => void fetchSecurityEnvStatus()}>
                {securityEnvChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                REFRESH STATUS
              </button>
              <button
                className="lb-btn-primary"
                disabled={securityEnvSaving}
                onClick={async () => {
                  if (!token) return;
                  const payload: { attendanceJwtSecret?: string | null; indexNowKey?: string | null } = {};
                  const a = securityEnvValues.attendanceJwtSecret.trim();
                  const i = securityEnvValues.indexNowKey.trim();
                  if (a) payload.attendanceJwtSecret = a;
                  if (i) payload.indexNowKey = i;
                  if (!payload.attendanceJwtSecret && !payload.indexNowKey) {
                    setError('Enter at least one security value before saving.');
                    return;
                  }
                  setSecurityEnvSaving(true);
                  setError(null);
                  try {
                    const status = await api.updateSecurityEnvSettings(payload, token);
                    setSecurityEnvStatus(status);
                    setSecurityEnvValues({ attendanceJwtSecret: '', indexNowKey: '' });
                    setSaved(true);
                    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
                    savedTimerRef.current = window.setTimeout(() => setSaved(false), 3000);
                  } catch {
                    setError('Failed to save security env references');
                  } finally {
                    setSecurityEnvSaving(false);
                  }
                }}
              >
                {securityEnvSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                SAVE
              </button>
            </div>

            {securityEnvStatus && (
              <div className="mt-4 lb-mono text-xs space-y-1" style={{ color: 'var(--fg-dim)' }}>
                <div>RUNTIME: {securityEnvStatus.runtimeStatus.nodeEnv}</div>
                <div>
                  ATTENDANCE_JWT_SECRET: {securityEnvStatus.attendanceJwtSecretConfigured ? 'configured' : 'not configured'}
                  {securityEnvStatus.runtimeStatus.attendanceJwtSecretActive ? ' · active' : ' · inactive'}
                </div>
                <div>
                  INDEXNOW_KEY: {securityEnvStatus.indexNowKeyConfigured ? 'configured' : 'not configured'}
                  {securityEnvStatus.runtimeStatus.indexNowKeyActive ? ' · active' : ' · inactive'}
                </div>
                {securityEnvStatus.updatedAt && <div>UPDATED: {formatDateTime(securityEnvStatus.updatedAt)}</div>}
              </div>
            )}
          </Brackets>
        )}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <button onClick={fetchSettings} disabled={saving} className="lb-btn-ghost">RESET</button>
        <button onClick={handleSave} disabled={saving} className="lb-btn-primary">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> SAVING…</> : <><Save className="h-4 w-4" /> SAVE TEXT FIELDS</>}
        </button>
      </div>

      {settings.updatedAt && (
        <p className="lb-mono text-[10px] text-right" style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
          // last_updated · {formatDateTime(settings.updatedAt)}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="t-field">
      <label className="t-label">{label}</label>
      {children}
    </div>
  );
}
