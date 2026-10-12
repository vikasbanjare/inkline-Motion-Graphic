import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { getStroke } from "perfect-freehand";
import rough from "roughjs";
import { contours } from "d3-contour";
import { alpha, useLook } from "./look.ts";
import { noise2, noise3, boil } from "./rng.ts";
import { polyD, smoothD, trim, morph, offsets, type Pt, type Ring } from "./paths.ts";

/**
 * SVG layers of the ensemble. Each one reads the shared look, so they blend when stacked:
 *   Paper     ground + seeded grain (SVG turbulence) + soft vignette
 *   Pen       perfect-freehand strokes with pressure, drawn on by arc length
 *   Sketch    roughjs hachure and sketchy outlines, re-seeded on twos (hand-drawn boil)
 *   Contours  d3-contour isolines over simplex noise (terrain, map relief, ripples)
 *   MorphShape flubber shape-to-shape (match-cuts)
 *   Ribbon    bezier-js offset lines: an engraved band that keeps its spacing round a bend
 *   Matte     clips anything to a shape (polygon-clipping output): wipes, irises, cut-outs
 */

export const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={style}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};

// ---- Paper ---------------------------------------------------------------------------------------------------------
export const Paper: React.FC<{ color?: string; grain?: number; vignette?: number }> = ({ color, grain, vignette = 0.12 }) => {
  const look = useLook();
  const g = grain ?? look.grain;
  const id = `paper${look.seed}`;
  return (
    <>
      <AbsoluteFill style={{ background: color ?? look.paper }} />
      <Svg style={{ mixBlendMode: "multiply" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.75" numOctaves={3} seed={look.seed} />
          <feColorMatrix values={`0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 ${-1.2 * g} ${0.9 * g}`} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
        <radialGradient id={`${id}v`} cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#3a3226" stopOpacity={vignette} />
        </radialGradient>
        <rect width="100%" height="100%" fill={`url(#${id}v)`} />
      </Svg>
    </>
  );
};

// ---- Pen (perfect-freehand) ------------------------------------------------------------------------------------------
export type Stroke = { pts: Pt[]; t0?: number; t1?: number; size?: number; color?: string; opacity?: number; taper?: number; wobble?: number };

/** Resample a polyline so no segment is longer than `step` px (perfect-freehand cuts corners on sparse input). */
const densify = (pts: Pt[], step = 6): Pt[] => {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
};

const outline = (raw: Pt[], size: number, taper: number) => {
  const pts = densify(raw);
  // pressure: swells in the middle of the stroke, like a nib laid down and lifted
  const n = pts.length;
  const input = pts.map(([x, y], i) => [x, y, 0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / n)]);
  const o = getStroke(input, { size, thinning: 0.5, smoothing: 0.35, streamline: 0.12, simulatePressure: false, start: { taper }, end: { taper } });
  return polyD(o as Pt[], true);
};

/** Pen strokes as bare <path>s (for use inside another <svg>, e.g. under a mask). */
export const PenPaths: React.FC<{ strokes: Stroke[]; f?: number }> = ({ strokes, f = 0 }) => {
  const look = useLook();
  const nz = noise2(look.seed + 3);
  return (
    <>
      {strokes.map((s, i) => {
        let pts = s.t0 !== undefined || s.t1 !== undefined ? trim(s.pts, s.t0 ?? 0, s.t1 ?? 1) : s.pts;
        if (pts.length < 2) return null;
        if (s.wobble) {
          const b = boil(f, 2);
          pts = pts.map(([x, y], k) => [x + s.wobble! * nz(k * 0.17, b * 0.001 + i), y + s.wobble! * nz(b * 0.001 + i, k * 0.17)]);
        }
        return <path key={i} d={outline(pts, (s.size ?? 1) * look.weight * 2.4, s.taper ?? 40)} fill={s.color ?? look.ink} opacity={s.opacity ?? 1} />;
      })}
    </>
  );
};

export const Pen: React.FC<{ strokes: Stroke[]; f?: number; style?: React.CSSProperties }> = ({ strokes, f = 0, style }) => (
  <Svg style={style}>
    <PenPaths strokes={strokes} f={f} />
  </Svg>
);

// ---- Sketch (roughjs) ----------------------------------------------------------------------------------------------
export type SketchShape = {
  ring?: Ring;
  d?: string;
  fill?: string;
  stroke?: string;
  hachureAngle?: number;
  hachureGap?: number;
  fillStyle?: "hachure" | "cross-hatch" | "zigzag" | "dots" | "dashed" | "zigzag-line" | "solid";
  roughness?: number;
  strokeWidth?: number;
  fillWeight?: number;
  opacity?: number;
};

/** roughjs shapes as bare <g>s (for use inside another <svg>). */
export const SketchPaths: React.FC<{ shapes: SketchShape[]; f?: number; hold?: number }> = ({ shapes, f = 0, hold = 2 }) => {
  const look = useLook();
  const seed = boil(f, hold, look.seed);
  const paths = useMemo(() => {
    const gen = rough.generator();
    return shapes.map((s, i) => {
      const o = {
        seed: (seed + i * 131) % 2147483647 || 1,
        roughness: s.roughness ?? 1.1,
        bowing: 0.8,
        stroke: s.stroke ?? look.ink,
        strokeWidth: (s.strokeWidth ?? 0.6) * look.weight,
        fill: s.fill,
        fillStyle: s.fillStyle ?? "hachure",
        hachureAngle: s.hachureAngle ?? -41,
        hachureGap: s.hachureGap ?? 7,
        fillWeight: (s.fillWeight ?? 0.45) * look.weight,
        preserveVertices: false,
      };
      const dr = s.d ? gen.path(s.d, o) : gen.polygon(s.ring!, o);
      return { paths: gen.toPaths(dr), opacity: s.opacity ?? 1 };
    });
  }, [shapes, seed, look.ink, look.weight]);
  return (
    <>
      {paths.map((p, i) => (
        <g key={i} opacity={p.opacity}>
          {p.paths.map((q, k) => (
            <path key={k} d={q.d} stroke={q.stroke} strokeWidth={q.strokeWidth} fill={q.fill ?? "none"} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
      ))}
    </>
  );
};

export const Sketch: React.FC<{ shapes: SketchShape[]; f?: number; hold?: number; style?: React.CSSProperties }> = ({ shapes, f = 0, hold = 2, style }) => (
  <Svg style={style}>
    <SketchPaths shapes={shapes} f={f} hold={hold} />
  </Svg>
);

// ---- Contours (d3-contour over simplex noise) ----------------------------------------------------------------------
export const Contours: React.FC<{
  f: number;
  levels?: number;
  scale?: number; // noise features per screen width
  drift?: number; // noise time per frame
  color?: string;
  width?: number;
  opacity?: number;
  seed?: number;
  draw?: number; // 0..1: how many of the levels are drawn (lowest first)
  style?: React.CSSProperties;
}> = ({ f, levels = 12, scale = 2.4, drift = 0.004, color, width = 1, opacity = 0.8, seed = 11, draw = 1, style }) => {
  const look = useLook();
  const { width: W, height: H } = useVideoConfig();
  const gw = 192, gh = Math.round((gw * H) / W);
  const nz = noise3(seed);
  const grid = new Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const u = (x / gw) * scale, v = (y / gw) * scale;
      grid[y * gw + x] = 0.6 * nz(u, v, f * drift) + 0.3 * nz(u * 2.1, v * 2.1, f * drift * 1.5 + 9) + 0.1 * nz(u * 4.3, v * 4.3, 3);
    }
  const th = Array.from({ length: levels }, (_, i) => -0.8 + (1.6 * (i + 0.5)) / levels);
  const shown = Math.ceil(levels * draw);
  const cs = contours().size([gw, gh]).thresholds(th)(grid).slice(0, shown);
  const k = W / gw;
  return (
    <Svg style={style}>
      <g transform={`scale(${k})`} fill="none" stroke={color ?? look.inkSoft} strokeWidth={(width * look.weight * 0.5) / k} opacity={opacity}>
        {cs.map((c, i) => (
          <path key={i} d={c.coordinates.map((poly) => poly.map((r) => smoothD(r as Pt[], true)).join("")).join("")} />
        ))}
      </g>
    </Svg>
  );
};

// ---- MorphShape (flubber) -----------------------------------------------------------------------------------------
export const MorphShape: React.FC<{ id: string; a: Ring | string; b: Ring | string; t: number; fill?: string; stroke?: string; width?: number; style?: React.CSSProperties }> = ({ id, a, b, t, fill, stroke, width = 1, style }) => {
  const look = useLook();
  const d = morph(id, a, b)(Math.min(1, Math.max(0, t)));
  return (
    <Svg style={style}>
      <path d={d} fill={fill ?? "none"} stroke={stroke ?? (fill ? "none" : look.ink)} strokeWidth={width * look.weight} strokeLinejoin="round" />
    </Svg>
  );
};

// ---- Ribbon (bezier-js offsets) -----------------------------------------------------------------------------------
export const Ribbon: React.FC<{ c: [Pt, Pt, Pt, Pt]; lines?: number; spacing?: number; draw?: number; color?: string; width?: number; style?: React.CSSProperties }> = ({ c, lines = 9, spacing = 7, draw = 1, color, width = 0.5, style }) => {
  const look = useLook();
  const ds = useMemo(() => offsets(c, Array.from({ length: lines }, (_, i) => (i - (lines - 1) / 2) * spacing)), [c, lines, spacing]);
  return (
    <Svg style={style}>
      {ds.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color ?? look.ink} strokeWidth={width * look.weight} pathLength={1} strokeDasharray={`${draw} 1`} strokeLinecap="round" />
      ))}
    </Svg>
  );
};

// ---- Matte --------------------------------------------------------------------------------------------------------
/** Clip children to an SVG path (e.g. mpD(union(...)) or polyD(ring)). `invert` keeps what is outside. */
export const Matte: React.FC<{ d: string; invert?: boolean; children: React.ReactNode }> = ({ d, invert, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const path = invert ? `M0,0H${W}V${H}H0Z${d}` : d;
  return <AbsoluteFill style={{ clipPath: `path(evenodd, '${path}')` }}>{children}</AbsoluteFill>;
};

// ---- Grain line (a single drawn rule, used under type) ------------------------------------------------------------
export const Rule: React.FC<{ x0: number; x1: number; y: number; t: number; color?: string }> = ({ x0, x1, y, t, color }) => {
  const look = useLook();
  return (
    <Svg>
      <line x1={x0} x2={x0 + (x1 - x0) * t} y1={y} y2={y} stroke={color ?? look.ink} strokeWidth={look.weight * 0.6} />
    </Svg>
  );
};

export { alpha };
