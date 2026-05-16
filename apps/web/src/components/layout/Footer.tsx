import { Link } from 'react-router-dom';
import { Github, Instagram, Linkedin, Twitter, MessagesSquare } from 'lucide-react';
import type { ComponentType } from 'react';
import { useSettings } from '@/context/SettingsContext';

const iconLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'rgba(255,255,255,0.7)',
  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
};

function SocialIcon({
  href,
  label,
  Icon,
}: {
  href: string | null | undefined;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      style={iconLinkStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--c-yellow)';
        e.currentTarget.style.borderColor = 'var(--c-yellow)';
        e.currentTarget.style.background = 'rgba(255,217,59,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={16} strokeWidth={1.6} />
    </a>
  );
}

export function Footer() {
  const { settings } = useSettings();

  const anySocial = Boolean(
    settings?.discordUrl ||
      settings?.instagramUrl ||
      settings?.githubUrl ||
      settings?.linkedinUrl ||
      settings?.twitterUrl,
  );

  return (
    <footer className="tf-root">
      <div className="tf-corner tf-c-tl" />
      <div className="tf-corner tf-c-tr" />

      <div className="tf-main">
        {/* Brand block */}
        <div className="tf-brand">
          <img src="/tesseract-logo.png" alt="Tesseract" className="tf-logo" />
          <div className="tf-brand-text">
            <div className="tf-wordmark">TESSERACT</div>
            <div className="tf-tag">// a student-built corner of IITM BS</div>
            <div className="tf-blurb">skip the lecture loop. play, pause, belong.</div>
          </div>
        </div>

        {/* Columns */}
        <div className="tf-cols">
          <div className="tf-col">
            <h4>PLATFORM</h4>
            <Link to="/">Home</Link>
            <Link to="/games">Games</Link>
            <Link to="/events">Events</Link>
            <Link to="/leaderboard">Leaderboard</Link>
          </div>
          <div className="tf-col">
            <h4>SOCIAL</h4>
            {anySocial ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <SocialIcon href={settings?.discordUrl} label="Discord" Icon={MessagesSquare} />
                <SocialIcon href={settings?.instagramUrl} label="Instagram" Icon={Instagram} />
                <SocialIcon href={settings?.githubUrl} label="GitHub" Icon={Github} />
                <SocialIcon href={settings?.linkedinUrl} label="LinkedIn" Icon={Linkedin} />
                <SocialIcon href={settings?.twitterUrl} label="Twitter / X" Icon={Twitter} />
              </div>
            ) : (
              <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>// not configured</span>
            )}
            <Link to="/privacy-policy" style={{ marginTop: 12 }}>Privacy Policy</Link>
          </div>
          <div className="tf-col">
            <h4>CORE</h4>
            <Link to="/about">About</Link>
            <Link to="/members">Members</Link>
            <Link to="/achievements">Achievements</Link>
            <Link to="/announcements">Announcements</Link>
          </div>
          <div className="tf-col">
            <h4>ACCESS</h4>
            <div className="tf-domain">@ds.study.iitm.ac.in</div>
            <div className="tf-domain">@es.study.iitm.ac.in</div>
            <div className="tf-domain tf-deny">external · denied</div>
          </div>
        </div>
      </div>

      <div className="tf-strip">
        <div className="tf-strip-meta">
          <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>v1.0.0</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>status · <span className="lb-green">operational</span></span>
        </div>
        <div className="tf-legal">© {new Date().getFullYear()} Tesseract · built by students, for students</div>
      </div>
    </footer>
  );
}
