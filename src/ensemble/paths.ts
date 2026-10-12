import { svgPathProperties } from "svg-path-properties";
import { line, curveCatmullRom, curveCatmullRomClosed, curveBasis } from "d3-shape";
import { Bezier } from "bezier-js";
import pc from "polygon-clipping";
import { interpolate as flubberInterp } from "flubber";

/**
 * Geometry shared by every layer. Paths are point lists ([x, y][]); helpers turn them into SVG `d` strings.
 *   svg-path-properties: sample any SVG path by arc length (draw-on, pen strokes along authored paths)
 *   d3-shape: smooth curves through points
 *   bezier-js: true offset curves (parallel engraving lines that keep their spacing round bends)
 *   polygon-clipping: union / intersection / difference of shapes (mattes, wipes, cut-outs)
 *   flubber: morph one shape into another (match-cuts)
 */
export type Pt = [number, number];
export type Ring = Pt[];

/** Evenly spaced points along an SVG path. */
export const sample = (d: string, n: number): Pt[] => {
  const p = new svgPathProperties(d);
  const L = p.getTotalLength();
  return Array.from({ length: n }, (_, i) => {
    const q = p.getPointAtLength((L * i) / (n - 1));
    return [q.x, q.y] as Pt;
  });
};

/** Path length (px). */
export const length = (d: string) => new svgPathProperties(d).getTotalLength();

/** Points from t0 to t1 (0..1 of arc length) of a polyline: the draw-on of a stroke. */
export const trim = (pts: Pt[], t0: number, t1: number): Pt[] => {
  if (pts.length < 2 || t1 <= t0) return [];
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = seg[seg.length - 1];
  const a = t0 * L, b = t1 * L;
  const at = (s: number): Pt => {
    let i = 1;
    while (i < seg.length - 1 && seg[i] < s) i++;
    const u = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
  };
  const out: Pt[] = [at(a)];
  for (let i = 0; i < pts.length; i++) if (seg[i] > a && seg[i] < b) out.push(pts[i]);
  out.push(at(b));
  return out;
};

/** Smooth curve through points (Catmull-Rom; closed rings wrap). */
export const smoothD = (pts: Pt[], closed = false, basis = false) =>
  line().curve(basis ? curveBasis : closed ? curveCatmullRomClosed : curveCatmullRom.alpha(0.5))(pts) ?? "";

/** Straight polyline / polygon. */
export const polyD = (pts: Pt[], closed = false) =>
  pts.length ? `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}${closed ? "Z" : ""}` : "";

/** Parallel offsets of a cubic Bezier (bezier-js): engraved ribbon lines that keep their spacing round a bend. */
export const offsets = (c: [Pt, Pt, Pt, Pt], dists: number[]): string[] => {
  const b = new Bezier(c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]);
  return dists.map((d) => {
    const parts = b.offset(d) as Bezier[];
    return parts
      .map((s, i) => {
        const p = s.points;
        const head = i === 0 ? `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}` : "";
        return p.length === 4
          ? `${head}C${p[1].x.toFixed(1)},${p[1].y.toFixed(1)} ${p[2].x.toFixed(1)},${p[2].y.toFixed(1)} ${p[3].x.toFixed(1)},${p[3].y.toFixed(1)}`
          : `${head}Q${p[1].x.toFixed(1)},${p[1].y.toFixed(1)} ${p[2].x.toFixed(1)},${p[2].y.toFixed(1)}`;
      })
      .join("");
  });
};

// ---- shapes --------------------------------------------------------------------------------------------------------
export const circle = (cx: number, cy: number, r: number, n = 96): Ring =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);

export const roundRect = (x: number, y: number, w: number, h: number, r: number, n = 10): Ring => {
  const out: Ring = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return out;
};

/** Transform a ring: scale about (ox, oy), rotate, translate. */
export const xf = (r: Ring, s: number, rot: number, tx: number, ty: number, ox = 0, oy = 0): Ring => {
  const c = Math.cos(rot), si = Math.sin(rot);
  return r.map(([x, y]) => {
    const dx = (x - ox) * s, dy = (y - oy) * s;
    return [ox + dx * c - dy * si + tx, oy + dx * si + dy * c + ty];
  });
};

// ---- boolean ops (polygon-clipping) --------------------------------------------------------------------------------
type MP = Pt[][][];
const asGeom = (rs: Ring[]) => rs.map((r) => [r]) as unknown as Parameters<typeof pc.union>[0];
export const union = (...rs: Ring[]): MP => pc.union(asGeom(rs)) as MP;
export const diff = (a: Ring[], b: Ring[]): MP => pc.difference(asGeom(a), asGeom(b)) as MP;
export const intersect = (a: Ring[], b: Ring[]): MP => pc.intersection(asGeom(a), asGeom(b)) as MP;
/** Multipolygon to an SVG path (even-odd holes). */
export const mpD = (mp: MP) => mp.map((poly) => poly.map((r) => polyD(r, true)).join("")).join("");

// ---- morphs (flubber) ----------------------------------------------------------------------------------------------
const morphs = new Map<string, (t: number) => string>();
/** Cached shape morph between two closed rings (or SVG path strings). */
export const morph = (key: string, a: Ring | string, b: Ring | string, maxSegmentLength = 6) => {
  let m = morphs.get(key);
  if (!m) morphs.set(key, (m = flubberInterp(a as never, b as never, { maxSegmentLength })));
  return m;
};
