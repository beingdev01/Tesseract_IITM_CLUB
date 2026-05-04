"use client";

import { useEffect, useRef } from "react";

type TesseractHeroProps = {
  size?: number;
  speed?: number;
  palette?: string[];
  glow?: boolean;
};

export function TesseractHero({
  size = 420,
  speed = 1,
  palette,
  glow = true,
}: TesseractHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    // ── 4D vertices ──────────────────────────────────────────────────────
    const verts: number[][] = [];
    for (let i = 0; i < 16; i++) {
      verts.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
    }
    const edges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const d = i ^ j;
        if ((d & (d - 1)) === 0) edges.push([i, j]);
      }
    }

    const colors = palette || ["#ff3b3b", "#ffb73b", "#ffd93b", "#5eff7a", "#3bb0ff", "#a855f7"];

    const rot4 = (v: number[], a: number, b: number, theta: number) => {
      const c = Math.cos(theta), s = Math.sin(theta);
      const u = v.slice();
      u[a] = v[a] * c - v[b] * s;
      u[b] = v[a] * s + v[b] * c;
      return u;
    };

    // ── Auto-rotation accumulators ───────────────────────────────────────
    let autoXY = 0, autoXZ = 0, autoYZ = 0;
    let autoXW = 0, autoYW = 0, autoZW = 0;

    // ── Hover influence ───────────────────────────────────────────────────
    let targetX = 0, targetY = 0;
    let smoothX = 0, smoothY = 0;
    const HOVER_STRENGTH = 2.5;
    const HOVER_SMOOTH = 0.04;
    const LEAVE_SMOOTH = 0.02;
    let isHovered = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!isHovered) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      targetX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width  / 2)));
      targetY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
    };

    const onMouseEnter = () => { isHovered = true; };
    const onMouseLeave = () => {
      isHovered = false;
      targetX = 0;
      targetY = 0;
    };

    canvas.addEventListener("mouseenter", onMouseEnter);
    canvas.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("mousemove", onMouseMove);
    canvas.style.cursor = "crosshair";

    // ── Render loop ──────────────────────────────────────────────────────
    let raf = 0;
    let lastNow = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      autoXY += 0.55 * speed * dt;
      autoXZ += 0.27 * speed * dt;
      autoYZ += 0.23 * speed * dt;
      autoXW += 0.41 * speed * dt;
      autoYW += 0.33 * speed * dt;
      autoZW += 0.19 * speed * dt;

      // dt-corrected lerp so smoothness is frame-rate independent
      const k = isHovered ? HOVER_SMOOTH : LEAVE_SMOOTH;
      // Convert per-frame lerp to dt-based: 1-(1-k)^(dt*60)
      const lerpAlpha = 1 - Math.pow(1 - k, dt * 60);
      smoothX += (targetX - smoothX) * lerpAlpha;
      smoothY += (targetY - smoothY) * lerpAlpha;

      const thetaXY = autoXY + smoothX * HOVER_STRENGTH;
      const thetaXW = autoXW + smoothY * HOVER_STRENGTH;

      ctx.clearRect(0, 0, size, size);
      const half = size / 2;

      const proj = verts.map((v) => {
        let p = rot4(v, 0, 1, thetaXY);
        p = rot4(p, 0, 3, thetaXW);
        p = rot4(p, 1, 3, autoYW);
        p = rot4(p, 2, 3, autoZW);
        p = rot4(p, 0, 2, autoXZ);
        p = rot4(p, 1, 2, autoYZ);
        const w = 3.5, f4 = 1.6 / (w - p[3]);
        const x3 = p[0] * f4, y3 = p[1] * f4, z3 = p[2] * f4;
        const d = 4, f3 = d / (d - z3);
        return {
          x: half + x3 * f3 * size * 0.33,
          y: half + y3 * f3 * size * 0.33,
          depth: (z3 + 1.5) / 3,
        };
      });

      const ei = edges
        .map((e, idx) => ({ e, idx, depth: (proj[e[0]].depth + proj[e[1]].depth) / 2 }))
        .sort((a, b) => a.depth - b.depth);

      ei.forEach(({ e, idx }) => {
        const a = proj[e[0]], b = proj[e[1]];
        const avg = (a.depth + b.depth) / 2;
        const color = colors[idx % colors.length];

        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 40 * avg;
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.3 + avg * 0.4;
          ctx.lineWidth = 10 + avg * 8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.shadowBlur = 15 * avg;
        }

        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.7 + avg * 0.3;   
        ctx.lineWidth = 4 + avg * 3;         
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Vertices — larger, brighter dots
      proj.forEach((p, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.85 + p.depth * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + p.depth * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mouseenter", onMouseEnter);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [size, speed, palette, glow]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}
