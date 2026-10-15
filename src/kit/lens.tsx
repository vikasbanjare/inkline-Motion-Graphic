import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * The lens grammar: transitions made by an optical device instead of a dissolve.
 * - `lens` enter: hard cut on the beat, then a dark iris opens from loupe size to the full frame;
 *   the outgoing shot closes its own iris onto its hero first.
 * - `sweep` enter: the edge of a big soft black disc passes left to right; the shot changes behind its darkest point.
 * All radii are sine-eased and start on the cut frame: a hold followed by a snap reads as a lurch (tools/jerk_qa.py).
 */

const DARK = "#070908";
const FULL = 2300; // px: covers the 1920x1080 frame from any centre we use

/** A soft circular mask on near-black, with a darker rim like a loupe's edge. r >= FULL draws the children untouched. */
export const Iris: React.FC<{ r: number; cx?: number; cy?: number; children: React.ReactNode }> = ({ r, cx = 960, cy = 540, children }) => {
  if (r >= FULL) return <AbsoluteFill>{children}</AbsoluteFill>;
  const m = `radial-gradient(circle ${Math.max(1, r)}px at ${cx}px ${cy}px, #000 ${Math.max(0, r - 90)}px, rgba(0,0,0,0) ${r}px)`;
  return (
    <AbsoluteFill style={{ background: DARK }}>
      <AbsoluteFill style={{ WebkitMaskImage: m, maskImage: m }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle ${Math.max(1, r)}px at ${cx}px ${cy}px, rgba(7,9,8,0) 72%, rgba(7,9,8,0.55) 92%, rgba(7,9,8,0) 100%)` }} />
    </AbsoluteFill>
  );
};

export const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const t01 = (f: number, a: number, b: number) => Math.min(1, Math.max(0, (f - a) / (b - a)));

/** Iris radius opening between frames a and b, from r0 to the full frame. Sine ease-out: it leaves the cut moving
 * (an ease-in-out repeated the first frame, which jerk_qa flags as a STUTTER) and settles gently. */
export const irisOpen = (f: number, a: number, b: number, r0 = 560) => r0 + (FULL - r0) * Math.sin((Math.PI / 2) * t01(f, a, b));
/** Iris radius closing between frames a and b, from the full frame down to r1. Sine ease-in: it accelerates into the cut. */
export const irisClose = (f: number, a: number, b: number, r1 = 520) => FULL - (FULL - r1) * (1 - Math.cos((Math.PI / 2) * t01(f, a, b)));

/** The lens edge sweeping across the frame between frames a and b; change the shot at the midpoint. */
export const LensSweep: React.FC<{ f: number; a: number; b: number }> = ({ f, a, b }) => {
  if (f < a || f > b) return null;
  const p = easeIO((f - a) / (b - a));
  const R = 1500, x = -R - 200 + p * (1920 + 2 * R + 400), y = 540 + 120 * (p - 0.5);
  return <AbsoluteFill style={{ background: `radial-gradient(circle ${R}px at ${x}px ${y}px, ${DARK} ${R - 260}px, rgba(7,9,8,0.75) ${R - 120}px, rgba(7,9,8,0) ${R}px)` }} />;
};
