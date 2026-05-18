import { Link } from 'react-router-dom';

const brandPalettes = {
  instagram: {
    color: '#FF007F', // Neon Magenta
    shadow: 'rgba(255, 0, 127, 0.45)',
    glow: 'rgba(255, 0, 127, 0.15)',
    tag: 'IG.SYS',
    ping: '18ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
  },
  linkedin: {
    color: '#00E5FF', // Neon Cyan
    shadow: 'rgba(0, 229, 255, 0.45)',
    glow: 'rgba(0, 229, 255, 0.15)',
    tag: 'IN.NET',
    ping: '32ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
  },
  discord: {
    color: '#7000FF', // Neon Purple
    shadow: 'rgba(112, 0, 255, 0.45)',
    glow: 'rgba(112, 0, 255, 0.15)',
    tag: 'DS.COM',
    ping: '12ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111370.png',
  },
  mail: {
    color: '#FF3B30', // Neon Red
    shadow: 'rgba(255, 59, 48, 0.45)',
    glow: 'rgba(255, 59, 48, 0.15)',
    tag: 'MX.PORT',
    ping: '22ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
  },
  whatsapp: {
    color: '#00FF66', // Neon Emerald
    shadow: 'rgba(0, 255, 102, 0.45)',
    glow: 'rgba(0, 255, 102, 0.15)',
    tag: 'WA.NODE',
    ping: '28ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
  },
  youtube: {
    color: '#FF0000', // Laser Red
    shadow: 'rgba(255, 0, 0, 0.45)',
    glow: 'rgba(255, 0, 0, 0.15)',
    tag: 'YT.CORE',
    ping: '14ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
  },
  reddit: {
    color: '#FF5500', // Cyber Orange
    shadow: 'rgba(255, 85, 0, 0.45)',
    glow: 'rgba(255, 85, 0, 0.15)',
    tag: 'RD.MATRIX',
    ping: '25ms',
    // High-res glossy Flaticon CDN logo
    cdnUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111589.png',
  },
};

const stylesString = `
  @keyframes scanline-slide {
    0% { transform: translate(-30%, -30%) rotate(25deg); }
    100% { transform: translate(30%, 30%) rotate(25deg); }
  }
  @keyframes neon-pulse {
    0%, 100% { opacity: 0.9; box-shadow: 0 0 8px currentColor; }
    50% { opacity: 0.6; box-shadow: 0 0 4px currentColor; }
  }
  @keyframes crt-flicker {
    0%, 100% { opacity: 0.98; }
    10% { opacity: 0.90; }
    15% { opacity: 0.98; }
    70% { opacity: 0.95; }
    75% { opacity: 0.85; }
    80% { opacity: 0.98; }
  }
  @keyframes status-blink {
    0%, 100% { background: #00FF66; box-shadow: 0 0 10px #00FF66; }
    50% { background: #008833; box-shadow: 0 0 2px #008833; }
  }
  .cyber-arcade-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: #0d0d14;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .cyber-arcade-btn::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 45%, rgba(255,255,255,0.08) 50%, transparent 55%);
    background-size: 100% 6px;
    pointer-events: none;
    opacity: 0.4;
  }
  .scanline-bar {
    position: absolute;
    top: -100%;
    left: -100%;
    width: 300%;
    height: 300%;
    background: linear-gradient(
      115deg, 
      transparent 40%, 
      rgba(255, 255, 255, 0.25) 48%, 
      rgba(255, 255, 255, 0.5) 50%, 
      rgba(255, 255, 255, 0.25) 52%, 
      transparent 60%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 2;
  }
  .cyber-arcade-btn:hover .scanline-bar {
    opacity: 1;
    animation: scanline-slide 2.2s linear infinite;
  }
`;

