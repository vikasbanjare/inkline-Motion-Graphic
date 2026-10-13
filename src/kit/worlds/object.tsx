import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { polyD, type Pt } from "../../ensemble/paths.ts";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Headline, Holo, Lens } from "../../film/scenes/kit.tsx";
import { fit } from "../../film/scenes/copy.tsx";
import { H, W, easeInOut, lerp, type WorldProps } from "../common.tsx";

/**
 * OBJECT: the previous world becomes the print on a flat object, which pulls back under a loupe and floats.
 * Enter it by "print" (no cut: the frame you were watching IS the print). Best for: the product reveal, a ticket or
 * an invitation, a banknote, a card, a screen; the moment the story turns into the thing you can hold.
 *   p.shape   "card" (default) | "ticket" | "note" | "screen"
 *   p.strip   [phrase, phrase2]: a foil strip with letterspaced words sliding through it (phrase <= 18 chars, CAPITALS)
 *   p.stamp   a short foil mark printed on the face ("01 · 11", "NO. 1")
 *   p.logo    false: no logo on the face (default: the brand's logo file, top-left)
 *   p.tint    a print tint colour (default: the theme's)
 * Exit by "split" and the camera pushes into the strip, turning it level, until it splits open on the next world.
 */
const SLOT = 835;
const U_FOCUS = 1027;
const FOCUS = { x: 1520, y: 570 };

const Strip: React.FC<{ w: number; h: number; phase: number; c0: number; font: number; copy: number; phrases: string[] }> = ({ w, h, phase, c0, font, copy, phrases }) => (
  <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}>
    <Holo phase={phase} style={{ inset: 0, mixBlendMode: "normal", opacity: 0.92 }} />
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, mixBlendMode: "soft-light" }}>
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={polyD(Array.from({ length: 90 }, (_, k) => [(k / 89) * w, h * ((i + 0.5) / 9) + h * 0.05 * Math.sin((k / 89) * Math.PI * 6 + i * 0.7 + phase * 6)] as Pt))} fill="none" stroke="#ffffff" strokeWidth={Math.max(1, h / 70)} opacity={0.8} />
      ))}
    </svg>
    {Array.from({ length: 7 }, (_, j) => {
      const k = j - 2;
      const c = c0 + k * SLOT;
      if (c < -1000 || c > w + 1000) return null;
      return (
        <React.Fragment key={j}>
          <div style={{ position: "absolute", left: c - 600, width: 1200, top: 0, height: h, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", fontFamily: "Lexend", fontWeight: 500, fontSize: font, letterSpacing: font * 0.28, paddingLeft: font * 0.28, color: "rgba(255,255,255,0.97)", textShadow: "0 0 3px rgba(60,40,120,0.4)", opacity: copy }}>
            {phrases[((k % 2) + 2) % 2] ?? phrases[0]}
          </div>
          <div style={{ position: "absolute", left: c + SLOT / 2 - 4, top: h / 2 - 4, width: 8, height: 8, borderRadius: 4, background: "#fff", opacity: copy * 0.9 }} />
        </React.Fragment>
      );
    })}
  </div>
);

const Decor: React.FC<{ shape: string; ink: string }> = ({ shape, ink }) => {
  if (shape === "ticket")
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <line x1={1380} y1={40} x2={1380} y2={H - 40} stroke="#f4efe6" strokeWidth={6} strokeDasharray="4 18" strokeLinecap="round" />
        <circle cx={1380} cy={0} r={70} fill="#0a0c0b" />
        <circle cx={1380} cy={H} r={70} fill="#0a0c0b" />
      </svg>
    );
  if (shape === "note")
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={36 + i * 3} y={36 + i * 3} width={W - 72 - i * 6} height={H - 72 - i * 6} rx={40} fill="none" stroke={i % 2 ? "#f4efe6" : ink} strokeWidth={1.4} opacity={0.75} />
        ))}
        {Array.from({ length: 40 }, (_, i) => (
          <ellipse key={`e${i}`} cx={W - 300} cy={H - 280} rx={170 + 4 * Math.sin(i)} ry={110} transform={`rotate(${i * 9} ${W - 300} ${H - 280})`} fill="none" stroke="#f4efe6" strokeWidth={1} opacity={0.5} />
        ))}
      </svg>
    );
  if (shape === "screen")
    return (
      <div style={{ position: "absolute", inset: 0, borderRadius: 64, boxShadow: "inset 0 0 0 44px #101012, inset 0 0 0 48px #3a3a40" }}>
        <div style={{ position: "absolute", left: W / 2 - 9, top: 14, width: 18, height: 18, borderRadius: 9, background: "#26262c" }} />
      </div>
    );
  return null;
};

