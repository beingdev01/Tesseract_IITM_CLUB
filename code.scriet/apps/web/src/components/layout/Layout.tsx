import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50" style={{ background: '#000', color: '#ffd93b', padding: '8px 16px' }}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
