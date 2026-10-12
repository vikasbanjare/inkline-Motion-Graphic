import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Img, continueRender, delayRender, useVideoConfig } from "remotion";
import * as brush from "p5.brush/standalone";
import { useLook } from "./look.ts";
import { noise2 } from "./rng.ts";
import type { Ring } from "./paths.ts";

/**
 * Canvas layers of the ensemble.
 *   Wash   p5.brush watercolour fills, hatching and pencil on any rings (not tied to a 3D scene)
 *   Field  the engraved line field: rows of waves with simplex-noise amplitude, drawn on row by row
 */

export type WashShape = {
  ring: Ring;
  color: string;
  opacity?: number; // 0..255
  bleed?: number;
  texture?: number;
  pencil?: { color?: string; weight?: number; brush?: string };
  hatch?: { gap: number; angle: number; color?: string; weight?: number };
};

let scaled = false;

/** p5.brush is one global instance: each Wash loads its own canvas, paints, and renders before the next layer runs. */
export const Wash: React.FC<{ shapes: WashShape[]; seed?: number; style?: React.CSSProperties }> = ({ shapes, seed = 1, style }) => {
  const look = useLook();
  const { width: W, height: H } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef("");
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    // the painting is a pure function of (shapes, seed, size): when a frame asks for the same picture as the last
    // frame this canvas painted (objects at rest, a frozen card), keep it instead of re-running the brush
    const key = `${W}x${H}:${seed}:${look.ink}:` + shapes.map((s) => `${s.color}|${s.opacity}|${s.bleed}|${s.texture}|${s.pencil?.color}|${s.hatch?.gap}|${s.ring.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}`).join(";");
    if (key === last.current) return;
    last.current = key;
    const h = delayRender("wash");
    brush.load(c);
    if (!scaled) {
      brush.scaleBrushes(5);
      scaled = true;
    }
    brush.angleMode(brush.DEGREES);
    brush.clear("#ffffff");
    brush.push();
    brush.translate(-W / 2, -H / 2);
    shapes.forEach((s, i) => {
      brush.seed(seed * 1009 + i * 97);
      brush.noiseSeed(seed * 31 + i * 7);
      brush.noStroke();
      brush.noHatch();
      brush.fill(s.color, s.opacity ?? 140);
      brush.fillTexture(s.texture ?? 0.55, 0.4);
      brush.fillBleed(s.bleed ?? 0.06, "out");
      if (s.hatch) {
        brush.hatch(s.hatch.gap, s.hatch.angle, { rand: 0.06, continuous: false, gradient: 0.3 });
        brush.hatchStyle("HB", s.hatch.color ?? look.ink, s.hatch.weight ?? 0.8);
      }
      brush.polygon(s.ring);
      brush.noHatch();
      if (s.pencil) {
        brush.noFill();
        brush.set(s.pencil.brush ?? "HB", s.pencil.color ?? look.ink, s.pencil.weight ?? 1);
        brush.polygon(s.ring);
      }
    });
    brush.pop();
    brush.render();
    continueRender(h);
  }, [shapes, seed, W, H, look.ink]);
  return (
    <AbsoluteFill style={{ mixBlendMode: "multiply", ...style }}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: W, height: H }} />
    </AbsoluteFill>
  );
};

export type FieldProps = {
  f: number;
  pitch: number; // px between rows
  lambda: number; // wavelength px
  amp: number; // amplitude px
  speed?: number; // px per frame the waves travel
  width?: number; // line width px
  color?: string;
  angle?: number; // degrees
  rows?: [number, number]; // y range drawn (px, before rotation)
  reveal?: number; // 0..1 draw-on left to right
  ragged?: number; // px of noise on the right edge of the reveal
  noiseAmp?: number; // 0..1 of amp modulated by noise
  clip?: Ring; // only inside this ring
  opacity?: number;
  style?: React.CSSProperties;
};

