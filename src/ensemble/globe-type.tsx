import React, { useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import opentype from "opentype.js";
import { getStroke } from "perfect-freehand";
import { useLook } from "./look.ts";
import { polyD, type Pt } from "./paths.ts";

/**
 * Globe: Natural Earth land (world-atlas, ISC; data public domain) on an orthographic projection, drawn as pen
 *        coastlines with a graticule. Back hemisphere is cut, not drawn.
 * Type:  glyph outlines from opentype.js (font: Lexend, OFL) so a line of type can be drawn on with the pen and then
 *        filled, in the same ink as everything else. Real copy only; never a logo or wordmark.
 */

const LAND = (() => {
  const topo = land110 as unknown as Topology;
  const fc = feature(topo, topo.objects.land as GeometryCollection);
  const rings: [number, number][][] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g.type === "Polygon") rings.push(...(g.coordinates as [number, number][][]));
    if (g.type === "MultiPolygon") for (const p of g.coordinates as [number, number][][][]) rings.push(...p);
  }
  return rings;
})();

const project = (lon: number, lat: number, lon0: number, lat0: number): [number, number, number] => {
  const r = Math.PI / 180;
  const l = (lon - lon0) * r, p = lat * r, p0 = lat0 * r;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [Math.cos(p) * Math.sin(l), -(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), cosc];
};

/** Splits a lon/lat ring into visible screen polylines. */
const visible = (ring: [number, number][], lon0: number, lat0: number, cx: number, cy: number, R: number): Pt[][] => {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const [lon, lat] of ring) {
    const [x, y, c] = project(lon, lat, lon0, lat0);
    if (c > 0) cur.push([cx + x * R, cy + y * R]);
    else if (cur.length) {
      if (cur.length > 1) out.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
};

export const Globe: React.FC<{
  cx: number;
  cy: number;
  r: number;
  lon: number;
  lat?: number;
  draw?: number; // 0..1 of coastline drawn
  land?: string; // land tint (optional)
  graticule?: number; // opacity of the grid
  style?: React.CSSProperties;
}> = ({ cx, cy, r, lon, lat = 18, draw = 1, land, graticule = 0.35, style }) => {
  const look = useLook();
  const { width: W, height: H } = useVideoConfig();
  const coast = useMemo(() => LAND.flatMap((ring) => visible(ring, lon, lat, cx, cy, r)), [lon, lat, cx, cy, r]);
  const grid = useMemo(() => {
    const ls: Pt[][] = [];
    for (let g = -180; g < 180; g += 20) ls.push(...visible(Array.from({ length: 91 }, (_, i) => [g, -90 + i * 2] as [number, number]), lon, lat, cx, cy, r));
    for (let p = -60; p <= 60; p += 20) ls.push(...visible(Array.from({ length: 181 }, (_, i) => [-180 + i * 2, p] as [number, number]), lon, lat, cx, cy, r));
    return ls;
  }, [lon, lat, cx, cy, r]);
  const n = Math.round(coast.length * draw);
  const w = look.weight;
  return (
    <AbsoluteFill style={style}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <g fill="none" stroke={look.inkSoft} strokeWidth={w * 0.35} opacity={graticule}>
          {grid.map((l, i) => (
            <path key={i} d={polyD(l)} />
          ))}
        </g>
        {land ? (
          <g fill={land} opacity={0.55}>
            {coast.slice(0, n).map((l, i) => (
              <path key={i} d={polyD(l, true)} />
            ))}
          </g>
        ) : null}
        <g fill="none" stroke={look.ink} strokeWidth={w * 0.55} strokeLinejoin="round">
          {coast.slice(0, n).map((l, i) => (
            <path key={i} d={polyD(l)} />
          ))}
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={look.ink} strokeWidth={w * 0.9} />
      </svg>
    </AbsoluteFill>
  );
};

// ---- Type ----------------------------------------------------------------------------------------------------------
let fontP: Promise<opentype.Font> | null = null;
const loadFont = () => (fontP ??= fetch(staticFile("fonts/ensemble/Lexend-600.woff")).then((r) => r.arrayBuffer()).then((b) => opentype.parse(b)));

/** Outline polylines of each glyph contour (flattened). */
const contoursOf = (font: opentype.Font, text: string, x: number, y: number, size: number): Pt[][] => {
  const cmds = font.getPath(text, x, y, size).commands;
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let last: Pt = [0, 0];
  for (const c of cmds) {
    if (c.type === "M") {
      if (cur.length > 1) out.push(cur);
      cur = [[c.x, c.y]];
      last = [c.x, c.y];
    } else if (c.type === "L") {
      cur.push([c.x, c.y]);
      last = [c.x, c.y];
    } else if (c.type === "Q") {
      for (let t = 0.25; t <= 1; t += 0.25) {
        const u = 1 - t;
        cur.push([u * u * last[0] + 2 * u * t * c.x1 + t * t * c.x, u * u * last[1] + 2 * u * t * c.y1 + t * t * c.y]);
      }
      last = [c.x, c.y];
    } else if (c.type === "C") {
      for (let t = 0.2; t <= 1; t += 0.2) {
        const u = 1 - t;
        cur.push([
          u * u * u * last[0] + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * last[1] + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      last = [c.x, c.y];
    } else if (c.type === "Z") {
      if (cur.length > 1) out.push([...cur, cur[0]]);
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
};

/**
 * A line of type uncovered left to right behind a pen nib (draw 0..1); fill 0..1 settles its opacity.
 * Anchored by its left baseline (or centre with align="center").
 */
export const PenType: React.FC<{ text: string; x: number; y: number; size: number; draw: number; fill: number; color?: string; align?: "left" | "center" }> = ({ text, x, y, size, draw, fill, color, align = "left" }) => {
  const look = useLook();
  const { width: W, height: H } = useVideoConfig();
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [handle] = useState(() => delayRender("font outlines"));
  useLayoutEffect(() => {
    loadFont().then((f) => {
      setFont(f);
      continueRender(handle);
    });
  }, [handle]);
  const paths = useMemo(() => {
    if (!font) return null;
    const w = font.getAdvanceWidth(text, size);
    const x0 = align === "center" ? x - w / 2 : x;
    const cs = contoursOf(font, text, x0, y, size);
    return { fillD: cs.map((c) => polyD(c, true)).join(""), x0, w };
  }, [font, text, x, y, size, align]);
  if (!paths) return null;
  const ink = color ?? look.ink;
  // reveal: the type is uncovered left to right behind a pen nib that rides the baseline (draw 0..1);
  // fill 0..1 settles the last few percent of opacity so the end of the write lands on a beat
  const reveal = Math.min(1, draw);
  const edge = paths.x0 - size * 0.1 + (paths.w + size * 0.2) * reveal;
  const id = `pt${Math.round(x)}_${Math.round(y)}_${text.length}`;
  const nib = reveal > 0 && reveal < 1 ? getStroke([[edge - size * 0.9, y + size * 0.16, 0.2], [edge - size * 0.3, y + size * 0.15, 0.6], [edge, y + size * 0.14, 0.9]], { size: Math.max(2, size * 0.06), thinning: 0.6, simulatePressure: false, end: { taper: size * 0.3 } }) : null;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={id}>
            <rect x={paths.x0 - size} y={y - size * 1.4} width={Math.max(0, edge - paths.x0 + size)} height={size * 2} />
          </clipPath>
        </defs>
        <path d={paths.fillD} fill={ink} opacity={0.82 + 0.18 * fill} clipPath={`url(#${id})`} />
        {nib ? <path d={polyD(nib as Pt[], true)} fill={ink} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
