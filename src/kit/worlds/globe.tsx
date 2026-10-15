import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Globe } from "../../ensemble/globe-type.tsx";
import { polyD, type Pt } from "../../ensemble/paths.ts";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { castOf } from "../cast.ts";
import { Backdrop, Cast, Figure, H, SayIt, W, WorldLook, easeInOut, lerp, step, type V3, type WorldProps } from "../common.tsx";

/**
 * GLOBE: a turning engraved globe with routes drawing between a home city and the places in `p.to`; a building
 * rises on the left and the cast passes in front. Best for: reach, travel, sourcing, delivery, a network, worldwide.
 *   p.home    [lon, lat] of home (the brand's city)
 *   p.to      up to 5 [lon, lat] places
 *   p.inbound true: routes run from the places TO home (sourcing, imports); default out from home
 *   p.mark    "plane" | "ship" | "dot": what rides each route
 *   p.building "tower" (default) | "none"
 *   cast      up to 3: walkers run, vehicles drive, "figure" walks, objects stand left of centre
 * Exit by "match": the globe glides to the centre and grows, so the next world opens out of it.
 */
const hotelTex = (() => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ece8f4";
  x.fillRect(0, 0, 512, 1024);
  for (let r = 0; r < 14; r++)
    for (let k = 0; k < 6; k++) {
      x.fillStyle = (r * 7 + k * 3) % 5 === 0 ? "#cfc6e6" : "#2a2a52";
      x.fillRect(40 + k * 74, 60 + r * 62, 42, 40);
    }
  x.fillStyle = "#3a3a66";
  for (let r = 0; r < 15; r++) x.fillRect(0, 48 + r * 62, 512, 4);
  x.fillRect(0, 930, 512, 94);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();
const towerG = new THREE.BoxGeometry(2.4, 5.4, 1.8);
const wingG = new THREE.BoxGeometry(1.5, 3.4, 1.5);
const crownG = new THREE.BoxGeometry(1.5, 0.7, 1.2);
const spireG = new THREE.CylinderGeometry(0.05, 0.22, 1.2, 12);

const Tower: React.FC<{ pos: V3; rise: number; th: WorldProps["th"] }> = ({ pos, rise, th }) => {
  const m = { palette: th.a, seed: 44, angleDeg: 4, map: hotelTex, mapAmt: 0.9 } as never;
  return (
    <group position={pos} scale={[1, Math.max(0.001, rise), 1]}>
      <EMesh g={towerG} m={m} pos={[0, 2.7, 0]} />
      <EMesh g={wingG} m={m} pos={[-1.95, 1.7, 0.1]} />
      <EMesh g={wingG} m={m} pos={[1.95, 1.7, 0.1]} />
      <EMesh g={crownG} m={{ palette: th.a, seed: 45, angleDeg: 4 }} pos={[0, 5.75, 0]} />
      <EMesh g={spireG} m={{ palette: th.hero, seed: 46, foil: 0.6 }} pos={[0, 6.7, 0]} />
    </group>
  );
};

const arc = (a: [number, number], b: [number, number], lon0: number, lat0: number, R: number, cx: number, cy: number): Pt[] => {
  const r = Math.PI / 180;
  const v = ([lo, la]: [number, number]) => [Math.cos(la * r) * Math.cos(lo * r), Math.cos(la * r) * Math.sin(lo * r), Math.sin(la * r)];
  const A = v(a), B = v(b);
  const om = Math.max(1e-4, Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const out: Pt[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const s0 = Math.sin((1 - t) * om) / Math.sin(om), s1 = Math.sin(t * om) / Math.sin(om);
    const p = [A[0] * s0 + B[0] * s1, A[1] * s0 + B[1] * s1, A[2] * s0 + B[2] * s1];
    const lift = 1 + 0.22 * Math.sin(Math.PI * t);
    const lon = Math.atan2(p[1], p[0]) / r, lat = Math.asin(p[2]) / r;
    const l = (lon - lon0) * r, ph = lat * r, p0 = lat0 * r;
    const x = Math.cos(ph) * Math.sin(l), y = -(Math.cos(p0) * Math.sin(ph) - Math.sin(p0) * Math.cos(ph) * Math.cos(l));
    out.push([cx + x * R * lift, cy + y * R * lift]);
  }
  return out;
};
const PLANE = "M0,-14 L3,-4 L14,2 L14,5 L3,2 L2,10 L6,13 L6,15 L0,13 L-6,15 L-6,13 L-2,10 L-3,2 L-14,5 L-14,2 L-3,-4 Z";
const SHIP = "M-4,-14 L4,-14 L5,8 L0,15 L-5,8 Z M-2,-10 L2,-10 L2,-2 L-2,-2 Z";

const Routes: React.FC<{ f: number; home: [number, number]; to: [number, number][]; inbound: boolean; mark: string; cx: number; cy: number; R: number; lon: number; lat: number; ink: string; light: string }> = ({ f, home, to, inbound, mark, cx, cy, R, lon, lat, ink, light }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    {to.map((p, i) => {
      const pts = inbound ? arc(p, home, lon, lat, R, cx, cy) : arc(home, p, lon, lat, R, cx, cy);
      const k = Math.min(1, Math.max(0, (f - (24 + i * 12)) / 30));
      const e = 1 - Math.pow(1 - k, 2);
      if (e <= 0) return null;
      const n = Math.max(2, Math.round(e * (pts.length - 1)));
      const seg = pts.slice(0, n + 1);
      const [px, py] = seg[seg.length - 1];
      const [qx, qy] = seg[Math.max(0, seg.length - 2)];
      const ang = (Math.atan2(py - qy, px - qx) * 180) / Math.PI + 90;
      return (
        <g key={i}>
          <path d={polyD(seg)} fill="none" stroke={ink} strokeWidth={2.4} strokeDasharray="2 9" strokeLinecap="round" opacity={0.85} />
          <circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill={ink} />
          {k < 1 && mark !== "dot" ? (
            <g transform={`translate(${px},${py}) rotate(${ang}) scale(1.5)`}>
              <path d={mark === "ship" ? SHIP : PLANE} fill={ink} stroke={light} strokeWidth={0.8} fillRule="evenodd" />
            </g>
          ) : (
            <circle cx={px} cy={py} r={5} fill={light} stroke={ink} strokeWidth={2} />
          )}
        </g>
      );
    })}
  </svg>
);

export const GlobeWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const t = f / 24;
  const dur = shot.dur;
  const p = shot.p ?? {};
  const home = (p.home as [number, number]) ?? [0, 20];
  const to = ((p.to as [number, number][]) ?? []).slice(0, 5);
  const cutAt = Math.round(dur * 0.56);
  const cut = step(f, [cutAt]);
  const cam = cut === 0
    ? { pos: [-0.8 + f * 0.018, 1.35, 8.4] as V3, target: [0.2, 1.45, -2] as V3, fov: 36 }
    : { pos: [-0.2 + (f - cutAt) * 0.018, 1.2, 7.2] as V3, target: [0.4, 1.65, -2] as V3, fov: 34 };
  const matchOut = shot.exit === "match";
  const lon = home[0] - 32 + 22 * ramp(f, 0, dur - 30) + 0.9 * Math.max(0, f - (dur - 30));
  const lat = Math.max(-30, Math.min(40, home[1]));
  const G = { cx: W * 0.7, cy: H * 0.6, R: 340 };
  const d = matchOut ? 0.85 * easeInOut(ramp(f, dur - 30, dur)) + 0.15 * ramp(f, dur - 30, dur) : 0;
  const settle = ramp(f, 0, 64);
  const mag = 1.16 - 0.12 * (1 - (1 - settle) ** 2) + 0.05 * ramp(f, 0, dur - 30);
  const S = lerp(mag, 450 / 340, d) + (matchOut ? 0.03 * Math.max(0, f - dur) : 0);
  const cast = shot.cast ?? [];
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <AbsoluteFill style={{ transformOrigin: `${G.cx}px ${G.cy}px`, transform: `translate(${(W / 2 - G.cx) * d}px, ${(H / 2 - G.cy) * d}px) scale(${S})` }}>
          <Backdrop f={f} th={th} speed={1} lambda={180} />
          <Globe cx={G.cx} cy={G.cy} r={G.R} lon={lon} lat={lat} draw={expoOut(ramp(f, -12, 24))} land={th.disc} graticule={0.45} />
          <Routes f={f} home={home} to={to} inbound={!!p.inbound} mark={(p.mark as string) ?? "plane"} cx={G.cx} cy={G.cy} R={G.R} lon={lon} lat={lat} ink={th.a[0][0]} light={th.a[3][0]} />
          <World aa>
            <Cam {...cam} />
            <RefDepth.Provider value={8}>
              <Detail.Provider value={ENGRAVE}>
                {p.building === "none" ? null : <Tower pos={[-3.6, 0, -3.2]} rise={expoOut(ramp(f, 20, 46))} th={th} />}
                {cast.slice(0, 3).map((id, i) => {
                  if (id === "figure") return <Figure key={i} pal={th.hero} phase={f / 26} pos={[-5.0 + f * 0.045, 0, -0.4 + i * 0.3]} rot={[0, Math.PI / 2 - 0.15, 0]} scale={1.0} seed={60 + i} />;
                  const c = castOf(id);
                  if (c.kind === "walker") return <Cast key={i} id={id} size={1.8} pos={[-5.2 + f * 0.07, 0, -0.4]} rot={[0, Math.PI / 2 - 0.15, 0]} clip="Run" time={t} pal={th.hero} foilPhase={t * 0.2} seed={60 + i} />;
                  if (c.kind === "vehicle") return <Cast key={i} id={id} pos={[-7 + Math.min(f, 70) * 0.075, 0, -1.0]} rot={[0, Math.PI / 2, 0]} pal={th.b} seed={60 + i} />;
                  if (c.kind === "flora") return <Cast key={i} id={id} pos={[-4.6, -0.8, 2.0]} rot={[0, 1, 0]} pal={th.a} seed={60 + i} />;
                  return <Cast key={i} id={id} size={castOf(id).size * 0.7} pos={[-2.6 + i * 0.6, -0.2, -0.6]} rot={[0, -2.4 + t * 0.1, 0]} pal={th.hero} foilPhase={t * 0.1} seed={60 + i} />;
                })}
              </Detail.Provider>
            </RefDepth.Provider>
          </World>
        </AbsoluteFill>
        {print ? null : <SayIt say={shot.text} f={f} at={42} out={matchOut ? dur - 18 : dur + shot.tail} th={th} top={130} size={78} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