const Stamp: React.FC<{ text: string; phase: number; id: string }> = ({ text, phase, id }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.3" gradientTransform={`translate(${(phase % 1) - 0.5} 0)`} spreadMethod="repeat">
        {(["#8f7cff", "#6fd6ea", "#b4f2c2", "#ffeea0", "#ffb2d4", "#8f7cff"] as const).map((c, i) => (
          <stop key={i} offset={i / 5} stopColor={c} />
        ))}
      </linearGradient>
    </defs>
    <text x={W - 130} y={H - 120} textAnchor="end" fontFamily="Newsreader" fontWeight={700} fontSize={Math.min(260, 1400 / Math.max(1, text.length * 0.6))} letterSpacing={-6} fill={`url(#${id})`} stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
      {text}
    </text>
  </svg>
);

export const ObjectWorld: React.FC<WorldProps & { printOf?: (f: number) => React.ReactNode; logo: string }> = ({ f, shot, th, printOf, logo }) => {
  const dur = shot.dur;
  const p = shot.p ?? {};
  const shape = (p.shape as string) ?? "card";
  const phrases = (p.strip as string[]) ?? [];
  const pushOut = shot.exit === "split" && phrases.length > 0;
  const M = dur - 69; // the push into the strip starts here (when leaving by split)
  const k = expoOut(ramp(f, 0, 22));
  const tt = f / 24;
  const s0 = 1 - 0.55 * k + 0.035 * tt;
  const rx0 = 38 * k + 4 * Math.sin(tt * 1.3) * k;
  const rz0 = -9 * k + 3 * tt * k;
  const ty0 = -30 * k + 8 * Math.sin(tt * 0.9) * k;
  const z = pushOut ? easeInOut(ramp(f, M - 18, dur - 10)) : 0;
  const drift = pushOut ? Math.max(0, f - (dur - 10)) * 0.012 : 0;
  const pose = { s: lerp(s0, 3.0, z) + drift, rx: lerp(rx0, 0, z), rz: lerp(rz0, -68, z), ty: lerp(ty0, 0, z), fx: lerp(W / 2, FOCUS.x, z), fy: lerp(H / 2, FOCUS.y, z) };
  // strip slide: steady, easing to a slow drift as the camera arrives, so the phrase lands whole at the split
  const slideAt = (x: number) => {
    let acc = 0;
    for (let i = 0; i < Math.max(0, Math.round(x)); i++) {
      const q = pushOut ? Math.min(1, Math.max(0, (i - (M - 20)) / (69 - 14 + 20))) : 0;
      acc += 3 - 2.1 * (q * q * (3 - 2 * q));
    }
    return acc;
  };
  const hold = pushOut ? dur - 4 : dur / 2;
  const c0 = U_FOCUS + slideAt(hold) - slideAt(f);
  const head = expoOut(ramp(f, 18, 32)) * (pushOut ? 1 - ramp(f, M - 16, M - 4) : 1);
  const copyO = pushOut ? 1 - ramp(f, dur - 2, dur + 6) : 1;
  return (
    <AbsoluteFill style={{ background: "#0a0c0b" }}>
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${W / 2}px, ${H / 2 + pose.ty}px) scale(${pose.s}) rotateX(${pose.rx}deg) rotateZ(${pose.rz}deg) translate(${-pose.fx}px, ${-pose.fy}px)` }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 64, overflow: "hidden", boxShadow: "0 0 0 10px #f2f0e8 inset" }}>
            {printOf ? printOf(f) : null}
            <AbsoluteFill style={{ background: (p.tint as string) ?? th.tint, mixBlendMode: "multiply", opacity: 0.55 * k }} />
            <Decor shape={shape} ink={th.a[0][0]} />
            {phrases.length ? (
              <div style={{ position: "absolute", left: 1180, top: -400, transform: "rotate(68deg)", transformOrigin: "0 0" }}>
                <Strip w={2200} h={96} phase={f / 70} c0={c0} font={30} copy={copyO} phrases={phrases} />
              </div>
            ) : null}
            {p.stamp ? <Stamp text={p.stamp as string} phase={f / 60} id={`stamp${shot.index}`} /> : null}
            {p.logo === false ? null : <Img src={staticFile(logo)} style={{ position: "absolute", left: 110, top: 90, height: 170, maxWidth: 560, objectFit: "contain", objectPosition: "left center", opacity: k }} />}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: pushOut ? 1 - ramp(f, dur - 24, dur - 4) : 1 }}>
        <Lens r={0.62 + 0.4 * (1 - k)} soft={0.18} />
      </AbsoluteFill>
      {head > 0 && shot.text ? <Headline text={shot.text.head} sub={shot.text.sub} grad={[th.hero[3][0], "#ffffff", th.b[3][0]]} t={head} size={fit(shot.text.head, 60, 1500)} top={70} /> : null}
    </AbsoluteFill>
  );
};
