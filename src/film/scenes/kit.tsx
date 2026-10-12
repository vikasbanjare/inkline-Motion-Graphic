import React from "react";
import { AbsoluteFill } from "remotion";
import type { Pal } from "../core/engrave.ts";

/** v6 palettes: one duotone pair per world, measured off the reference's worlds (subject ink + ground ink). */
export const PAL = {
  violet: [["#2a1670", 0], ["#6247c9", 0.42], ["#b3a0ee", 0.8], ["#ece6fb", 1]] as Pal,
  green: [["#2b4512", 0], ["#6c8b2b", 0.42], ["#c3d596", 0.8], ["#eef3dc", 1]] as Pal,
  indigo: [["#181c5a", 0], ["#4a50a6", 0.42], ["#aeb1e2", 0.8], ["#eeeaf7", 1]] as Pal,
  lilac: [["#3d2f7a", 0], ["#8676c4", 0.42], ["#cfc6ec", 0.8], ["#f2eefa", 1]] as Pal,
  terra: [["#561c14", 0], ["#ad503a", 0.42], ["#eeb59c", 0.8], ["#f9e6da", 1]] as Pal,
  cream: [["#6a4413", 0], ["#b98536", 0.42], ["#e8cf96", 0.8], ["#f6ebcb", 1]] as Pal,
  slate: [["#1b2126", 0], ["#58636a", 0.42], ["#b5bdc0", 0.8], ["#eceeec", 1]] as Pal,
  sea: [["#0f3b44", 0], ["#2f7f86", 0.42], ["#9fd0cc", 0.8], ["#e6f3f0", 1]] as Pal,
};

/** Engraving defaults for v6: near-horizontal wavy screen like the reference's intaglio, fine pitch. */
export const ENGRAVE = { periodFrac: 0.0052, angleDeg: 12, wobble: 0.55, toneGamma: 1.15, hatch: 0.5, hatchT: 0.38, stipple: 0.4, follow: 0.3, detail: 0.2, edge: 0.9 };

export const M = "models/";

/** The reference's serif headline: large, top-centre, gradient ink, a small sans line under it. */
export const Headline: React.FC<{ text: string; sub?: string; grad: [string, string, string]; t: number; size?: number; top?: number }> = ({ text, sub, grad, t, size = 92, top = 86 }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: top, pointerEvents: "none" }}>
    <div
      style={{
        fontFamily: "Newsreader",
        fontWeight: 600,
        fontSize: size,
        letterSpacing: -2,
        lineHeight: 1.02,
        textAlign: "center",
        background: `linear-gradient(90deg, ${grad[0]}, ${grad[1]} 50%, ${grad[2]})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        opacity: Math.min(1, t * 1.4),
        transform: `translateY(${(1 - t) * 22}px)`,
        whiteSpace: "pre",
      }}
    >
      {text}
    </div>
    {sub ? <div style={{ fontFamily: "Lexend", fontWeight: 500, fontSize: 28, color: grad[0], marginTop: 14, opacity: Math.max(0, t * 1.4 - 0.4) }}>{sub}</div> : null}
  </AbsoluteFill>
);

/** Loupe / spyglass vignette: black outside a soft circle of radius r (fraction of the frame height). */
export const Lens: React.FC<{ r: number; cx?: number; cy?: number; soft?: number }> = ({ r, cx = 0.5, cy = 0.5, soft = 0.12 }) => {
  const R = r * 1080;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle ${Math.max(1, R)}px at ${cx * 100}% ${cy * 100}%, rgba(0,0,0,0) ${100 - soft * 100}%, rgba(8,10,9,0.92) 100%)`,
        boxShadow: `inset 0 0 0 4000px rgba(0,0,0,0)`,
      }}
    >
      <AbsoluteFill style={{ background: `radial-gradient(circle ${Math.max(1, R * 1.02)}px at ${cx * 100}% ${cy * 100}%, rgba(0,0,0,0) 98%, #070908 100%)` }} />
    </AbsoluteFill>
  );
};

/** Holographic foil band (CSS): a rainbow sweep that shifts with the camera, multiplied into the print. */
export const Holo: React.FC<{ phase: number; style?: React.CSSProperties }> = ({ phase, style }) => (
  <div
    style={{
      position: "absolute",
      background: `linear-gradient(100deg, #f4c4ff ${-40 + phase * 100}%, #9fe8ff ${-10 + phase * 100}%, #c6ffb8 ${20 + phase * 100}%, #fff2a8 ${45 + phase * 100}%, #ffc2d6 ${75 + phase * 100}%, #b7c4ff ${110 + phase * 100}%)`,
      mixBlendMode: "hard-light",
      opacity: 0.85,
      ...style,
    }}
  />
);
