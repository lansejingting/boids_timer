'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ============================================================
 * Types
 * ============================================================ */
interface Vec2 { x: number; y: number }

interface Fish {
  pos: Vec2; vel: Vec2; acc: Vec2;
  size: number; hue: number; saturation: number; lightness: number;
  alpha: number; tailPhase: number; tailSpeed: number;
}

interface Seaweed {
  x: number; baseY: number; segments: number; segLen: number;
  phase: number; speed: number; amplitude: number;
  hue: number; saturation: number; lightness: number; alpha: number;
  width: number; layer: number; swayOffset: number;
  hasLeaves: boolean; leafFreq: number;
}

interface Bubble {
  x: number; y: number; r: number; speed: number;
  wobblePhase: number; wobbleAmp: number; alpha: number;
}

interface SunRay {
  x: number; width: number; angle: number; alpha: number;
  speed: number; phase: number;
}

interface Coral {
  x: number; y: number; type: 'branch' | 'fan' | 'tube';
  hue: number; saturation: number; lightness: number;
  size: number; alpha: number; layer: number; branches: number;
  swayPhase: number;
}

interface Rock {
  x: number; y: number; w: number; h: number;
  hue: number; lightness: number; alpha: number;
  points: { dx: number; dy: number }[];
}

interface Shell {
  x: number; y: number; size: number; rotation: number;
  hue: number; lightness: number; alpha: number;
}

/* ============================================================
 * Settings
 * ============================================================ */
export interface DeepSeaSettings {
  fishCount: number;
  fishSpeed: number;
  fishSize: number;
  fishColorStyle: 'silver' | 'tropical' | 'bioluminescent' | 'golden';
  bubbleEnabled: boolean;
  bubbleDensity: number;
  seaweedDensity: number;
  sunRayIntensity: number;
}

export const DEFAULT_SETTINGS: DeepSeaSettings = {
  fishCount: 45, fishSpeed: 1.0, fishSize: 1.0,
  fishColorStyle: 'silver', bubbleEnabled: true,
  bubbleDensity: 1.0, seaweedDensity: 1.0, sunRayIntensity: 1.0,
};

/* ============================================================
 * Constants
 * ============================================================ */
const MAX_FORCE = 0.02;
const SEPARATION_DIST = 40;
const ALIGNMENT_DIST = 70;
const COHESION_DIST = 90;
const BASE_SEAWEED_COUNT = 20;
const BASE_BUBBLE_MAX = 25;
const SUN_RAY_COUNT = 8;

/* ============================================================
 * Helpers
 * ============================================================ */
function vecAdd(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
function vecSub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function vecMul(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s }; }
function vecMag(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
function vecNormalize(v: Vec2): Vec2 {
  const m = vecMag(v); return m > 0 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
}
function vecLimit(v: Vec2, max: number): Vec2 {
  const m = vecMag(v); return m > max ? { x: (v.x / m) * max, y: (v.y / m) * max } : v;
}
function vecDist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy);
}

function getColorStyle(style: DeepSeaSettings['fishColorStyle']) {
  switch (style) {
    case 'tropical': return { hueRange: [0, 360] as [number, number], satRange: [50, 80] as [number, number], lightRange: [55, 75] as [number, number] };
    case 'bioluminescent': return { hueRange: [160, 220] as [number, number], satRange: [70, 100] as [number, number], lightRange: [60, 80] as [number, number] };
    case 'golden': return { hueRange: [30, 55] as [number, number], satRange: [60, 90] as [number, number], lightRange: [55, 75] as [number, number] };
    default: return { hueRange: [190, 220] as [number, number], satRange: [20, 45] as [number, number], lightRange: [60, 80] as [number, number] };
  }
}

/* Seeded random for deterministic decorations */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/* ============================================================
 * Component
 * ============================================================ */
