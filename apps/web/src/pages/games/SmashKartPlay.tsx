import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayShell } from './PlayShell';

const TRACK_W = 960;
const TRACK_H = 540;
const TOTAL_LAPS = 3;
const ITEM_RESPAWN_MS = 9000;
const COUNTDOWN_SECS = 3;
const MAX_RACE_TIME = 240;

type Vec = { x: number; y: number };

interface Kart {
  id: string;
  name: string;
  color: string;
  pos: Vec;
  vel: Vec;
  angle: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  isPlayer: boolean;
  finishedAt: number | null;
  boostUntil: number;
  hitUntil: number;
}

interface BananaPeel {
  id: number;
  pos: Vec;
}

interface ItemBox {
  id: number;
  pos: Vec;
  active: boolean;
  respawnAt: number;
}

type GameState = 'idle' | 'countdown' | 'racing' | 'finished';

// Oval-ish track defined as inner/outer boundaries. We'll compute geometry from a centerline.
// Centerline polyline (clockwise) — outlines a curved figure-8-ish track.
const CENTERLINE: Vec[] = [
  { x: 200, y: 120 },
  { x: 460, y: 90 },
  { x: 720, y: 110 },
  { x: 860, y: 200 },
  { x: 820, y: 330 },
  { x: 660, y: 420 },
  { x: 480, y: 430 },
  { x: 300, y: 410 },
  { x: 140, y: 330 },
  { x: 110, y: 220 },
];
const TRACK_HALF_WIDTH = 56;

const CHECKPOINTS = CENTERLINE.map((p, i) => ({ ...p, idx: i }));

const AI_COLORS = ['#3bb0ff', '#5eff7a', '#a855f7', '#ff8a3b'];
const AI_NAMES = ['CPU·NEON', 'CPU·VOLT', 'CPU·PIXEL', 'CPU·RUSH'];

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distanceToTrackCenter(p: Vec): number {
  let min = Infinity;
  for (let i = 0; i < CENTERLINE.length; i++) {
    const a = CENTERLINE[i]!;
    const b = CENTERLINE[(i + 1) % CENTERLINE.length]!;
    min = Math.min(min, pointToSegment(p, a, b));
  }
  return min;
}

