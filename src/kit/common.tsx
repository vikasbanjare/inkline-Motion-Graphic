import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Paper } from "../ensemble/layers.tsx";
import { Field } from "../ensemble/paint2d.tsx";
import { LookCtx, type Look } from "../ensemble/look.ts";
import { expoOut, ramp } from "../ensemble/score.ts";
import { EMesh } from "../film/core/three.tsx";
import type { EOpts, Pal } from "../film/core/engrave.ts";
import { Headline, Holo } from "../film/scenes/kit.tsx";
import { Rig } from "../film/scenes/rig.tsx";
import { fit } from "../film/scenes/copy.tsx";
import { castOf, keepFn } from "./cast.ts";
import type { Theme } from "./theme.ts";
import type { Placed, Say, Value } from "./plan.ts";

export const W = 1920, H = 1080;
export type V3 = [number, number, number];
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** scale-step framing index: how many cut frames have passed */
export const step = (f: number, cuts: number[]) => cuts.filter((c) => f >= c).length;

/** What every world receives. f is the shot's local frame (0 = the shot starts entering); f runs to dur + tail. */
export type WorldProps = { f: number; shot: Placed; th: Theme; print?: boolean };

export const look = (th: Theme): Look => ({ paper: th.paper, ink: th.a[1][0], inkSoft: th.field, washes: [th.paper], accent: th.hero[1][0], weight: 2.2, grain: 0.32, seed: 5 });

/** Paper + the flowing line field, in the theme's ink: every world's ground. */
export const Backdrop: React.FC<{ f: number; th: Theme; speed?: number; lambda?: number }> = ({ f, th, speed = 1.5, lambda = 150 }) => (
  <>
    <Paper color={th.paper} grain={0.35} />
    <Field f={f} pitch={12} lambda={lambda} amp={4} speed={speed} width={1.2} color={th.field} opacity={0.85} />
  </>
);

export const WorldLook: React.FC<{ th: Theme; children: React.ReactNode }> = ({ th, children }) => <LookCtx.Provider value={look(th)}>{children}</LookCtx.Provider>;

/** The headline, top centre, arriving at `at` and leaving before `out` (frames, local). */
export const SayIt: React.FC<{ say?: Say; f: number; at: number; out?: number; th: Theme; top?: number; size?: number; plate?: boolean }> = ({ say, f, at, out, th, top = 96, size = 88, plate }) => {
  if (!say || f < at) return null;
  const t = expoOut(ramp(f, at, at + 14));
  const o = out === undefined ? 1 : 1 - ramp(f, out - 10, out);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {plate ? <AbsoluteFill style={{ background: `radial-gradient(ellipse 34% 16% at 50% ${(top + 60) / 10.8}%, ${th.paper}f2, ${th.paper}d0 55%, ${th.paper}00 100%)`, opacity: t }} /> : null}
      <Headline text={say.head} sub={say.sub} grad={th.grad} t={t} size={fit(say.head, size, 1500)} top={top} />
    </AbsoluteFill>
  );
};

