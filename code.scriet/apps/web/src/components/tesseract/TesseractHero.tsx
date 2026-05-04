import { useEffect, useRef } from 'react';

interface TesseractHeroProps {
  size?: number;
  speed?: number;
  glow?: boolean;
  palette?: string[];
}

const DEFAULT_PALETTE = ['#ff3b3b', '#ffb73b', '#ffd93b', '#5eff7a', '#3bb0ff', '#a855f7'];

export function TesseractHero({ size = 420, speed = 1, glow = true, palette }: TesseractHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Cap DPR to 1.5 — full retina (2x) doubles per-frame work for marginal visual gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    // Respect prefers-reduced-motion
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    // 16 vertices of a tesseract
    const verts: number[][] = [];
    for (let i = 0; i < 16; i++) {
      verts.push([
        i & 1 ? 1 : -1,
        i & 2 ? 1 : -1,
        i & 4 ? 1 : -1,
        i & 8 ? 1 : -1,
      ]);
    }

    // edges: pairs of vertices differing in exactly one bit
    const edges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const diff = i ^ j;
        if ((diff & (diff - 1)) === 0) edges.push([i, j]);
      }
    }

    const colors = palette || DEFAULT_PALETTE;
    let raf: number;
    let isVisible = true;
    let isPaused = false;
    const t0 = performance.now();
    let lastFrame = t0;
    const FRAME_MS = 1000 / 30; // cap at 30fps — 4D wireframe doesn't need 60

    const rot4 = (v: number[], a: number, b: number, theta: number): number[] => {
      const c = Math.cos(theta), s = Math.sin(theta);
      const u = v.slice();
      u[a] = v[a] * c - v[b] * s;
      u[b] = v[a] * s + v[b] * c;
      return u;
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!isVisible || isPaused || reduceMotion) return;
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      const t = ((now - t0) / 1000) * speed;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2, cy = size / 2;
      const proj = verts.map((v) => {
        let p = rot4(v, 0, 3, t * 0.55);
        p = rot4(p, 1, 3, t * 0.41);
        p = rot4(p, 2, 3, t * 0.33);
        p = rot4(p, 0, 1, t * 0.27);
        p = rot4(p, 1, 2, t * 0.23);
        p = rot4(p, 0, 2, t * 0.19);
        const w = 3.5;
        const f4 = 1.6 / (w - p[3]);
        const x3 = p[0] * f4, y3 = p[1] * f4, z3 = p[2] * f4;
        const d = 4;
        const f3 = d / (d - z3);
        return {
          x: cx + x3 * f3 * size * 0.28,
          y: cy + y3 * f3 * size * 0.28,
          depth: (z3 + 1.5) / 3,
          w4: p[3],
        };
      });

      const ei = edges
        .map((e, idx) => ({ e, idx, depth: (proj[e[0]].depth + proj[e[1]].depth) / 2 }))
        .sort((a, b) => a.depth - b.depth);

      ei.forEach(({ e, idx }) => {
        const a = proj[e[0]], b = proj[e[1]];
        const avgDepth = (a.depth + b.depth) / 2;
        const alpha = 0.25 + avgDepth * 0.75;
        const color = colors[idx % colors.length];

        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 * avgDepth;
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.2 + avgDepth * 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      proj.forEach((p, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.5 + p.depth * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + p.depth * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);

    // Pause when canvas not in viewport
    const io = new IntersectionObserver(
      (entries) => { isVisible = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 },
    );
    io.observe(canvas);

    // Pause when tab hidden
    const onVisibility = () => { isPaused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [size, speed, palette, glow]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