export const Field: React.FC<FieldProps> = ({ f, pitch, lambda, amp, speed = 3, width = 2, color, angle = 0, rows, reveal = 1, ragged = 0, noiseAmp = 0.35, clip, opacity = 1, style }) => {
  const look = useLook();
  const { width: W, height: H } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const x = ref.current?.getContext("2d");
    if (!x) return;
    x.clearRect(0, 0, W, H);
    x.save();
    if (clip && clip.length > 2) {
      x.beginPath();
      clip.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath();
      x.clip();
    }
    x.translate(W / 2, H / 2);
    x.rotate((angle * Math.PI) / 180);
    x.translate(-W / 2, -H / 2);
    x.strokeStyle = color ?? look.ink;
    x.lineWidth = width;
    x.lineCap = "round";
    x.globalAlpha = opacity;
    const nz = noise2(look.seed + 17);
    const span = Math.hypot(W, H);
    const [y0, y1] = rows ?? [(H - span) / 2, (H + span) / 2];
    const xs = (W - span) / 2, xe = (W + span) / 2;
    for (let y = y0; y <= y1; y += pitch) {
      const edge = xs + (xe - xs) * reveal + ragged * nz(y * 0.01, 3.1);
      if (edge <= xs) continue;
      x.beginPath();
      for (let px = xs; px <= Math.min(xe, edge); px += 6) {
        const a = amp * (1 - noiseAmp + noiseAmp * (0.5 + 0.5 * nz(px * 0.0015, y * 0.004 + f * 0.01)));
        const py = y + a * Math.sin(((px - f * speed) / lambda) * Math.PI * 2);
        if (px === xs) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  });
  return (
    <AbsoluteFill style={style}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: W, height: H }} />
    </AbsoluteFill>
  );
};

// ---- sprites ---------------------------------------------------------------------------------------------------------
type SpriteImg = { url: string; x: number; y: number; w: number; h: number };
const sprites = new Map<string, SpriteImg>();

/**
 * Paints shapes once with p5.brush into a canvas cropped to their bounds (on white, for multiply) and caches the result
 * by content. A sprite is a pure function of its shapes and seed, so every tab and every chunk paints the same pixels;
 * an object that moves rigidly (a drop) reuses its sprite and is only translated.
 */
export const paintSprite = (shapes: WashShape[], seed: number): SpriteImg | null => {
  if (!shapes.length) return null;
  const key = `${seed}:` + shapes.map((s) => `${s.color}|${s.opacity}|${s.bleed}|${s.texture}|${s.ring.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}`).join(";");
  const hit = sprites.get(key);
  if (hit) return hit;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of shapes) for (const [px, py] of s.ring) {
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  const m = 40; // room for bleed
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m);
  const w = Math.ceil(x1 + m - x0), h = Math.ceil(y1 + m - y0);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  brush.load(c);
  if (!scaled) {
    brush.scaleBrushes(5);
    scaled = true;
  }
  brush.clear("#ffffff");
  brush.push();
  brush.translate(-w / 2 - x0, -h / 2 - y0);
  shapes.forEach((s, i) => {
    brush.seed(seed * 1009 + i * 97);
    brush.noiseSeed(seed * 31 + i * 7);
    brush.noStroke();
    brush.noHatch();
    brush.fill(s.color, s.opacity ?? 140);
    brush.fillTexture(s.texture ?? 0.55, 0.4);
    brush.fillBleed(s.bleed ?? 0.06, "out");
    brush.polygon(s.ring);
  });
  brush.pop();
  brush.render();
  const out = { url: c.toDataURL("image/png"), x: x0, y: y0, w, h };
  sprites.set(key, out);
  return out;
};

/** A cached watercolour sprite, multiplied onto what is under it, offset by (dx, dy). */
export const Sprite: React.FC<{ shapes: WashShape[]; seed: number; dx?: number; dy?: number }> = ({ shapes, seed, dx = 0, dy = 0 }) => {
  const sp = useMemo(() => paintSprite(shapes, seed), [shapes, seed]);
  if (!sp) return null;
  return <Img src={sp.url} style={{ position: "absolute", left: sp.x + dx, top: sp.y + dy, width: sp.w, height: sp.h, mixBlendMode: "multiply" }} />;
};
