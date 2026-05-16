import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: '[01] games',  href: '/games' },
  { label: '[02] events', href: '/events' },
  { label: '[03] ranks',  href: '/leaderboard' },
  { label: '[04] about',  href: '/about' },
];

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(83);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const id = setInterval(() => {
      setOnline((v) => Math.max(40, Math.min(200, v + (Math.random() > 0.5 ? 1 : -1))));
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // Always reset body overflow on mount — defends against stuck scroll lock
  // from a previous page session that didn't clean up properly.
  useEffect(() => {
    document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = useCallback((href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  }, [location.pathname]);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)' }}>
      <nav className="lb-nav">
        {/* Logo */}
        <Link to="/" className="lb-logo-wrap" style={{ textDecoration: 'none' }}>
          <img src="/tesseract-logo.png" alt="Tesseract" className="lb-logo" />
          <div>
            <div className="lb-wordmark">TESSERACT</div>
            <div className="lb-wordmark-sub">// IITM_BS.community</div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="lb-nav-links" style={{ display: 'none' }} id="desktop-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={isActive(item.href) ? 'active' : ''}
              style={{ textDecoration: 'none', fontFamily: '"JetBrains Mono", monospace' }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="lb-nav-cta" id="desktop-cta">
          <div className="lb-status">
            <span className="lb-status-dot" />
            <span className="lb-mono" style={{ fontSize: '11px' }}>{online} online</span>
          </div>
          <Link to="/join" className="lb-btn-primary" style={{ textDecoration: 'none', fontSize: '12px', padding: '8px 14px' }}>
            JOIN TESSERACT ▶
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="lb-btn-ghost" style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}>
                DASHBOARD ▶
              </Link>
              <button className="lb-btn-ghost" onClick={logout} style={{ fontSize: '12px', padding: '8px 14px' }}>
                SIGN OUT
              </button>
            </>
          ) : (
            <Link to="/signin" className="lb-btn-ghost" style={{ textDecoration: 'none', fontSize: '12px', padding: '8px 14px' }}>
              INSERT COIN ▶
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuBtnRef}
          className="lb-btn-ghost"
          style={{ padding: '8px', display: 'none' }}
          id="mobile-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              ref={menuRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: 280,
                background: 'var(--bg-1)', borderLeft: '1px solid var(--line-2)',
                padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
                <div className="lb-wordmark" style={{ fontSize: '16px' }}>TESSERACT</div>
                <div className="lb-wordmark-sub">// IITM_BS.community</div>
              </div>

              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  style={{
                    display: 'block', padding: '12px 16px', textDecoration: 'none',
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '12px',
                    color: isActive(item.href) ? 'var(--c-yellow)' : 'rgba(255,255,255,0.6)',
                    background: isActive(item.href) ? 'rgba(255,217,59,0.06)' : 'transparent',
                    borderLeft: isActive(item.href) ? '2px solid var(--c-yellow)' : '2px solid transparent',
                    transition: 'color 0.2s, border-color 0.2s',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </Link>
              ))}

              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/join" className="lb-btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '12px', fontSize: '12px' }}>
                  JOIN TESSERACT ▶
                </Link>
                {user ? (
                  <>
                    <Link to="/dashboard" className="lb-btn-ghost" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '12px', fontSize: '12px' }}>
                      DASHBOARD ▶
                    </Link>
                    <button className="lb-btn-ghost" onClick={logout} style={{ width: '100%', fontSize: '12px' }}>
                      SIGN OUT
                    </button>
                  </>
                ) : (
                  <Link to="/signin" className="lb-btn-ghost" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '12px', fontSize: '12px' }}>
                    INSERT COIN ▶
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          #desktop-nav { display: flex !important; }
          #mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          #desktop-cta { display: none !important; }
          #mobile-menu-btn { display: flex !important; }
          .lb-nav { padding: 14px 20px; }
        }
      `}</style>
    </header>
  );
}
