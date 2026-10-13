import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { Backdrop, H, SayIt, W, WorldLook, lerp, smooth, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { blob, extrude, leaf, rnd, type P2 } from "../../build/geo.ts";

/**
 * Velmora 2: coffee hills at first light. Layered ridges recede into mist (each farther ridge lighter), terraced
 * rows of coffee shrubs climb the nearest slope, the sun rises behind; the camera cranes down onto one shrub.
 */
const ridge = (seed: number, w: number, base: number, amp: number) => {
  const pts: P2[] = [[-w / 2, -6]];
  for (let i = 0; i <= 80; i++) {
    const x = -w / 2 + (i / 80) * w;
    const y = base + amp * (0.55 * Math.sin(x * 0.18 + seed) + 0.3 * Math.sin(x * 0.47 + seed * 2.1) + 0.15 * Math.sin(x * 1.3 + seed * 0.7));
    pts.push([x, y]);
  }
  pts.push([w / 2, -6]);
  return extrude(pts, 0.4, 0.05);
};
const RIDGES = [
  { z: -34, g: ridge(1.3, 120, 6.5, 3.2), pal: 3, atmos: 0.85 },
  { z: -24, g: ridge(2.7, 100, 4.2, 2.6), pal: 2, atmos: 0.65 },
  { z: -15, g: ridge(4.1, 80, 2.4, 2.0), pal: 1, atmos: 0.45 },
  { z: -8, g: ridge(5.9, 60, 0.6, 1.4), pal: 0, atmos: 0.2 },
];
const shrubG = blob(1, 0.8, 1, 0.12, 3, 24);
const leafG = leaf(0.62, 0.26, 0.35, 0.05, 0.25, 12);
const LEAVES = Array.from({ length: 16 }, (_, k) => ({ a: k * 2.39996, y: 0.25 + 0.9 * ((k * 0.618) % 1), r: 0.35 + 0.25 * ((k * 0.37) % 1) }));
const cherryG = new THREE.SphereGeometry(0.06, 10, 8);
const groundG = new THREE.PlaneGeometry(80, 40, 40, 20);
(() => {
  const p = groundG.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, 0.6 * Math.sin(x * 0.15) + 0.4 * Math.sin(y * 0.3 + 1) + Math.max(0, -y - 4) * 0.35);
  }
  groundG.computeVertexNormals();
})();

export const Hills: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const crane = smooth(ramp(f, 4, dur + shot.tail));
  const cam = { pos: [lerp(-1.5, 0.6, crane), lerp(5.5, 1.4, crane), lerp(13, 5.2, crane)] as V3, target: [lerp(0, 0.8, crane), lerp(2.6, 0.6, crane), lerp(-10, 0, crane)] as V3, fov: 38 };
  const sunY = lerp(H * 0.62, H * 0.38, ramp(f, 0, dur));
  // terraces: rows of shrubs following the slope, nearest rows biggest
  const shrubs = useMemo(() => {
    const out: { p: V3; s: number; seed: number }[] = [];
    for (let r = 0; r < 7; r++)
      for (let k = 0; k < 14; k++) {
        const x = -9 + k * 1.4 + (r % 2) * 0.7 + (rnd(r * 14 + k, 1) - 0.5) * 0.3;
        const z = -6 + r * 1.3;
        out.push({ p: [x, 0.2 + Math.max(0, -z - 2) * 0.12, z], s: 0.7 + 0.25 * rnd(r * 14 + k, 2), seed: r * 14 + k });
      }
    return out;
  }, []);
  const PALSET = [th.a, PALS.moss, PALS.sea, PALS.slate];
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.6} lambda={200} />
        {/* the sun rising behind the ridges, and a dawn wash */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="dawn" cx="50%" cy={`${(sunY / H) * 100}%`} r="60%">
              <stop offset="0" stopColor="#f6c9a0" stopOpacity="0.85" />
              <stop offset="0.4" stopColor="#f0d9c0" stopOpacity="0.35" />
              <stop offset="1" stopColor="#f0d9c0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#dawn)" />
          <circle cx={W * 0.62} cy={sunY} r={70} fill="#f3b27e" opacity={0.85} />
        </svg>
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={12}>
            <Detail.Provider value={ENGRAVE}>
              {RIDGES.map((r, i) => (
                <EMesh key={i} g={r.g} m={{ palette: PALSET[r.pal], seed: 300 + i, atmos: r.atmos, angleDeg: 6 } as never} pos={[0, 0, r.z]} />
              ))}
              <EMesh g={groundG} m={{ palette: th.a, seed: 310, angleDeg: 4, follow: 0.4 }} rot={[-Math.PI / 2, 0, 0]} pos={[0, 0, -2]} />
              {shrubs.map((s, i) => (
                <group key={i} position={s.p} scale={s.s}>
                  <EMesh g={shrubG} m={{ palette: PALS.moss, seed: 320 + (i % 11), follow: 0.2, wobble: 0.7, dim: 0.55 } as never} pos={[0, 0.55, 0]} scale={[0.6, 0.9, 0.6]} />
                  {LEAVES.map((l, k) => (
                    <EMesh key={k} g={leafG} m={{ palette: th.a, seed: 340 + (k % 6), follow: 0.6 }} pos={[Math.cos(l.a + i) * l.r, l.y, Math.sin(l.a + i) * l.r]} rot={[0.9 - l.y * 0.5, l.a + i + Math.PI / 2, 0.3]} double />
                  ))}
                  {i % 3 === 0
                    ? [0, 1, 2].map((k) => <EMesh key={`c${k}`} g={cherryG} m={{ palette: PALS.cherry, seed: 360 + k, foil: 0.1 }} pos={[Math.cos(k * 2 + i) * 0.45, 0.6 + 0.1 * k, Math.sin(k * 2 + i) * 0.45 + 0.1]} />)
                    : null}
                </group>
              ))}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {/* mist bands drifting across the valleys */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {[0.42, 0.55, 0.66].map((y, i) => (
            <rect key={i} x={-200 + ((t * (14 + i * 6)) % 200)} y={H * y - 40} width={W + 400} height={90} fill={th.paper} opacity={0.35 - i * 0.08} style={{ filter: "blur(18px)" }} />
          ))}
        </svg>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.35)} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