/** A big value that rises like a pearl (foil gradient as SVG text: background-clip text breaks under transforms). */
export const Rise: React.FC<{ v?: Value; f: number; at: number; out?: number; ink?: string; id: string; y?: number }> = ({ v, f, at, out, ink = "#3a4452", id, y: y0 = 160 }) => {
  if (!v || f < at) return null;
  const vsize = fit(v.value, 280, 1300, 0.55);
  const k = expoOut(ramp(f, at, at + 22));
  const lab = expoOut(ramp(f, at + 8, at + 22));
  const o = out === undefined ? 1 : 1 - ramp(f, out - 10, out);
  const ph = (f - at) / 50;
  const sc = 0.7 + 0.3 * k;
  const y = y0 + 220 * (1 - k);
  const stops: [string, number][] = [["#8f7cff", -0.3], ["#6fd6ea", 0], ["#b4f2c2", 0.25], ["#ffeea0", 0.5], ["#ffb2d4", 0.75], ["#8f7cff", 1.05]];
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none", opacity: o }}>
      <div style={{ position: "absolute", top: y0 - 48, fontFamily: "Lexend", fontWeight: 500, fontSize: 26, letterSpacing: 26 * 0.42, color: ink, opacity: lab, paddingLeft: 26 * 0.42 }}>{v.label}</div>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="0.36" gradientTransform={`translate(${(ph % 1) - 0.5} 0)`} spreadMethod="repeat">
            {stops.map(([c, o2], i) => (
              <stop key={i} offset={Math.min(1, Math.max(0, (o2 + 0.3) / 1.35))} stopColor={c} />
            ))}
          </linearGradient>
          <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={12} />
          </filter>
        </defs>
        <g transform={`translate(${W / 2} ${y + 230}) scale(${sc})`} opacity={Math.min(1, k * 1.4)}>
          <text x={0} y={14} textAnchor="middle" fontFamily="Newsreader" fontWeight={700} fontSize={vsize} letterSpacing={-10} fill="rgba(30,40,60,0.18)" filter={`url(#${id}-soft)`}>{v.value}</text>
          <text x={0} y={0} textAnchor="middle" fontFamily="Newsreader" fontWeight={700} fontSize={vsize} letterSpacing={-10} fill={`url(#${id}-foil)`} stroke="rgba(70,60,140,0.35)" strokeWidth={1.5}>{v.value}</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** The holographic flood (the dive's colour field). */
export const Flood: React.FC<{ f: number; o: number }> = ({ f, o }) =>
  o <= 0 ? null : (
    <AbsoluteFill style={{ opacity: o }}>
      <Holo phase={0.35 + 0.4 * Math.sin(f / 14)} style={{ inset: 0, mixBlendMode: "normal", opacity: 1 }} />
    </AbsoluteFill>
  );

/** One cast member through the engraving. */
export const Cast: React.FC<{ id: string; pal: Pal; size?: number; pos?: V3; rot?: V3; clip?: string; time?: number; foil?: number; foilPhase?: number; seed?: number; m?: Partial<EOpts> }> = ({ id, pal, size, pos, rot, clip, time, foil, foilPhase, seed = 1, m }) => {
  const c = castOf(id);
  const flora = c.kind === "flora";
  return (
    <Rig
      url={"models/" + c.url}
      size={size ?? c.size}
      pos={pos}
      rot={rot}
      keep={c.keep || c.drop ? keepFn(c) : undefined}
      clip={clip}
      time={time}
      foilPhase={foilPhase}
      m={{ palette: pal, seed, foil: foil ?? c.foil ?? 0, ...(flora ? { follow: 0, wobble: 0.7 } : {}), ...m }}
    />
  );
};

/** Growth 0..1 with a breath of overshoot. */
export const grow = (f: number, at: number, len = 22) => {
  const u = clamp01((f - at) / len);
  return u * u * (3 - 2 * u) * (1 + 0.04 * Math.sin(u * Math.PI));
};
/** A plant (or tower) that grows up from its own base: height first, then width, unfurling from a lean. */
export const Sprout: React.FC<{ at: V3; g: number; lean?: number; children: React.ReactNode }> = ({ at, g, lean = 0, children }) =>
  g <= 0.001 ? null : (
    <group position={at} rotation={[0, 0, 0.45 * lean * (1 - g)]} scale={[0.35 + 0.65 * g, g, 0.35 + 0.65 * g]}>
      {children}
    </group>
  );

// ---- procedural subjects (no licensed model exists for these) ----------------------------------------------------
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 16);
const FIG = (() => {
  const torso = new THREE.CapsuleGeometry(0.26, 0.55, 6, 18);
  torso.scale(1, 1, 0.72);
  const coat = new THREE.CylinderGeometry(0.3, 0.42, 0.75, 24, 1, true);
  return {
    head: new THREE.SphereGeometry(0.17, 24, 18),
    neck: new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12),
    torso,
    coat,
    upper: capsule(0.075, 0.32),
    lower: capsule(0.065, 0.3),
    thigh: capsule(0.1, 0.36),
    shin: capsule(0.085, 0.36),
    foot: new THREE.BoxGeometry(0.12, 0.07, 0.26),
    joint: new THREE.SphereGeometry(0.08, 14, 10),
  };
})();
/**
 * A walking figure in the manner of an artist's wooden mannequin (procedural: no licensed walking human exists in
 * the cast). phase advances one stride per 1.0; `walk` 0 = standing, 1 = full stride. ~1.8 units tall, feet at y=0.
 */
