import { Easing, interpolate } from "remotion";
import type { Pal } from "./engrave.ts";

/** Film grid: 24 fps, 125 BPM (beat 0.48 s = 11.52 frames, bar 1.92 s = 46.08 frames). */
export const FPS = 24;
export const FRAMES = 720;
export const BEAT = 11.52;
export const BAR = 46.08;
export const beatF = (k: number) => Math.round(k * BEAT);

/** Picture EDL (frames). Cuts sit on the beat grid; music sections in the score are on bar lines. */
export const T = {
  stepA: 0, // single line, truck
  stepB: 22, // scale-step cut: 5 lines
  stepC: 40, // scale-step cut: dense field
  wash: 72, // colour-wash wipe (audio dead gap under it)
  assembly: 86, // objects fly in
  reveal: 150, // print becomes the card
  cutMacro: 207, // hard cut, beat 18 (8.64 s)
  push: 262, // push-through along the band
  swap: 290, // lens-swap drop starts (lands +15)
  tilt: 325, // iris-out + tilt-up (route map becomes world)
  matte: 381, // card-slab matte wipe (11 frames)
  products: 392, // products world (beat 34)
  cutCard: 484, // hard cut, beat 42 (20.16 s)
  whip: 550, // whip-out
  studio: 561, // hidden cut into the studio
  flip: 628, // card flips to its back
  lockup: 645, // cut on the flip, bar (26.88 s)
  end: 720,
} as const;

export const SEC = { intro: 3.84, grooveA: 5.76, drop: 17.28, break: 19.2, drop2: 21.12, outro: 26.88, tail: 28.8 };

// ---- easing ------------------------------------------------------------------------------------------------------
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.45, 0, 0.55, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.75, 0);
export const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ramp = (f: number, a: number, b: number, e: (t: number) => number = inOut) => interpolate(f, [a, b], [0, 1], { ...C, easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---- palettes (ours; one ink family per world; lightness character follows the measured worlds) ---------------------
export const P: Record<string, Pal> = {
  grey: [["#5f5f5f", 0], ["#ababab", 0.5], ["#ebebeb", 1]],
  teal: [["#1f5a5e", 0], ["#4f9792", 0.45], ["#a8d4c8", 0.83], ["#dcefe4", 1]],
  ochre: [["#6a4413", 0], ["#b98536", 0.45], ["#e8cf96", 0.83], ["#f6ebcb", 1]],
  coral: [["#8a3328", 0], ["#d9775a", 0.5], ["#f6c7ae", 1]], // posterised hero tag
  cyan: [["#173a6b", 0], ["#3f86b8", 0.45], ["#9fd3ea", 0.83], ["#d6f1f7", 1]],
  cyanDeep: [["#0f2546", 0], ["#2b5f93", 0.45], ["#7fb6d8", 0.83], ["#c4e5f2", 1]],
  indigo: [["#262c66", 0], ["#5d64a3", 0.45], ["#c3c1db", 0.83], ["#efe8d8", 1]],
  brass: [["#4b3a1d", 0], ["#8f7440", 0.45], ["#d7c296", 0.83], ["#f1e8d3", 1]],
  terra: [["#561a16", 0], ["#a64c3b", 0.45], ["#e7ab91", 0.83], ["#f8e0d2", 1]],
  rose: [["#6d2a49", 0], ["#b9688a", 0.45], ["#ecc0cf", 0.83], ["#fbe9ee", 1]],
  green: [["#1c3d2a", 0], ["#4f7d5c", 0.45], ["#c3d6b0", 0.83], ["#f0ecd8", 1]],
  graphite: [["#121214", 0], ["#3a3a3f", 0.45], ["#9a9aa2", 0.83], ["#e6e6ea", 1]],
};

export const INK = {
  paperGrey: "#d3d3d1",
  pen: "#29282c",
  washA: "#d5e5da",
  washB: "#ebdcb4",
  slate: "#0d1526",
  lensDark: "11,13,12",
  travelSky: "#ece4d2",
  travelInk: "#262c66",
  terraBg0: "#f1d3c2",
  terraBg1: "#e1b6a2",
  terraInk: "#6e2a22",
  greenGround: "#123826",
  studio0: "#ece9e3",
  studio1: "#c9c4bb",
};

/** Mix two palettes stop-by-stop (both must have the same stop count/positions). */
export const mixPal = (a: Pal, b: Pal, t: number): Pal =>
  a.map(([ha, p], i) => {
    const hb = b[i][0];
    const ca = parseInt(ha.slice(1), 16), cb = parseInt(hb.slice(1), 16);
    const ch = (s: number) => Math.round(lerp((ca >> s) & 255, (cb >> s) & 255, t));
    return ["#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join(""), p] as [string, number];
  });

// deterministic pseudo-random
export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const SERIF = "'Newsreader', serif"; // open-licence serif (SIL OFL)
export const SANS = "'Lexend', sans-serif"; // stand-in for Gilroy
