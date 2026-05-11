import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brackets } from '@/components/tesseract/Brackets';
import { PageShell } from '@/components/tesseract/PageShell';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface PlayShellProps {
  title: string;
  accent?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  children: ReactNode;
}

export function PlayShell({ title, accent = 'yellow', children }: PlayShellProps) {
  return (
    <PageShell>
      <Header />
      <main style={{ padding: '40px 24px 80px', position: 'relative', zIndex: 2, maxWidth: 1180, margin: '0 auto' }}>
        <Link to="/games" className="lb-mono" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: 11 }}>
          ← BACK TO GAMES
        </Link>
        <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: 'clamp(28px,5vw,48px)', margin: '18px 0 24px' }}>
          {title}
        </h1>
        <Brackets accent={accent} style={{ padding: 20 }}>
          {children}
        </Brackets>
      </main>
      <Footer />
    </PageShell>
  );
}

export function PlayError({ message }: { message: string }) {
  return <p className="lb-mono" style={{ color: 'var(--c-red)', fontSize: 12 }}>{message}</p>;
}

export function PlayLoading() {
  return <p className="lb-mono ts-blink" style={{ color: 'var(--c-green)', fontSize: 12 }}>{'>'} loading...</p>;
}
