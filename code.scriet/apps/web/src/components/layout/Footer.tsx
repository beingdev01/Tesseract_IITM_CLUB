import { Link } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';

export function Footer() {
  const { settings } = useSettings();

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
            <h4>COMMUNITY</h4>
            {settings?.discordUrl && <a href={settings.discordUrl} target="_blank" rel="noopener noreferrer">Discord</a>}
            {settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {settings?.githubUrl && <a href={settings.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>}
            <Link to="/privacy-policy">Privacy Policy</Link>
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
