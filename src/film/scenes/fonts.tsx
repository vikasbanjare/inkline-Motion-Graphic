import { loadFont } from "@remotion/fonts";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Cam, Detail, RefDepth, World } from "../core/three.tsx";
import type { Pal } from "../core/engrave.ts";
import { Paper } from "../../ensemble/layers.tsx";
import { Field } from "../../ensemble/paint2d.tsx";
import { LookCtx } from "../../ensemble/look.ts";
import { circle, polyD } from "../../ensemble/paths.ts";
import { Rig } from "./rig.tsx";

/** v6 look gate: one scene in the reference's language (engraved real subjects, duotones, serif headline). */
export const LOOK_FRAMES = 96;

export const VIOLET: Pal = [["#2a1670", 0], ["#6247c9", 0.42], ["#b3a0ee", 0.8], ["#ece6fb", 1]];
export const GREEN: Pal = [["#2b4512", 0], ["#6c8b2b", 0.42], ["#c3d596", 0.8], ["#eef3dc", 1]];

const M = "models/";

export const useFilmFonts = () => {
  const [h] = useState(() => delayRender("v6 fonts"));
  useEffect(() => {
    Promise.all([
      loadFont({ family: "Newsreader", url: staticFile("fonts/Newsreader-opsz.woff2"), weight: "200 800" }),
      loadFont({ family: "Lexend", url: staticFile("fonts/Lexend-500.woff2"), weight: "500" }),
    ])
      .then(() => continueRender(h))
      .catch(() => continueRender(h));
  }, [h]);
};

export const Headline: React.FC<{ text: string; sub?: string; grad: [string, string, string]; t: number; sub2?: string }> = ({ text, sub, grad, t }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 92 }}>
    <div
      style={{
        fontFamily: "Newsreader",
        fontWeight: 600,
        fontSize: 96,
        letterSpacing: -2,
        lineHeight: 1,
        background: `linear-gradient(90deg, ${grad[0]}, ${grad[1]} 50%, ${grad[2]})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        opacity: t,
        transform: `translateY(${(1 - t) * 18}px)`,
      }}
    >
      {text}
    </div>
    {sub ? <div style={{ fontFamily: "Lexend", fontSize: 30, color: grad[0], marginTop: 16, opacity: t }}>{sub}</div> : null}
  </AbsoluteFill>
);

const base = { periodFrac: 0.0052, angleDeg: 12, wobble: 0.55, toneGamma: 1.15, hatch: 0.5, hatchT: 0.38, stipple: 0.4, follow: 0.35, detail: 0.2, edge: 0.9 };

export const LookTest: React.FC = () => {
  useFilmFonts();
  const f = useCurrentFrame();
  const t = f / 24;
  return (
    <LookCtx.Provider value={{ paper: "#e3ead0", ink: "#6f6f72", inkSoft: "#9a9a9c", washes: ["#e3ead0"], accent: "#6247c9", weight: 2.2, grain: 0.3, seed: 5 }}>
      <AbsoluteFill>
        <Paper color="#e3ead0" grain={0.35} />
        {/* the opening's wave field survives as a pale disc behind the subject */}
        <Field f={f} pitch={12} lambda={150} amp={4} speed={1.5} width={1.2} color="#b9bdae" opacity={0.85} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <path d={polyD(circle(1500, 520, 700, 120), true)} fill="#d3e0a8" />
        </svg>
        <World aa>
          <Cam pos={[0.2, 1.25, 6.2]} target={[0.2, 1.0, 0]} fov={34} />
          <RefDepth.Provider value={6}>
            <Detail.Provider value={base}>

                {/* back layer: a hedge of leaves and flowers, small and pale (atmos lifts it toward the paper) */}
                {[-5.5, -3.2, -1.0, 1.4, 3.6, 5.8].map((x, i) => (
                  <Rig key={`b${i}`} url={M + "DiffuseTransmissionPlant.glb"} size={3.2} pos={[x, -0.2, -3.2 - (i % 2)]} rot={[0, i * 1.3, 0]} keep={(n) => n === "leaves"} m={{ palette: GREEN, follow: 0, wobble: 0.7, atmos: 0.35, seed: 10 + i }} />
                ))}
                {[-4.4, -2.0, 2.2, 4.6].map((x, i) => (
                  <Rig key={`f${i}`} url={M + "GlassVaseFlowers.glb"} size={2.4} pos={[x, -0.1, -1.6]} rot={[0, i * 1.7, 0]} keep={(n) => n === "Flowers"} m={{ palette: VIOLET, atmos: 0.2, seed: 20 + i }} />
                ))}
                {/* the subject */}
                <Rig url={M + "Fox.glb"} size={2.4} pos={[-0.6 + t * 0.35, 0, -0.2]} rot={[0, Math.PI / 2 - 0.25, 0]} clip="Walk" time={t} m={{ palette: VIOLET, foil: 0.35 }} foilPhase={t * 0.15} />
                {/* foreground: big leaves and flowers cropping the frame edges */}
                <Rig url={M + "DiffuseTransmissionPlant.glb"} size={4.4} pos={[-3.0, -0.6, 1.4]} rot={[0, 0.6, 0]} keep={(n) => n === "leaves"} m={{ palette: GREEN, follow: 0, wobble: 0.7, seed: 31 }} />
                <Rig url={M + "GlassVaseFlowers.glb"} size={2.8} pos={[2.6, -0.3, 1.0]} rot={[0, -0.4, 0]} keep={(n) => n === "Flowers"} m={{ palette: VIOLET, seed: 32 }} />
                <Rig url={M + "DiffuseTransmissionPlant.glb"} size={3.8} pos={[3.8, -0.9, 2.2]} rot={[0, 2.2, 0]} keep={(n) => n === "leaves"} m={{ palette: GREEN, follow: 0, wobble: 0.7, seed: 33 }} />
                <Rig url={M + "GlassVaseFlowers.glb"} size={2.2} pos={[-1.6, -0.9, 2.6]} rot={[0, 1.1, 0]} keep={(n) => n === "Flowers"} m={{ palette: VIOLET, seed: 34 }} />
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        <Headline text="5% rewards" sub="on online shopping" grad={["#3b23a0", "#6a4fd0", "#2f7a4a"]} t={Math.min(1, f / 12)} />
      </AbsoluteFill>
    </LookCtx.Provider>
  );
};
