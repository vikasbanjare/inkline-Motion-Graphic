import { createContext, useContext } from "react";
import { converter, formatHex, interpolate as cInterp, type Color } from "culori";

/**
 * The shared look. Every layer in the ensemble reads its colours, line weight and paper from here, so a wash painted by
 * p5.brush, a hachure from roughjs, a pen line from perfect-freehand and an engraved 3D world all sit in one ink family.
 * Colour maths runs in OKLab (culori) so grades between worlds stay even in lightness and never pass through mud.
 */
export type Look = {
  paper: string; // ground
  ink: string; // main line colour
  inkSoft: string; // secondary line
  washes: string[]; // watercolour fills, light to dark
  accent: string; // one restrained accent
  weight: number; // base line weight in px at 1080p
  grain: number; // paper grain 0..1
  seed: number;
};

const toOk = converter("oklab");

/** Mix two colours in OKLab. */
export const mix = (a: string, b: string, t: number) => formatHex(cInterp([a, b], "oklab")(Math.min(1, Math.max(0, t)))) ?? a;

/** Shift a colour's OKLab lightness by dl (−1..1). */
export const lighten = (c: string, dl: number) => {
  const o = toOk(c);
  if (!o) return c;
  return formatHex({ ...o, l: Math.min(1, Math.max(0, o.l + dl)) } as Color) ?? c;
};

/** Hex + alpha (0..1) as rgba(). */
export const alpha = (c: string, a: number) => {
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Grade one look into another (every colour in OKLab, numbers linearly). */
export const gradeLook = (a: Look, b: Look, t: number): Look => ({
  paper: mix(a.paper, b.paper, t),
  ink: mix(a.ink, b.ink, t),
  inkSoft: mix(a.inkSoft, b.inkSoft, t),
  washes: a.washes.map((w, i) => mix(w, b.washes[Math.min(i, b.washes.length - 1)], t)),
  accent: mix(a.accent, b.accent, t),
  weight: a.weight + (b.weight - a.weight) * t,
  grain: a.grain + (b.grain - a.grain) * t,
  seed: t < 0.5 ? a.seed : b.seed,
});

export const LookCtx = createContext<Look>({
  paper: "#f1ede2",
  ink: "#2f3437",
  inkSoft: "#6d7f78",
  washes: ["#d9e6df", "#a9c8bd", "#5f978e"],
  accent: "#c86b4a",
  weight: 2.2,
  grain: 0.35,
  seed: 7,
});
export const useLook = () => useContext(LookCtx);
