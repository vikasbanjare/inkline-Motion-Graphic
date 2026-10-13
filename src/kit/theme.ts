import type { Pal } from "../film/core/engrave.ts";

/**
 * Two-ink worlds. A theme is one world's whole colour: the paper, the flowing line field, the disc that the opening
 * grows the world in, three engraving palettes (a = architecture / flora, b = secondary, hero = the subject that
 * carries foil) and the headline gradient. Neighbouring shots should use different themes so every cut changes ink.
 */
export type Theme = { paper: string; field: string; disc: string; a: Pal; b: Pal; hero: Pal; grad: [string, string, string]; tint: string };

const pal = (d: string, m: string, l: string, p: string): Pal => [[d, 0], [m, 0.42], [l, 0.8], [p, 1]];

export const PALS = {
  violet: pal("#2a1670", "#6247c9", "#b3a0ee", "#ece6fb"),
  green: pal("#2b4512", "#6c8b2b", "#c3d596", "#eef3dc"),
  indigo: pal("#181c5a", "#4a50a6", "#aeb1e2", "#eeeaf7"),
  lilac: pal("#3d2f7a", "#8676c4", "#cfc6ec", "#f2eefa"),
  terra: pal("#561c14", "#ad503a", "#eeb59c", "#f9e6da"),
  cream: pal("#6a4413", "#b98536", "#e8cf96", "#f6ebcb"),
  slate: pal("#1b2126", "#58636a", "#b5bdc0", "#eceeec"),
  sea: pal("#0f3b44", "#2f7f86", "#9fd0cc", "#e6f3f0"),
  espresso: pal("#2a160d", "#6b3f26", "#c79a74", "#f3e6d6"),
  rose: pal("#5a1c38", "#b25a7e", "#ecbccd", "#fbeaf0"),
  moss: pal("#1d3320", "#4f7a50", "#b9d2b0", "#eef4e8"),
  ink: pal("#121318", "#3b3d48", "#a2a4ae", "#ecebe6"),
  amber: pal("#5a2a06", "#b8661a", "#f0bf78", "#fbf0d8"),
  cherry: pal("#4a0c0c", "#a8281f", "#e88a74", "#f8e0d8"),
  sky: pal("#12304f", "#3a78b0", "#a8cfe8", "#eaf4fb"),
};
export type PalName = keyof typeof PALS;

export const THEMES: Record<string, Theme> = {
  meadow: { paper: "#e3ead0", field: "#b9bdae", disc: "#d3e0a8", a: PALS.green, b: PALS.violet, hero: PALS.violet, grad: ["#3b23a0", "#6a4fd0", "#2f7a4a"], tint: "#2c8c62" },
  dusk: { paper: "#d6d0ea", field: "#b7b0d6", disc: "#c3bce4", a: PALS.indigo, b: PALS.lilac, hero: PALS.indigo, grad: ["#26238a", "#5a4fc0", "#2a6aa0"], tint: "#3a3a8f" },
  terracotta: { paper: "#f1d9c6", field: "#e2b9a2", disc: "#ebc4ab", a: PALS.terra, b: PALS.cream, hero: PALS.terra, grad: ["#8a2a1e", "#c2553c", "#7a3a8a"], tint: "#a64c3b" },
  deep: { paper: "#dfe4e0", field: "#c3cbc8", disc: "#cdd6d2", a: PALS.slate, b: PALS.sea, hero: PALS.slate, grad: ["#1f3a44", "#3f6f7a", "#2a4f6a"], tint: "#3f6f7a" },
  lagoon: { paper: "#d9ece8", field: "#a9cfc9", disc: "#bfe0da", a: PALS.sea, b: PALS.slate, hero: PALS.sea, grad: ["#0f4a52", "#2f8f96", "#3a6aa0"], tint: "#2f7f86" },
  roastery: { paper: "#efe2d0", field: "#d5bea2", disc: "#e3cbaa", a: PALS.espresso, b: PALS.cream, hero: PALS.espresso, grad: ["#3d1e0e", "#8a5230", "#b47a3a"], tint: "#6b3f26" },
  honey: { paper: "#f6ebcb", field: "#e2cf9c", disc: "#efdcaa", a: PALS.cream, b: PALS.amber, hero: PALS.amber, grad: ["#6a3a08", "#b8661a", "#8a5a10"], tint: "#b98536" },
  blush: { paper: "#f6e2e8", field: "#e2bccb", disc: "#efcdd9", a: PALS.rose, b: PALS.lilac, hero: PALS.rose, grad: ["#6a1f42", "#b25a7e", "#6a3a9a"], tint: "#b25a7e" },
  forest: { paper: "#dfe8da", field: "#b7c8b0", disc: "#c9dbbf", a: PALS.moss, b: PALS.green, hero: PALS.moss, grad: ["#1d3d22", "#4f7a50", "#2f5a6a"], tint: "#4f7a50" },
  graphite: { paper: "#e4e3df", field: "#bdbcb6", disc: "#d2d1cb", a: PALS.ink, b: PALS.slate, hero: PALS.ink, grad: ["#121318", "#4a4c58", "#2a2c38"], tint: "#3b3d48" },
  sky: { paper: "#e0ecf5", field: "#b4cde0", disc: "#c6dcec", a: PALS.sky, b: PALS.indigo, hero: PALS.sky, grad: ["#12304f", "#3a78b0", "#4a50a6"], tint: "#3a78b0" },
};
export type ThemeName = keyof typeof THEMES;
export const theme = (n?: string): Theme => THEMES[n ?? "meadow"] ?? THEMES.meadow;