const socialsData = [
  {
    href: 'https://www.instagram.com/tesseract_iitm',
    label: 'Instagram',
    brand: 'instagram' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/company/tesseract-iitm',
    label: 'LinkedIn',
    brand: 'linkedin' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
        <rect x="2" y="3" width="4" height="4" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: 'https://discord.gg/UFA53dQJdT',
    label: 'Discord',
    brand: 'discord' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: 'mailto:24f3000984@ds.study.iitm.ac.in',
    label: 'Mail',
    brand: 'mail' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7M2 17l6.5-5M22 17l-6.5-5" />
      </svg>
    ),
  },
  {
    href: 'https://chat.whatsapp.com/LRgZ03jPCJLAfKt5Nl3G7H',
    label: 'WhatsApp',
    brand: 'whatsapp' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 9 3.8z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: 'https://www.youtube.com/@Tesseract-i5t',
    label: 'YouTube',
    brand: 'youtube' as const,
    // Pixel-perfect gamified vector wireframe for Case B
    wireframe: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="4" width="20" height="15" rx="3" />
        <line x1="6" y1="19" x2="18" y2="19" />
        <polygon points="10 9 15 11.5 10 14" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: stylesString }} />
      <footer className="tf-root">
        <div className="tf-corner tf-c-tl" />
        <div className="tf-corner tf-c-tr" />

        {/* Main Directory & Brand Sector */}
        <div className="tf-main" style={{ display: 'grid', gridTemplateColumns: '1.3fr 2.7fr', gap: 64, paddingBottom: 40 }}>
          <div className="tf-brand">
            <img src="/tesseract-logo.png" alt="Tesseract" className="tf-logo" />
            <div className="tf-brand-text">
              <div className="tf-wordmark">TESSERACT</div>
              <div className="tf-tag">// a student-built corner of IITM BS</div>
              <div className="tf-blurb">skip the lecture loop. play, pause, belong.</div>
            </div>
          </div>

          <div className="tf-cols">
            <div className="tf-col">
              <h4>PLATFORM</h4>
              <Link to="/">Home</Link>
              <Link to="/games">Games</Link>
              <Link to="/events">Events</Link>
              <Link to="/leaderboard">Leaderboard</Link>
            </div>
            <div className="tf-col">
              <h4>RESOURCES</h4>
              <Link to="/join">Join Us</Link>
              <Link to="/verify">Verify Certificate</Link>
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

        {/* ============================================================
           OPTION 2 CENTERED - GAMIFIED HUD DECK (Sleek Social Switches)
           ============================================================ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            padding: '32px 16px',
            borderTop: '1px dashed rgba(255,255,255,0.08)',
            borderBottom: '1px dashed rgba(255,255,255,0.08)',
            position: 'relative',
            zIndex: 2,
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.03) 0%, rgba(7,7,11,0) 80%)'
          }}
        >
          {socialsData.map((s) => {
            const colors = brandPalettes[s.brand];
            return (
              <a
                key={s.brand}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-arcade-btn"
                style={{
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: '#0d0d14',
                  color: colors.color,
                  boxShadow: `0 4px 0px ${colors.color}33, inset 0 1px 0px rgba(255,255,255,0.1)`,
                  animation: 'crt-flicker 5s infinite',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.color;
                  e.currentTarget.style.background = '#151522';
                  e.currentTarget.style.transform = 'translateY(3px)';
                  e.currentTarget.style.boxShadow = `0 1px 0px ${colors.color}, 0 0 18px ${colors.shadow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.background = '#0d0d14';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 0px ${colors.color}33, inset 0 1px 0px rgba(255,255,255,0.1)`;
                }}
              >
                <div className="scanline-bar" />
                <img
                  src={colors.cdnUrl}
                  alt={s.label}
                  style={{
                    width: '24px',
                    height: '24px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))'
                  }}
                />
              </a>
            );
          })}
        </div>

        {/* Bottom Strip */}
        <div className="tf-strip" style={{ borderTop: 'none', paddingTop: 20 }}>
          <div className="tf-strip-meta">
            <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>v1.0.0</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span className="lb-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>status · <span className="lb-green">operational</span></span>
          </div>
          <div className="tf-legal">© {new Date().getFullYear()} Tesseract · built by students, for students</div>

          {/* Developer Attributions Monospace Log */}
          <div style={{ marginTop: 14, opacity: 0.22, fontSize: '8.5px', display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontFamily: '"JetBrains Mono", monospace' }}>
            <span style={{ color: 'var(--fg-mute)' }}>// ATTRIBUTIONS:</span>
            <a href="https://www.flaticon.com/free-icons/instagram" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>instagram (freepik)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/linkedin" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>linkedin (ruslan babkin)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/discord" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>discord (pixel perfect)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/email" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>email (pixel perfect)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/whatsapp" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>whatsapp (fathema khanom)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/youtube" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>youtube (freepik)</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://www.flaticon.com/free-icons/reddit" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>reddit (ruslan babkin)</a>
          </div>
        </div>
      </footer>
    </>
  );
}