export const Figure: React.FC<{ pal: Pal; phase: number; walk?: number; pos?: V3; rot?: V3; scale?: number; seed?: number; coat?: boolean; hold?: boolean }> = ({ pal, phase, walk = 1, pos, rot, scale = 1, seed = 70, coat = true, hold }) => {
  const m = { palette: pal, seed, follow: 0.4, angleDeg: 8 } as EOpts;
  const a = Math.PI * 2 * phase;
  const sw = 0.5 * walk;
  const hipL = Math.sin(a) * sw, hipR = -Math.sin(a) * sw;
  const kneeL = Math.max(0, -Math.cos(a)) * 0.9 * walk + 0.05, kneeR = Math.max(0, Math.cos(a)) * 0.9 * walk + 0.05;
  const bob = Math.abs(Math.cos(a)) * 0.04 * walk;
  const leg = (hip: number, knee: number, x: number) => (
    <group position={[x, 0.98, 0]} rotation={[-hip, 0, 0]}>
      <EMesh g={FIG.thigh} m={m} pos={[0, -0.24, 0]} />
      <group position={[0, -0.47, 0]} rotation={[knee, 0, 0]}>
        <EMesh g={FIG.joint} m={m} scale={0.9} />
        <EMesh g={FIG.shin} m={m} pos={[0, -0.24, 0]} />
        <EMesh g={FIG.foot} m={m} pos={[0, -0.47, 0.06]} />
      </group>
    </group>
  );
  const arm = (sw2: number, x: number, bend: number) => (
    <group position={[x, 1.5, 0]} rotation={[sw2, 0, x > 0 ? -0.08 : 0.08]}>
      <EMesh g={FIG.joint} m={m} scale={0.85} />
      <EMesh g={FIG.upper} m={m} pos={[0, -0.22, 0]} />
      <group position={[0, -0.44, 0]} rotation={[-bend, 0, 0]}>
        <EMesh g={FIG.lower} m={m} pos={[0, -0.2, 0]} />
      </group>
    </group>
  );
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <group position={[0, bob, 0]}>
        {leg(hipL, kneeL, -0.11)}
        {leg(hipR, kneeR, 0.11)}
        <EMesh g={FIG.torso} m={m} pos={[0, 1.3, 0]} />
        {coat ? <EMesh g={FIG.coat} m={{ ...m, seed: seed + 1 }} pos={[0, 1.02, 0]} double /> : null}
        <EMesh g={FIG.neck} m={m} pos={[0, 1.7, 0]} />
        <EMesh g={FIG.head} m={m} pos={[0, 1.86, 0.01]} />
        {arm(hold ? -0.9 : -hipL * 0.8, -0.3, hold ? 1.2 : 0.25 + 0.2 * walk)}
        {arm(hold ? -0.2 : -hipR * 0.8, 0.3, 0.25 + 0.2 * walk)}
      </group>
    </group>
  );
};

/** A coffee bean: a squashed ellipsoid with a centre crease (procedural). */
export const BEAN = (() => {
  const g = new THREE.SphereGeometry(0.5, 28, 20);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const crease = z > 0 ? 1 - 0.35 * Math.exp(-(x * x) / 0.004) : 1;
    p.setXYZ(i, x * 0.72, y * 1.0, z * 0.5 * crease);
  }
  g.computeVertexNormals();
  return g;
})();
/** A cherry (the fruit the bean grows in). */
export const CHERRY = new THREE.SphereGeometry(0.5, 24, 18);

/** Beans: n beans with deterministic positions from `place(i)`; returns engraved meshes. */
export const Beans: React.FC<{ n: number; pal: Pal; place: (i: number) => { pos: V3; rot: V3; s: number } | null; seed?: number }> = ({ n, pal, place, seed = 200 }) => {
  const m = useMemo(() => ({ palette: pal, seed, angleDeg: 20, follow: 0.6 }) as EOpts, [pal, seed]);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const q = place(i);
        return q ? <EMesh key={i} g={BEAN} m={m} pos={q.pos} rot={q.rot} scale={q.s} /> : null;
      })}
    </>
  );
};

/** Steam: soft rising curls (SVG strokes) above a screen point. */
export const Steam: React.FC<{ f: number; x: number; y: number; h?: number; color?: string; o?: number }> = ({ f, x, y, h = 260, color = "#ffffff", o = 1 }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o, pointerEvents: "none" }}>
    <defs>
      <linearGradient id={`steam-${Math.round(x)}`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={color} stopOpacity="0" />
        <stop offset="0.3" stopColor={color} stopOpacity="0.75" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    {[0, 1, 2].map((k) => {
      const pts = Array.from({ length: 40 }, (_, i) => {
        const t = i / 39;
        const yy = y - t * h;
        const xx = x + (k - 1) * 26 + Math.sin(t * 5 + f * 0.09 + k * 2) * 22 * t + Math.sin(t * 11 - f * 0.05 + k) * 6;
        return `${i ? "L" : "M"}${xx.toFixed(1)},${yy.toFixed(1)}`;
      }).join("");
      return <path key={k} d={pts} fill="none" stroke={`url(#steam-${Math.round(x)})`} strokeWidth={9 - k * 2} strokeLinecap="round" opacity={0.55 + 0.15 * Math.sin(f * 0.07 + k)} />;
    })}
  </svg>
);