export function DeepSeaCanvas({
  isBreak, settings = DEFAULT_SETTINGS,
}: { isBreak: boolean; settings?: DeepSeaSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fishRef = useRef<Fish[]>([]);
  const seaweedRef = useRef<Seaweed[]>([]);
  const bubbleRef = useRef<Bubble[]>([]);
  const sunRayRef = useRef<SunRay[]>([]);
  const coralRef = useRef<Coral[]>([]);
  const rockRef = useRef<Rock[]>([]);
  const shellRef = useRef<Shell[]>([]);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const settingsRef = useRef(settings);
  const prevSettingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  /* --- Init helpers --- */
  const initFish = useCallback((w: number, h: number): Fish[] => {
    const s = settingsRef.current;
    const cs = getColorStyle(s.fishColorStyle);
    const fish: Fish[] = [];
    for (let i = 0; i < s.fishCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.15 + Math.random() * 0.4) * s.fishSpeed;
      const hue = cs.hueRange[0] + Math.random() * (cs.hueRange[1] - cs.hueRange[0]);
      fish.push({
        pos: { x: Math.random() * w, y: Math.random() * h * 0.75 },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        acc: { x: 0, y: 0 },
        size: (5 + Math.random() * 7) * s.fishSize,
        hue, saturation: cs.satRange[0] + Math.random() * (cs.satRange[1] - cs.satRange[0]),
        lightness: cs.lightRange[0] + Math.random() * (cs.lightRange[1] - cs.lightRange[0]),
        alpha: 0.35 + Math.random() * 0.4,
        tailPhase: Math.random() * Math.PI * 2,
        tailSpeed: 0.004 + Math.random() * 0.004,
      });
    }
    return fish;
  }, []);

  const initSeaweed = useCallback((w: number, h: number): Seaweed[] => {
    const s = settingsRef.current;
    const count = Math.floor(BASE_SEAWEED_COUNT * s.seaweedDensity);
    const weeds: Seaweed[] = [];
    // Diverse hue palette: green, blue-green, yellow-green, deep teal
    const huePalette = [110, 125, 140, 155, 165, 95, 175, 100, 130, 150];
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const x = (w / count) * i + Math.random() * (w / count);
      const segs = 8 + Math.floor(Math.random() * 10);
      const hueIdx = Math.floor(Math.random() * huePalette.length);
      const baseHue = huePalette[hueIdx] + (Math.random() - 0.5) * 15;
      weeds.push({
        x, baseY: h + 2, segments: segs,
        segLen: (10 + Math.random() * 14) * (layer === 0 ? 0.7 : layer === 1 ? 1.0 : 1.25),
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.65,
        amplitude: (7 + Math.random() * 14) * (layer === 2 ? 1.3 : 1.0),
        hue: baseHue,
        saturation: 25 + Math.random() * 40,
        lightness: 12 + layer * 7 + Math.random() * 12,
        alpha: layer === 0 ? 0.25 : layer === 1 ? 0.45 : 0.7,
        width: (1.5 + Math.random() * 2.5) * (layer === 2 ? 1.5 : 1.0),
        layer, swayOffset: Math.random() * Math.PI * 2,
        hasLeaves: Math.random() > 0.25,
        leafFreq: 2 + Math.floor(Math.random() * 2),
      });
    }
    weeds.sort((a, b) => a.layer - b.layer);
    return weeds;
  }, []);

  const initSunRays = useCallback((w: number): SunRay[] => {
    const rays: SunRay[] = [];
    for (let i = 0; i < SUN_RAY_COUNT; i++) {
      rays.push({
        x: (w / SUN_RAY_COUNT) * i + Math.random() * (w / SUN_RAY_COUNT),
        width: 60 + Math.random() * 140,
        angle: -0.2 + Math.random() * 0.4,
        alpha: 0.025 + Math.random() * 0.05,
        speed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return rays;
  }, []);

  const initCorals = useCallback((w: number, h: number): Coral[] => {
    const rand = seededRandom(42);
    const corals: Coral[] = [];
    const count = 6 + Math.floor(rand() * 5);
    const coralHues = [340, 350, 10, 20, 30, 280, 300, 15, 345, 5];
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const type = (['branch', 'fan', 'tube'] as const)[Math.floor(rand() * 3)];
      corals.push({
        x: rand() * w,
        y: h * (0.88 + rand() * 0.06),
        type,
        hue: coralHues[Math.floor(rand() * coralHues.length)] + (rand() - 0.5) * 20,
        saturation: 30 + rand() * 40,
        lightness: 25 + layer * 8 + rand() * 15,
        size: (15 + rand() * 25) * (layer === 2 ? 1.3 : layer === 0 ? 0.7 : 1.0),
        alpha: layer === 0 ? 0.2 : layer === 1 ? 0.4 : 0.6,
        layer,
        branches: 3 + Math.floor(rand() * 4),
        swayPhase: rand() * Math.PI * 2,
      });
    }
    corals.sort((a, b) => a.layer - b.layer);
    return corals;
  }, []);

  const initRocks = useCallback((w: number, h: number): Rock[] => {
    const rand = seededRandom(99);
    const rocks: Rock[] = [];
    const count = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const pts: { dx: number; dy: number }[] = [];
      const numPts = 5 + Math.floor(rand() * 4);
      for (let p = 0; p < numPts; p++) {
        const angle = (p / numPts) * Math.PI * 2;
        const r = 0.6 + rand() * 0.4;
        pts.push({ dx: Math.cos(angle) * r, dy: Math.sin(angle) * r * 0.6 });
      }
      rocks.push({
        x: rand() * w,
        y: h * (0.91 + rand() * 0.05),
        w: 20 + rand() * 40,
        h: 12 + rand() * 20,
        hue: 200 + rand() * 30,
        lightness: 12 + rand() * 10,
        alpha: 0.3 + rand() * 0.3,
        points: pts,
      });
    }
    return rocks;
  }, []);

  const initShells = useCallback((w: number, h: number): Shell[] => {
    const rand = seededRandom(77);
    const shells: Shell[] = [];
    const count = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      shells.push({
        x: rand() * w,
        y: h * (0.92 + rand() * 0.05),
        size: 4 + rand() * 6,
        rotation: rand() * Math.PI * 2,
        hue: 30 + rand() * 30,
        lightness: 40 + rand() * 20,
        alpha: 0.3 + rand() * 0.3,
      });
    }
    return shells;
  }, []);

  const spawnBubble = useCallback((w: number, h: number): Bubble => ({
    x: Math.random() * w, y: h + 10,
    r: 1.5 + Math.random() * 4, speed: 0.2 + Math.random() * 0.5,
    wobblePhase: Math.random() * Math.PI * 2, wobbleAmp: 0.4 + Math.random() * 1.0,
    alpha: 0.08 + Math.random() * 0.18,
  }), []);

  /* --- Boids --- */
  const applyBoids = useCallback((fish: Fish, allFish: Fish[], w: number, h: number) => {
    const maxSpeed = 1.2 * settingsRef.current.fishSpeed;
    let sep: Vec2 = { x: 0, y: 0 }, ali: Vec2 = { x: 0, y: 0 }, coh: Vec2 = { x: 0, y: 0 };
    let sc = 0, ac = 0, cc = 0;
    for (const o of allFish) {
      if (o === fish) continue;
      const d = vecDist(fish.pos, o.pos);
      if (d < SEPARATION_DIST && d > 0) { sep = vecAdd(sep, vecMul(vecNormalize(vecSub(fish.pos, o.pos)), 1 / d)); sc++; }
      if (d < ALIGNMENT_DIST) { ali = vecAdd(ali, o.vel); ac++; }
      if (d < COHESION_DIST) { coh = vecAdd(coh, o.pos); cc++; }
    }
    if (sc > 0) { sep = vecLimit(vecSub(vecMul(vecNormalize(sep), maxSpeed), fish.vel), MAX_FORCE * 1.5); }
    if (ac > 0) { ali = vecLimit(vecSub(vecMul(vecNormalize(ali), maxSpeed), fish.vel), MAX_FORCE); }
    if (cc > 0) { const desired = vecSub(vecMul(vecNormalize(vecSub(coh, fish.pos)), maxSpeed), fish.vel); coh = vecLimit(desired, MAX_FORCE); }
    fish.acc = vecAdd(fish.acc, sep);
    fish.acc = vecAdd(fish.acc, ali);
    fish.acc = vecAdd(fish.acc, coh);
    const margin = 80, tf = 0.04;
    if (fish.pos.x < margin) fish.acc.x += tf;
    if (fish.pos.x > w - margin) fish.acc.x -= tf;
    if (fish.pos.y < margin) fish.acc.y += tf;
    if (fish.pos.y > h * 0.78) fish.acc.y -= tf;
  }, []);

  /* --- Draw functions --- */
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number, brk: boolean) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (brk) {
      grad.addColorStop(0, '#1a4a5e'); grad.addColorStop(0.3, '#0f3548');
      grad.addColorStop(0.7, '#0a2235'); grad.addColorStop(1, '#061520');
    } else {
      grad.addColorStop(0, '#133a5c'); grad.addColorStop(0.3, '#0d2847');
      grad.addColorStop(0.7, '#091c33'); grad.addColorStop(1, '#060e1c');
    }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    const ca = 0.012 + Math.sin(time * 0.0005) * 0.004;
    for (let i = 0; i < 5; i++) {
      const cx = w * 0.2 + Math.sin(time * 0.0003 + i) * w * 0.3;
      const cy = h * 0.15 + Math.cos(time * 0.0004 + i * 1.5) * h * 0.1;
      const r = 100 + Math.sin(time * 0.0002 + i * 2) * 50;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(100,200,220,${ca * 2})`); g.addColorStop(1, 'rgba(100,200,220,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }, []);

  const drawSunRays = useCallback((ctx: CanvasRenderingContext2D, rays: SunRay[], w: number, h: number, time: number) => {
    const intensity = settingsRef.current.sunRayIntensity;
    if (intensity <= 0) return;
    for (const ray of rays) {
      // More dramatic intensity and angle changes
      const pulse = Math.sin(time * ray.speed + ray.phase);
      const pulse2 = Math.sin(time * ray.speed * 0.7 + ray.phase * 1.3);
      const currentAlpha = ray.alpha * (0.4 + 0.6 * Math.max(0, pulse)) * intensity;
      const currentAngle = ray.angle + Math.sin(time * 0.0003 + ray.phase) * 0.12;
      const currentWidth = ray.width * (0.7 + 0.3 * pulse2);
      // Slowly drift position
      const drift = Math.sin(time * 0.0001 + ray.phase * 2) * w * 0.05;

      ctx.save();
      ctx.translate(ray.x + drift, 0);
      ctx.rotate(currentAngle);
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.9);
      g.addColorStop(0, `rgba(255,230,150,${currentAlpha * 2})`);
      g.addColorStop(0.15, `rgba(255,215,120,${currentAlpha * 1.2})`);
      g.addColorStop(0.5, `rgba(220,190,100,${currentAlpha * 0.5})`);
      g.addColorStop(0.8, `rgba(180,160,80,${currentAlpha * 0.15})`);
      g.addColorStop(1, 'rgba(180,160,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-currentWidth / 2, 0);
      ctx.lineTo(currentWidth / 2, 0);
      ctx.lineTo(currentWidth * 0.9, h * 0.9);
      ctx.lineTo(-currentWidth * 0.9, h * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const drawSeaweed = useCallback((ctx: CanvasRenderingContext2D, weeds: Seaweed[], time: number) => {
    for (const weed of weeds) {
      const gs = Math.sin(time * 0.0006 + weed.swayOffset) * 3;
      const pts: { x: number; y: number }[] = [{ x: weed.x, y: weed.baseY }];
      let px = weed.x, py = weed.baseY;
      for (let s = 0; s < weed.segments; s++) {
        const p = s / weed.segments;
        const s1 = Math.sin(time * 0.001 * weed.speed + weed.phase + s * 0.4) * weed.amplitude * p;
        const s2 = Math.sin(time * 0.0017 * weed.speed + weed.phase * 1.3 + s * 0.7) * weed.amplitude * 0.3 * p;
        const s3 = Math.sin(time * 0.0008 + weed.swayOffset + s * 0.2) * 2 * p;
        const nx = weed.x + s1 + s2 + s3 + gs * p;
        const ny = py - weed.segLen;
        pts.push({ x: nx, y: ny });
        px = nx; py = ny;
      }
      // Draw main stem with taper
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const cp = { x: (pts[i - 1].x + pts[i].x) / 2 + (pts[i].x - pts[i - 1].x) * 0.15, y: (pts[i - 1].y + pts[i].y) / 2 };
          ctx.quadraticCurveTo(cp.x, cp.y, pts[i].x, pts[i].y);
        }
        const w = pass === 0 ? weed.width : weed.width * 0.35;
        const a = pass === 0 ? weed.alpha : weed.alpha * 0.35;
        const l = pass === 0 ? weed.lightness : weed.lightness + 10;
        ctx.strokeStyle = `hsla(${weed.hue}, ${weed.saturation}%, ${l}%, ${a})`;
        ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      }
      // Leaves
      if (weed.hasLeaves) {
        for (let s = 2; s < pts.length - 1; s += weed.leafFreq) {
          const dir = s % (weed.leafFreq * 2) < weed.leafFreq ? 1 : -1;
          const ls = Math.sin(time * 0.002 * weed.speed + weed.phase + s * 1.2) * 4;
          const ll = 7 + (s / pts.length) * 12;
          ctx.beginPath();
          ctx.moveTo(pts[s].x, pts[s].y);
          ctx.quadraticCurveTo(pts[s].x + dir * (ll * 0.6 + ls), pts[s].y - ll * 0.3, pts[s].x + dir * (ll + ls), pts[s].y + ll * 0.1);
          ctx.strokeStyle = `hsla(${weed.hue + 8}, ${weed.saturation + 5}%, ${weed.lightness + 6}%, ${weed.alpha * 0.65})`;
          ctx.lineWidth = weed.width * 0.45; ctx.lineCap = 'round'; ctx.stroke();
        }
      }
    }
  }, []);

  const drawCorals = useCallback((ctx: CanvasRenderingContext2D, corals: Coral[], time: number) => {
    for (const c of corals) {
      const sway = Math.sin(time * 0.0008 + c.swayPhase) * 2;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.type === 'branch') {
        // Branching coral
        for (let b = 0; b < c.branches; b++) {
          const angle = -Math.PI / 2 + (b - (c.branches - 1) / 2) * 0.4;
          const len = c.size * (0.6 + Math.random() * 0.01);
          const bx = Math.cos(angle) * len + sway * (b / c.branches);
          const by = Math.sin(angle) * len;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(bx * 0.5 + sway * 0.5, by * 0.5, bx, by);
          ctx.strokeStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness}%, ${c.alpha})`;
          ctx.lineWidth = 2.5 - b * 0.2; ctx.lineCap = 'round'; ctx.stroke();
          // Sub-branches
          for (let sb = 0; sb < 2; sb++) {
            const t = 0.5 + sb * 0.25;
            const sx = bx * t, sy = by * t;
            const sa = angle + (sb === 0 ? 0.5 : -0.5);
            const sl = len * 0.3;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(sa) * sl + sway * 0.3, sy + Math.sin(sa) * sl);
            ctx.strokeStyle = `hsla(${c.hue + 5}, ${c.saturation - 5}%, ${c.lightness + 5}%, ${c.alpha * 0.7})`;
            ctx.lineWidth = 1.5; ctx.stroke();
          }
          // Tips (small circles)
          ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${c.hue + 10}, ${c.saturation + 10}%, ${c.lightness + 15}%, ${c.alpha * 0.5})`;
          ctx.fill();
        }
      } else if (c.type === 'fan') {
        // Fan coral
        ctx.beginPath();
        const fanW = c.size * 1.2, fanH = c.size;
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-fanW * 0.3 + sway, -fanH * 0.5, -fanW * 0.15 + sway * 0.5, -fanH);
        ctx.quadraticCurveTo(sway * 0.3, -fanH * 1.1, fanW * 0.15 + sway * 0.5, -fanH);
        ctx.quadraticCurveTo(fanW * 0.3 + sway, -fanH * 0.5, 0, 0);
        ctx.fillStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness}%, ${c.alpha * 0.5})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness + 10}%, ${c.alpha * 0.6})`;
        ctx.lineWidth = 0.8; ctx.stroke();
        // Veins
        for (let v = 0; v < 4; v++) {
          const t = (v + 1) / 5;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo((-fanW * 0.2 + t * fanW * 0.4 + sway * 0.5), -fanH * 0.5, (-fanW * 0.1 + t * fanW * 0.2 + sway * 0.3), -fanH * 0.85);
          ctx.strokeStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness + 15}%, ${c.alpha * 0.3})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      } else {
        // Tube coral
        for (let t = 0; t < 3; t++) {
          const tx = (t - 1) * c.size * 0.35;
          const th = c.size * (0.7 + t * 0.15);
          ctx.beginPath();
          ctx.moveTo(tx - 3, 0);
          ctx.lineTo(tx - 2.5 + sway * 0.3, -th);
          ctx.arc(tx + sway * 0.3, -th, 3, Math.PI, 0);
          ctx.lineTo(tx + 3, 0);
          ctx.fillStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness}%, ${c.alpha * 0.6})`;
          ctx.fill();
          // Opening
          ctx.beginPath();
          ctx.ellipse(tx + sway * 0.3, -th, 3.5, 1.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${c.hue}, ${c.saturation}%, ${c.lightness - 8}%, ${c.alpha * 0.8})`;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }, []);

  const drawRocks = useCallback((ctx: CanvasRenderingContext2D, rocks: Rock[]) => {
    for (const r of rocks) {
      ctx.beginPath();
      const first = r.points[0];
      ctx.moveTo(r.x + first.dx * r.w, r.y + first.dy * r.h);
      for (let i = 1; i <= r.points.length; i++) {
        const pt = r.points[i % r.points.length];
        const prev = r.points[(i - 1) % r.points.length];
        const cpx = r.x + (prev.dx + pt.dx) / 2 * r.w;
        const cpy = r.y + (prev.dy + pt.dy) / 2 * r.h;
        ctx.quadraticCurveTo(r.x + prev.dx * r.w, r.y + prev.dy * r.h, cpx, cpy);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(r.x, r.y - r.h, r.x, r.y + r.h * 0.3);
      g.addColorStop(0, `hsla(${r.hue}, 15%, ${r.lightness + 5}%, ${r.alpha})`);
      g.addColorStop(1, `hsla(${r.hue}, 10%, ${r.lightness - 3}%, ${r.alpha})`);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = `hsla(${r.hue}, 10%, ${r.lightness + 10}%, ${r.alpha * 0.3})`;
      ctx.lineWidth = 0.5; ctx.stroke();
    }
  }, []);

  const drawShells = useCallback((ctx: CanvasRenderingContext2D, shells: Shell[]) => {
    for (const s of shells) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      // Spiral shell shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let a = 0; a < Math.PI * 3; a += 0.1) {
        const r = (a / (Math.PI * 3)) * s.size;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6);
      }
      ctx.strokeStyle = `hsla(${s.hue}, 30%, ${s.lightness}%, ${s.alpha})`;
      ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();
      // Fill
      ctx.beginPath();
      ctx.ellipse(0, 0, s.size * 0.5, s.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 25%, ${s.lightness + 10}%, ${s.alpha * 0.4})`;
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const drawFish = useCallback((ctx: CanvasRenderingContext2D, fish: Fish[], time: number) => {
    for (const f of fish) {
      const angle = Math.atan2(f.vel.y, f.vel.x);
      const tw = Math.sin(time * f.tailSpeed + f.tailPhase) * 0.35;
      ctx.save();
      ctx.translate(f.pos.x, f.pos.y);
      ctx.rotate(angle);
      // Glow
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size * 2.5);
      gg.addColorStop(0, `hsla(${f.hue},${f.saturation}%,${f.lightness}%,${f.alpha * 0.1})`);
      gg.addColorStop(1, `hsla(${f.hue},${f.saturation}%,${f.lightness}%,0)`);
      ctx.fillStyle = gg; ctx.fillRect(-f.size * 2.5, -f.size * 2.5, f.size * 5, f.size * 5);
      // Body
      ctx.beginPath();
      ctx.moveTo(f.size, 0);
      ctx.quadraticCurveTo(f.size * 0.3, -f.size * 0.4, -f.size * 0.5, -f.size * 0.15);
      ctx.lineTo(-f.size + tw * f.size * 0.3, tw * f.size * 0.4);
      ctx.lineTo(-f.size * 0.5, f.size * 0.15);
      ctx.quadraticCurveTo(f.size * 0.3, f.size * 0.4, f.size, 0);
      ctx.closePath();
      const bg = ctx.createLinearGradient(-f.size, -f.size * 0.3, f.size, f.size * 0.3);
      bg.addColorStop(0, `hsla(${f.hue},${f.saturation}%,${f.lightness - 10}%,${f.alpha * 0.6})`);
      bg.addColorStop(0.5, `hsla(${f.hue},${f.saturation}%,${f.lightness}%,${f.alpha})`);
      bg.addColorStop(1, `hsla(${f.hue},${f.saturation}%,${f.lightness - 5}%,${f.alpha * 0.7})`);
      ctx.fillStyle = bg; ctx.fill();
      // Dorsal fin
      ctx.beginPath(); ctx.moveTo(f.size * 0.2, -f.size * 0.3);
      ctx.quadraticCurveTo(0, -f.size * 0.55, -f.size * 0.3, -f.size * 0.25);
      ctx.fillStyle = `hsla(${f.hue},${f.saturation - 5}%,${f.lightness - 5}%,${f.alpha * 0.4})`; ctx.fill();
      // Tail
      ctx.beginPath(); ctx.moveTo(-f.size * 0.5, 0);
      ctx.lineTo(-f.size * 1.1 + tw * f.size * 0.4, -f.size * 0.35 + tw * f.size * 0.2);
      ctx.lineTo(-f.size * 1.1 + tw * f.size * 0.4, f.size * 0.35 + tw * f.size * 0.2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${f.hue},${f.saturation - 5}%,${f.lightness - 10}%,${f.alpha * 0.5})`; ctx.fill();
      // Eye
      ctx.beginPath(); ctx.arc(f.size * 0.45, -f.size * 0.08, f.size * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${f.alpha * 0.9})`; ctx.fill();
      ctx.beginPath(); ctx.arc(f.size * 0.47, -f.size * 0.08, f.size * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(20,40,60,${f.alpha * 0.8})`; ctx.fill();
      ctx.restore();
    }
  }, []);

  const drawBubbles = useCallback((ctx: CanvasRenderingContext2D, bubbles: Bubble[]) => {
    for (const b of bubbles) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200,230,255,${b.alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
      const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      bg.addColorStop(0, `rgba(200,230,255,${b.alpha * 0.15})`);
      bg.addColorStop(0.7, `rgba(200,230,255,${b.alpha * 0.05})`);
      bg.addColorStop(1, `rgba(200,230,255,${b.alpha * 0.2})`);
      ctx.fillStyle = bg; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,250,255,${b.alpha * 0.7})`; ctx.fill();
    }
  }, []);

  const drawSandyBottom = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const bottomY = h * 0.92;
    const g = ctx.createLinearGradient(0, bottomY, 0, h);
    g.addColorStop(0, 'rgba(20,40,35,0)'); g.addColorStop(0.3, 'rgba(18,35,30,0.4)');
    g.addColorStop(1, 'rgba(12,25,20,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      ctx.lineTo(x, bottomY + Math.sin(x * 0.01 + time * 0.0003) * 5 + Math.sin(x * 0.025) * 3);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }, []);

  /* --- Main animation loop --- */
  const animateFnRef = useRef<() => void>(() => {});

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = settingsRef.current;
    const w = sizeRef.current.w, h = sizeRef.current.h;
    timeRef.current++;
    const time = timeRef.current;
    ctx.clearRect(0, 0, w, h);

    drawBackground(ctx, w, h, time, isBreak);
    drawSunRays(ctx, sunRayRef.current, w, h, time);
    drawSandyBottom(ctx, w, h, time);

    // Rocks & shells (on the bottom, behind back seaweed)
    drawRocks(ctx, rockRef.current);
    drawShells(ctx, shellRef.current);

    // Back seaweed + corals
    drawSeaweed(ctx, seaweedRef.current.filter(wd => wd.layer === 0), time);
    drawCorals(ctx, coralRef.current.filter(c => c.layer === 0), time);

    // Fish
    const maxSpeed = 1.2 * s.fishSpeed;
    const fishArr = fishRef.current;
    for (const f of fishArr) {
      f.acc = { x: 0, y: 0 };
      applyBoids(f, fishArr, w, h);
      f.vel = vecAdd(f.vel, f.acc);
      f.vel = vecLimit(f.vel, maxSpeed);
      f.pos = vecAdd(f.pos, f.vel);
      if (f.pos.x < -20) f.pos.x = w + 20;
      if (f.pos.x > w + 20) f.pos.x = -20;
      if (f.pos.y < -20) f.pos.y = h * 0.75;
      if (f.pos.y > h * 0.8) f.pos.y = -20;
    }
    drawFish(ctx, fishArr, time);

    // Mid layer
    drawSeaweed(ctx, seaweedRef.current.filter(wd => wd.layer === 1), time);
    drawCorals(ctx, coralRef.current.filter(c => c.layer === 1), time);
    // Front layer
    drawSeaweed(ctx, seaweedRef.current.filter(wd => wd.layer === 2), time);
    drawCorals(ctx, coralRef.current.filter(c => c.layer === 2), time);

    // Bubbles
    if (s.bubbleEnabled) {
      const bubbles = bubbleRef.current;
      const maxB = Math.floor(BASE_BUBBLE_MAX * s.bubbleDensity);
      if (bubbles.length < maxB && Math.random() < 0.025 * s.bubbleDensity) bubbles.push(spawnBubble(w, h));
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= b.speed;
        b.x += Math.sin(time * 0.015 + b.wobblePhase) * b.wobbleAmp * 0.15;
        b.alpha *= 0.9995;
        if (b.y < -10 || b.alpha < 0.01) bubbles.splice(i, 1);
      }
      drawBubbles(ctx, bubbles);
    }

    // Particles
    ctx.fillStyle = 'rgba(180,210,230,0.12)';
    for (let i = 0; i < 25; i++) {
      const px = (Math.sin(time * 0.0008 + i * 47) * 0.5 + 0.5) * w;
      const py = (Math.cos(time * 0.0006 + i * 31) * 0.5 + 0.5) * h;
      ctx.beginPath(); ctx.arc(px, py, 0.4 + Math.sin(time * 0.004 + i) * 0.2, 0, Math.PI * 2); ctx.fill();
    }

    animRef.current = requestAnimationFrame(() => animateFnRef.current());
  }, [isBreak, drawBackground, drawSunRays, drawSeaweed, drawFish, drawBubbles, drawSandyBottom, drawCorals, drawRocks, drawShells, applyBoids, spawnBubble]);

  useEffect(() => { animateFnRef.current = animate; }, [animate]);

  /* --- Resize --- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w, h };
      fishRef.current = initFish(w, h);
      seaweedRef.current = initSeaweed(w, h);
      sunRayRef.current = initSunRays(w);
      coralRef.current = initCorals(w, h);
      rockRef.current = initRocks(w, h);
      shellRef.current = initShells(w, h);
      bubbleRef.current = [];
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initFish, initSeaweed, initSunRays, initCorals, initRocks, initShells]);

  /* --- Reinit when key settings change --- */
  useEffect(() => {
    const prev = prevSettingsRef.current;
    const curr = settings;
    prevSettingsRef.current = curr;
    const needsFishReinit = prev.fishCount !== curr.fishCount ||
      prev.fishColorStyle !== curr.fishColorStyle ||
      Math.abs(prev.fishSize - curr.fishSize) > 0.05;
    const needsSeaweedReinit = Math.abs(prev.seaweedDensity - curr.seaweedDensity) > 0.05;

    if (needsFishReinit || needsSeaweedReinit) {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        if (needsFishReinit) fishRef.current = initFish(w, h);
        if (needsSeaweedReinit) seaweedRef.current = initSeaweed(w, h);
      }
    }
  }, [settings, initFish, initSeaweed]);

  /* --- Animation loop --- */
  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />
  );
}