function formatTime(ms: number): string {
  const s = Math.max(0, ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const cs = Math.floor((s * 100) % 100);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function createKart(opts: Partial<Kart> & Pick<Kart, 'id' | 'name' | 'color' | 'isPlayer'>): Kart {
  const start = CENTERLINE[0]!;
  return {
    pos: { x: start.x, y: start.y },
    vel: { x: 0, y: 0 },
    angle: 0,
    speed: 0,
    lap: 0,
    nextCheckpoint: 1,
    finishedAt: null,
    boostUntil: 0,
    hitUntil: 0,
    ...opts,
  };
}

export default function SmashKartPlay() {
  const { token } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    karts: Kart[];
    peels: BananaPeel[];
    items: ItemBox[];
    keys: Set<string>;
    playerHasItem: 'boost' | 'peel' | null;
    startTime: number;
    countdownStart: number;
    state: GameState;
    bananaSeed: number;
    raf: number;
  }>({
    karts: [],
    peels: [],
    items: [],
    keys: new Set(),
    playerHasItem: null,
    startTime: 0,
    countdownStart: 0,
    state: 'idle',
    bananaSeed: 0,
    raf: 0,
  });

  const [, setTick] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [hudLap, setHudLap] = useState(0);
  const [hudPos, setHudPos] = useState(1);
  const [hudTime, setHudTime] = useState(0);
  const [hudItem, setHudItem] = useState<'boost' | 'peel' | null>(null);
  const [countdownNum, setCountdownNum] = useState(COUNTDOWN_SECS);
  const [results, setResults] = useState<{ place: number; time: number; score: number } | null>(null);
  const [posted, setPosted] = useState(false);

  const sessionMutation = useMutation({
    mutationFn: (payload: { score: number; durationSeconds: number }) => {
      if (!token) throw new Error('Sign in required');
      return api.createGameSession('smash-kart', token, payload);
    },
    onSuccess: () => toast.success('Race recorded · leaderboard updated'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to record race'),
  });

  const beginRace = useCallback(() => {
    const player = createKart({ id: 'player', name: 'YOU', color: '#ff3b3b', isPlayer: true });
    player.pos = { x: CENTERLINE[0]!.x, y: CENTERLINE[0]!.y + 18 };
    player.angle = Math.atan2(CENTERLINE[1]!.y - CENTERLINE[0]!.y, CENTERLINE[1]!.x - CENTERLINE[0]!.x);

    const ais: Kart[] = AI_COLORS.map((color, i) => {
      const k = createKart({ id: `ai-${i}`, name: AI_NAMES[i]!, color, isPlayer: false });
      k.pos = { x: CENTERLINE[0]!.x + (i - 1.5) * 14, y: CENTERLINE[0]!.y - 12 - i * 4 };
      k.angle = player.angle;
      return k;
    });

    const items: ItemBox[] = [2, 5, 8].map((idx, i) => ({
      id: i,
      pos: { ...CENTERLINE[idx]! },
      active: true,
      respawnAt: 0,
    }));

    stateRef.current.karts = [player, ...ais];
    stateRef.current.peels = [];
    stateRef.current.items = items;
    stateRef.current.playerHasItem = null;
    stateRef.current.bananaSeed = 0;
    stateRef.current.countdownStart = performance.now();
    stateRef.current.state = 'countdown';
    setGameState('countdown');
    setCountdownNum(COUNTDOWN_SECS);
    setHudLap(0);
    setHudPos(1);
    setHudTime(0);
    setHudItem(null);
    setResults(null);
    setPosted(false);
  }, []);

  // Input handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault();
      }
      stateRef.current.keys.add(k);
      if (k === ' ' && stateRef.current.playerHasItem) {
        useItem();
      }
    };
    const up = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useItem = useCallback(() => {
    const s = stateRef.current;
    const player = s.karts[0];
    if (!player || !s.playerHasItem) return;
    if (s.playerHasItem === 'boost') {
      player.boostUntil = performance.now() + 2000;
    } else {
      // Drop banana peel slightly behind player.
      const back = 16;
      s.peels.push({
        id: ++s.bananaSeed,
        pos: {
          x: player.pos.x - Math.cos(player.angle) * back,
          y: player.pos.y - Math.sin(player.angle) * back,
        },
      });
    }
    s.playerHasItem = null;
    setHudItem(null);
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepGame(dt, now);
      render(ctx, now);
      stateRef.current.raf = requestAnimationFrame(loop);
    };
    stateRef.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stepGame(dt: number, now: number) {
    const s = stateRef.current;
    if (s.state === 'countdown') {
      const elapsed = (now - s.countdownStart) / 1000;
      const remaining = COUNTDOWN_SECS - elapsed;
      const display = Math.max(0, Math.ceil(remaining));
      if (display !== countdownNum) setCountdownNum(display);
      if (remaining <= 0) {
        s.state = 'racing';
        s.startTime = now;
        setGameState('racing');
      }
      return;
    }
    if (s.state !== 'racing') return;

    const player = s.karts[0]!;
    const elapsed = (now - s.startTime) / 1000;
    setHudTime(elapsed);

    // Hard time limit safety
    if (elapsed > MAX_RACE_TIME) {
      finishRace(now, false);
      return;
    }

    // Reactivate items
    for (const item of s.items) {
      if (!item.active && now >= item.respawnAt) {
        item.active = true;
      }
    }

    // Update karts
    for (const k of s.karts) {
      if (k.finishedAt !== null) continue;
      const isHit = now < k.hitUntil;
      const boost = now < k.boostUntil;

      let throttle = 0;
      let steer = 0;
      if (k.isPlayer) {
        const keys = s.keys;
        if (keys.has('arrowup') || keys.has('w')) throttle = 1;
        if (keys.has('arrowdown') || keys.has('s')) throttle = -0.6;
        if (keys.has('arrowleft') || keys.has('a')) steer = -1;
        if (keys.has('arrowright') || keys.has('d')) steer = 1;
      } else {
        // Simple AI: aim at next checkpoint with mild noise; slow into hits.
        const target = CENTERLINE[k.nextCheckpoint % CENTERLINE.length]!;
        const tx = target.x - k.pos.x;
        const ty = target.y - k.pos.y;
        const targetAngle = Math.atan2(ty, tx);
        let diff = targetAngle - k.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        steer = Math.max(-1, Math.min(1, diff * 3));
        const offTrack = distanceToTrackCenter(k.pos) > TRACK_HALF_WIDTH - 6;
        throttle = offTrack ? 0.6 : 1;
      }

      if (isHit) throttle *= 0.2;

      const maxSpeed = (k.isPlayer ? 180 : 168) * (boost ? 1.6 : 1) * (isHit ? 0.4 : 1);
      const accel = 240 * throttle;
      const friction = 1.6;

      k.speed += accel * dt;
      k.speed -= k.speed * friction * dt;
      k.speed = Math.max(-maxSpeed * 0.4, Math.min(maxSpeed, k.speed));

      // Steering responsiveness scaled by speed
      const speedRatio = Math.min(1, Math.abs(k.speed) / maxSpeed);
      k.angle += steer * 2.4 * dt * (0.4 + speedRatio * 0.8);

      k.vel.x = Math.cos(k.angle) * k.speed;
      k.vel.y = Math.sin(k.angle) * k.speed;
      k.pos.x += k.vel.x * dt;
      k.pos.y += k.vel.y * dt;

      // Off-track penalty
      const dToCenter = distanceToTrackCenter(k.pos);
      if (dToCenter > TRACK_HALF_WIDTH) {
        k.speed *= 0.92;
        const overshoot = dToCenter - TRACK_HALF_WIDTH;
        // Nudge back toward center
        let nearest: Vec = CENTERLINE[0]!;
        let best = Infinity;
        for (const c of CENTERLINE) {
          const d = dist(c, k.pos);
          if (d < best) {
            best = d;
            nearest = c;
          }
        }
        const nx = nearest.x - k.pos.x;
        const ny = nearest.y - k.pos.y;
        const nlen = Math.hypot(nx, ny) || 1;
        k.pos.x += (nx / nlen) * overshoot * 0.6 * dt * 60;
        k.pos.y += (ny / nlen) * overshoot * 0.6 * dt * 60;
      }

      // Clamp to bounds
      k.pos.x = Math.max(10, Math.min(TRACK_W - 10, k.pos.x));
      k.pos.y = Math.max(10, Math.min(TRACK_H - 10, k.pos.y));

      // Checkpoint progression
      const cp = CHECKPOINTS[k.nextCheckpoint % CHECKPOINTS.length]!;
      if (dist(k.pos, cp) < 80) {
        k.nextCheckpoint += 1;
        if (k.nextCheckpoint % CHECKPOINTS.length === 0) {
          k.lap += 1;
          if (k.lap >= TOTAL_LAPS) {
            k.finishedAt = now;
          }
        }
      }

      // Banana peel collisions
      for (let i = s.peels.length - 1; i >= 0; i--) {
        const peel = s.peels[i]!;
        if (dist(k.pos, peel.pos) < 12) {
          k.hitUntil = now + 900;
          k.speed *= 0.2;
          s.peels.splice(i, 1);
        }
      }

      // Item box pickup (player only — AI doesn't use items)
      if (k.isPlayer && !s.playerHasItem) {
        for (const item of s.items) {
          if (item.active && dist(k.pos, item.pos) < 18) {
            item.active = false;
            item.respawnAt = now + ITEM_RESPAWN_MS;
            const pick = Math.random() < 0.55 ? 'boost' : 'peel';
            s.playerHasItem = pick;
            setHudItem(pick);
          }
        }
      }
    }

    // Kart-kart bumping
    for (let i = 0; i < s.karts.length; i++) {
      for (let j = i + 1; j < s.karts.length; j++) {
        const a = s.karts[i]!;
        const b = s.karts[j]!;
        const d = dist(a.pos, b.pos);
        if (d < 16 && d > 0) {
          const push = (16 - d) / 2;
          const nx = (b.pos.x - a.pos.x) / d;
          const ny = (b.pos.y - a.pos.y) / d;
          a.pos.x -= nx * push;
          a.pos.y -= ny * push;
          b.pos.x += nx * push;
          b.pos.y += ny * push;
          a.speed *= 0.85;
          b.speed *= 0.85;
        }
      }
    }

    // HUD updates
    setHudLap(Math.min(TOTAL_LAPS, player.lap + 1));
    const ranking = computeRanking(s.karts);
    const playerPlace = ranking.findIndex((k) => k.isPlayer) + 1;
    setHudPos(playerPlace);

    // Race end: player finished AND all AIs finished, OR player finished
    if (player.finishedAt !== null) {
      // Once player finishes, run a brief tail for AIs but freeze HUD time.
      finishRace(now, true);
    }
  }

  function computeRanking(karts: Kart[]): Kart[] {
    return [...karts].sort((a, b) => {
      // Finished karts first by finish time
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      // Otherwise: lap count, then progress to next checkpoint
      if (b.lap !== a.lap) return b.lap - a.lap;
      const aNext = CHECKPOINTS[a.nextCheckpoint % CHECKPOINTS.length]!;
      const bNext = CHECKPOINTS[b.nextCheckpoint % CHECKPOINTS.length]!;
      const da = a.nextCheckpoint * 1000 - dist(a.pos, aNext);
      const db = b.nextCheckpoint * 1000 - dist(b.pos, bNext);
      return db - da;
    });
  }

  function finishRace(now: number, _completed: boolean) {
    const s = stateRef.current;
    if (s.state === 'finished') return;
    s.state = 'finished';
    setGameState('finished');
    const player = s.karts[0]!;
    const ranking = computeRanking(s.karts);
    const place = ranking.findIndex((k) => k.isPlayer) + 1;
    const elapsed = ((player.finishedAt ?? now) - s.startTime) / 1000;
    const placeBonus = Math.max(0, (5 - place) * 200);
    const timeScore = Math.max(0, Math.floor((MAX_RACE_TIME - elapsed) * 8));
    const lapBonus = player.lap * 50;
    const score = placeBonus + timeScore + lapBonus;
    setResults({ place, time: elapsed, score });
    setTick((n) => n + 1);
  }

  // Post score once when results are available.
  useEffect(() => {
    if (!results || posted || !token) return;
    setPosted(true);
    sessionMutation.mutate({ score: results.score, durationSeconds: Math.round(results.time) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, posted, token]);

  function render(ctx: CanvasRenderingContext2D, now: number) {
    const s = stateRef.current;
    ctx.clearRect(0, 0, TRACK_W, TRACK_H);

    // Background grid
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, TRACK_W, TRACK_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < TRACK_W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TRACK_H);
      ctx.stroke();
    }
    for (let y = 0; y < TRACK_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TRACK_W, y);
      ctx.stroke();
    }

    // Track surface (offset stroke for two-tone look)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = TRACK_HALF_WIDTH * 2 + 6;
    drawCenterline(ctx);
    ctx.strokeStyle = '#16161e';
    ctx.lineWidth = TRACK_HALF_WIDTH * 2;
    drawCenterline(ctx);

    // Center dashed line
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = 'rgba(255,217,59,0.35)';
    ctx.lineWidth = 2;
    drawCenterline(ctx);
    ctx.setLineDash([]);

    // Start/finish line
    const start = CENTERLINE[0]!;
    const next = CENTERLINE[1]!;
    const angle = Math.atan2(next.y - start.y, next.x - start.x);
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle + Math.PI / 2);
    for (let i = -TRACK_HALF_WIDTH; i < TRACK_HALF_WIDTH; i += 8) {
      ctx.fillStyle = ((i / 8) | 0) % 2 === 0 ? '#fff' : '#222';
      ctx.fillRect(i, -3, 8, 6);
    }
    ctx.restore();

    // Item boxes
    for (const item of s.items) {
      if (!item.active) continue;
      const pulse = 1 + Math.sin(now / 200) * 0.15;
      ctx.save();
      ctx.translate(item.pos.x, item.pos.y);
      ctx.rotate(now / 400);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255,217,59,0.18)';
      ctx.strokeStyle = '#ffd93b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-10, -10, 20, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd93b';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.restore();
    }

    // Banana peels
    for (const peel of s.peels) {
      ctx.save();
      ctx.translate(peel.pos.x, peel.pos.y);
      ctx.fillStyle = '#ffd93b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Karts
    for (const k of s.karts) {
      const boost = now < k.boostUntil;
      const isHit = now < k.hitUntil;
      ctx.save();
      ctx.translate(k.pos.x, k.pos.y);
      ctx.rotate(k.angle);
      if (boost) {
        ctx.fillStyle = 'rgba(255,217,59,0.5)';
        ctx.beginPath();
        ctx.ellipse(-14, 0, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Kart body
      ctx.fillStyle = k.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-8, -6, 16, 12);
      ctx.fill();
      ctx.stroke();
      // Windshield
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(2, -4, 4, 8);
      // Wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(-8, -8, 4, 2);
      ctx.fillRect(-8, 6, 4, 2);
      ctx.fillRect(4, -8, 4, 2);
      ctx.fillRect(4, 6, 4, 2);
      if (isHit) {
        ctx.strokeStyle = '#ff3b3b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12 + Math.sin(now / 80) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Name tag
      ctx.save();
      ctx.translate(k.pos.x, k.pos.y - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(k.name, 0.5, 0.5);
      ctx.fillStyle = k.isPlayer ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.fillText(k.name, 0, 0);
      ctx.restore();
    }

    // Countdown overlay
    if (s.state === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, TRACK_W, TRACK_H);
      ctx.fillStyle = '#ffd93b';
      ctx.font = 'bold 140px "Audiowide", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = countdownNum > 0 ? String(countdownNum) : 'GO!';
      ctx.fillText(label, TRACK_W / 2, TRACK_H / 2);
    }
  }

  function drawCenterline(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    for (let i = 0; i <= CENTERLINE.length; i++) {
      const p = CENTERLINE[i % CENTERLINE.length]!;
      const prev = CENTERLINE[(i - 1 + CENTERLINE.length) % CENTERLINE.length]!;
      const next = CENTERLINE[(i + 1) % CENTERLINE.length]!;
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        // Smooth via quadratic
        const cx = (prev.x + p.x) / 2;
        const cy = (prev.y + p.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        ctx.lineTo(p.x, p.y);
      }
      void next;
    }
    ctx.closePath();
    ctx.stroke();
  }

  const totalScore = useMemo(() => results?.score ?? 0, [results]);

  if (!token) {
    return (
      <PlayShell title="SMASH KART" accent="red">
        <PlayError message="Sign in to race." />
      </PlayShell>
    );
  }

  return (
    <PlayShell title="SMASH KART" accent="red">
      <div style={{ display: 'grid', gap: 16 }}>
        <div
          className="lb-mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span>
            LAP <strong style={{ color: 'var(--c-yellow)' }}>{hudLap || 0}</strong> / {TOTAL_LAPS}
          </span>
          <span>
            POS <strong style={{ color: 'var(--c-yellow)' }}>P{hudPos}</strong> / 5
          </span>
          <span>
            TIME <strong style={{ color: 'var(--c-yellow)' }}>{formatTime(hudTime * 1000)}</strong>
          </span>
          <span>
            ITEM{' '}
            <strong
              style={{
                color: hudItem === 'boost' ? 'var(--c-green)' : hudItem === 'peel' ? 'var(--c-yellow)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {hudItem === 'boost' ? 'BOOST' : hudItem === 'peel' ? 'PEEL' : '—'}
            </strong>
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#0a0a0f',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            width={TRACK_W}
            height={TRACK_H}
            style={{ display: 'block', width: '100%', height: 'auto', maxWidth: TRACK_W, margin: '0 auto' }}
          />

          {gameState === 'idle' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.78)',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div className="lb-mono" style={{ color: 'var(--c-red)', fontSize: 11, marginBottom: 12 }}>
                // pre_race · 3 laps · 4 ai opponents
              </div>
              <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: 32, margin: '0 0 16px' }}>READY TO RACE?</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>
                Arrow keys or WASD to drive · Space to use items · Drive over <span style={{ color: 'var(--c-yellow)' }}>?</span> boxes to pick up a boost or banana peel.
              </p>
              <button className="lb-btn-primary lb-btn-lg" onClick={beginRace}>
                ▶ START RACE
              </button>
            </div>
          )}

          {gameState === 'finished' && results && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.82)',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div className="lb-mono" style={{ color: 'var(--c-red)', fontSize: 11, marginBottom: 12 }}>
                // race_complete
              </div>
              <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: 40, margin: '0 0 8px' }}>
                {results.place === 1 ? '🥇 P1' : results.place === 2 ? '🥈 P2' : results.place === 3 ? '🥉 P3' : `P${results.place}`}
              </h2>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 }}>
                Finish time · <strong style={{ color: 'var(--c-yellow)' }}>{formatTime(results.time * 1000)}</strong>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>
                Score · <strong style={{ color: 'var(--c-green)' }}>{totalScore}</strong>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="lb-btn-primary" onClick={beginRace}>
                  ▶ RACE AGAIN
                </button>
              </div>
              {sessionMutation.isPending && (
                <div className="lb-mono ts-blink" style={{ marginTop: 12, fontSize: 11, color: 'var(--c-green)' }}>
                  {'>'} posting to leaderboard...
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="lb-mono"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <div>
            <span style={{ color: 'var(--c-yellow)' }}>↑ W</span> · accelerate
          </div>
          <div>
            <span style={{ color: 'var(--c-yellow)' }}>↓ S</span> · reverse
          </div>
          <div>
            <span style={{ color: 'var(--c-yellow)' }}>← → A D</span> · steer
          </div>
          <div>
            <span style={{ color: 'var(--c-yellow)' }}>SPACE</span> · use item
          </div>
        </div>
      </div>
    </PlayShell>
  );
}
