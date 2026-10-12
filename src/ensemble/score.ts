import { spring } from "remotion";
import beats from "./beats.json";

/**
 * The score: where every cue sits in time. Cues snap to the onsets meyda found in the mix (tools/beats.mjs), so
 * something lands on every hit (digest rule 2). Springs are tightly damped: a few percent of overshoot at most (rule 4).
 */
export const ONSETS: number[] = beats.frames;
export const ENERGY: number[] = beats.energy;

/** Nearest onset within `win` frames, else the frame itself. */
export const snap = (f: number, win = 4) => {
  let best = f, d = win + 1;
  for (const o of ONSETS) {
    const e = Math.abs(o - f);
    if (e < d) {
      d = e;
      best = o;
    }
  }
  return best;
};

/** The k-th onset at or after frame f. */
export const onsetAfter = (f: number, k = 0) => {
  const i = ONSETS.findIndex((o) => o >= f);
  return i < 0 ? f : ONSETS[Math.min(ONSETS.length - 1, i + k)];
};

/** Tight spring 0..1 starting at frame `at`. */
export const pop = (f: number, at: number, stiff = 210) =>
  spring({ frame: f - at, fps: 24, config: { damping: 22, stiffness: stiff, mass: 0.7 } });

/** Mix energy at a frame (0..1). */
export const energy = (f: number) => ENERGY[Math.max(0, Math.min(ENERGY.length - 1, Math.round(f)))] ?? 0;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0..1 ramp between frames a and b with smoothstep. */
export const ramp = (f: number, a: number, b: number) => {
  const t = clamp01((f - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
};
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
