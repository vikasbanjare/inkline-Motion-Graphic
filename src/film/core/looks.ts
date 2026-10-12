import type { Look } from "../../ensemble/look.ts";

/** One look per world; neighbouring worlds are graded into each other in OKLab (culori) across each hand-off. */
const base = { weight: 2.2, grain: 0.32, seed: 7 };
export const LOOKS: Record<string, Look> = {
  open: { ...base, paper: "#e7e5df", ink: "#29282c", inkSoft: "#7d7c80", washes: ["#dcdcd8", "#b8b8b4", "#8f8f8c"], accent: "#4f9792" },
  parcel: { ...base, paper: "#eaf1ea", ink: "#1f3a3c", inkSoft: "#6d9a90", washes: ["#d5e5da", "#a8d4c8", "#4f9792"], accent: "#d9775a" },
  travel: { ...base, paper: "#efe8d8", ink: "#262c66", inkSoft: "#8a8fb8", washes: ["#e9e1cf", "#c3c1db", "#5d64a3"], accent: "#d9775a", seed: 9 },
  products: { ...base, paper: "#f7ebe2", ink: "#6e2a22", inkSoft: "#c48a76", washes: ["#f8e0d2", "#e7ab91", "#a64c3b"], accent: "#4f9792", seed: 11 },
  fee: { ...base, paper: "#e6efe9", ink: "#1f5a5e", inkSoft: "#6d9a90", washes: ["#dcefe4", "#a8d4c8", "#4f9792"], accent: "#d9775a", seed: 13 },
};

/** Film EDL (frames at 24 fps): the v2 mix is cut to these, so the new film keeps them. */
export const T = {
  stepB: 22,
  stepC: 40,
  wash: 72,
  assembly: 86,
  reveal: 150,
  macro: 207,
  push: 262,
  swap: 290,
  tilt: 325,
  matte: 381,
  products: 392,
  card: 484,
  whip: 550,
  studio: 561,
  lockup: 645,
  end: 720,
} as const;

export const CARD = { w: 900, h: 568, r: 40 };
