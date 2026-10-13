import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { castOf } from "../cast.ts";
import { BEAN, Backdrop, Cast, Rise, SayIt, Sprout, WorldLook, grow, step, type V3, type WorldProps } from "../common.tsx";

/**
 * ORBIT: a hero on a pedestal at the centre of three tilted engraved rings; small bodies ride the rings.
 * Best for: a process that turns (roasting, an engine, AI, a system), a platform at the centre of things, tech,
 * security, a community around a product, "everything in one place".
 *   cast[0]    the hero on the pedestal (any object)
 *   p.bodies   "spheres" (default) | "beans" | a cast id: what rides the rings
 *   p.count    bodies per ring (default 6)
 *   p.spin     ring speed multiplier (default 1); fast for energy (a roast), slow for calm
 * Camera: a slow orbit; one scale-step closer at 60 %.
 */
const ringG = new THREE.TorusGeometry(1, 0.022, 10, 160);
const bodyG = new THREE.SphereGeometry(0.16, 20, 14);
const pedestalG = new THREE.CylinderGeometry(1.1, 1.3, 0.9, 48);
const discG = new THREE.CircleGeometry(7, 96);
const sunTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e9e5de";
  x.fillRect(0, 0, 1024, 1024);
  x.translate(512, 512);
  for (let r = 60; r < 520; r += 26) {
    x.strokeStyle = "rgba(70,70,80,0.45)";
    x.lineWidth = r % 78 === 0 ? 3 : 1.5;
    x.beginPath();
    x.arc(0, 0, r, 0, Math.PI * 2);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();

const RINGS = [
  { r: 2.4, tilt: [1.2, 0, 0.3] as V3, y: 1.9, speed: 0.9 },
  { r: 3.1, tilt: [1.45, 0, -0.5] as V3, y: 1.8, speed: -0.6 },
  { r: 3.8, tilt: [1.62, 0, 0.12] as V3, y: 1.6, speed: 0.42 },
];

export const OrbitWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const p = shot.p ?? {};
  const t = f / 24;
  const cutAt = Math.round(dur * 0.6);
  const cut = step(f, [cutAt]);
  const orb = 0.6 + f * 0.006;
  const cam = cut === 0
    ? { pos: [Math.sin(orb) * 10, 3.6 - f * 0.006, Math.cos(orb) * 10] as V3, target: [0, 1.8, 0] as V3, fov: 36 }
    : { pos: [Math.sin(orb) * 8.4, 3.0, Math.cos(orb) * 8.4] as V3, target: [0, 1.6, 0] as V3, fov: 34 };
  const hero = shot.cast?.[0] ?? "amber";
  const bodies = (p.bodies as string) ?? "spheres";
  const count = Math.max(3, Math.min(14, Number(p.count ?? 6)));
  const spin = Number(p.spin ?? 1);
  const k = expoOut(ramp(f, 4, 30));
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1.2} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={9}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={discG} m={{ palette: th.b, seed: 140, map: sunTex, mapAmt: 0.8, angleDeg: 4 } as never} rot={[-Math.PI / 2, 0, 0]} />
              <Sprout at={[0, 0, 0]} g={grow(f, 0, 18)}>
                <EMesh g={pedestalG} m={{ palette: th.a, seed: 141, angleDeg: 8 }} pos={[0, 0.45, 0]} />
              </Sprout>
              <Sprout at={[0, 0.9, 0]} g={grow(f, 10, 20)}>
                <Cast id={hero} size={Math.min(2.0, castOf(hero).size)} rot={[0, t * 0.35, 0]} pal={th.hero} foil={0.7} foilPhase={t * 0.3} seed={142} />
              </Sprout>
              {RINGS.map((rg, i) => {
                const s = rg.r * (0.4 + 0.6 * k);
                const a0 = t * rg.speed * spin;
                return (
                  <group key={i} position={[0, rg.y, 0]} rotation={rg.tilt}>
                    <EMesh g={ringG} m={{ palette: th.a, seed: 150 + i, angleDeg: 30, foil: i === 1 ? 0.4 : 0 }} scale={[s, s, s]} rot={[0, 0, a0 * 0.2]} />
                    {Array.from({ length: count }, (_, j) => {
                      const a = a0 + (j / count) * Math.PI * 2;
                      const pos: V3 = [Math.cos(a) * s, Math.sin(a) * s, 0];
                      if (bodies === "beans") return <EMesh key={j} g={BEAN} m={{ palette: th.hero, seed: 160 + j, angleDeg: 20, follow: 0.6 }} pos={pos} rot={[a * 2, a, 0]} scale={0.8 * k} />;
                      if (bodies !== "spheres") return <group key={j} position={pos} scale={k}><Cast id={bodies} size={0.6} rot={[a, a * 0.5, 0]} pal={th.hero} seed={160 + j} /></group>;
                      return <EMesh key={j} g={bodyG} m={{ palette: th.hero, seed: 160 + j, foil: j % 3 === 0 ? 0.6 : 0 }} pos={pos} scale={k} />;
                    })}
                  </group>
                );
              })}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.2)} out={dur + shot.tail} th={th} plate />}
        {print ? null : <Rise v={shot.value} f={f} at={Math.round(dur * 0.35)} out={dur + shot.tail} ink={th.a[0][0]} id={`rise${shot.index}`} />}
      </AbsoluteFill>
    </WorldLook>
  );
};
