import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, Shadow, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { castOf } from "../cast.ts";
import { Backdrop, Cast, Figure, SayIt, Sprout, WorldLook, clamp01, grow, lerp, smooth, step, type V3, type WorldProps } from "../common.tsx";

/**
 * CITY: a street of engraved buildings rising out of the ground, with a shopfront at the centre whose door opens.
 * Best for: a store or venue opening, a neighbourhood, arriving somewhere, business, real estate, delivery.
 *   p.store    true (default): a shopfront with an awning and a door at the centre
 *   p.sign     the words on the shopfront's board (the brand NAME in plain type; never a logo drawn by hand)
 *   p.enter    true: cast "figure" walks along the pavement and into the door (a customer arriving)
 *   cast       "figure" (the walker), vehicles drive past, objects stand on the pavement (a lantern as a street lamp)
 * Camera: a slow dolly toward the door; one scale-step closer at 55 %.
 */
const winTex = (lit: string, dark: string, seed: number) => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ece8e2";
  x.fillRect(0, 0, 256, 512);
  for (let r = 0; r < 12; r++)
    for (let k = 0; k < 4; k++) {
      x.fillStyle = (r * 5 + k * 3 + seed) % 4 === 0 ? lit : dark;
      x.fillRect(24 + k * 58, 24 + r * 40, 30, 26);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
};
const signTex = (text: string) => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 160;
  const x = c.getContext("2d")!;
  x.fillStyle = "#1c1a18";
  x.fillRect(0, 0, 1024, 160);
  x.fillStyle = "#f4efe6";
  const size = Math.min(96, 1800 / Math.max(1, text.length));
  x.font = `600 ${size}px Newsreader, serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, 512, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
};
const frontTex = (() => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e9e3da";
  x.fillRect(0, 0, 512, 512);
  // two big shop windows with mullions, a door between
  x.fillStyle = "#3a3632";
  x.fillRect(30, 170, 170, 260);
  x.fillRect(312, 170, 170, 260);
  x.strokeStyle = "#e9e3da";
  x.lineWidth = 6;
  for (const ox of [30, 312]) {
    x.strokeRect(ox + 3, 173, 164, 254);
    x.beginPath();
    x.moveTo(ox + 85, 170);
    x.lineTo(ox + 85, 430);
    x.moveTo(ox, 300);
    x.lineTo(ox + 170, 300);
    x.stroke();
  }
  x.fillStyle = "#cfc4b4";
  for (let i = 0; i < 9; i++) x.fillRect(0, 440 + i * 8, 512, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();
const boxG = new THREE.BoxGeometry(1, 1, 1);
const awningG = (() => {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 4.2, 32, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  return g;
})();
const groundG = new THREE.PlaneGeometry(60, 30);
const streetTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e7e2da";
  x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = "rgba(70,60,50,0.35)";
  x.lineWidth = 2;
  for (let i = 0; i < 1024; i += 32) {
    x.beginPath();
    x.moveTo(0, i);
    x.lineTo(1024, i);
    x.stroke();
  }
  for (let r = 0; r < 32; r++)
    for (let i = (r % 2) * 16; i < 1024; i += 32) {
      x.beginPath();
      x.moveTo(i, r * 32);
      x.lineTo(i, r * 32 + 32);
      x.stroke();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  return t;
})();

const BLDG = [
  { x: -9.5, z: -5.5, w: 3.2, h: 7.5, d: 3 },
  { x: -6.2, z: -4.6, w: 2.6, h: 5.2, d: 2.6 },
  { x: -3.4, z: -6.5, w: 2.8, h: 9.0, d: 3 },
  { x: 3.6, z: -6.0, w: 3.0, h: 8.2, d: 3 },
  { x: 6.4, z: -4.6, w: 2.6, h: 5.8, d: 2.6 },
  { x: 9.6, z: -5.6, w: 3.4, h: 7.0, d: 3 },
];

export const CityWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const p = shot.p ?? {};
  const t = f / 24;
  const cutAt = Math.round(dur * 0.55);
  const cut = step(f, [cutAt]);
  const cam = cut === 0
    ? { pos: [lerp(-2.2, -0.8, f / dur), 2.4 - f * 0.004, 12 - f * 0.03] as V3, target: [0, 2.4, -3] as V3, fov: 38 }
    : { pos: [lerp(1.6, 1.0, (f - cutAt) / dur), 1.7, 6.4 - (f - cutAt) * 0.02] as V3, target: [-0.2, 1.7, -3] as V3, fov: 34 };
  const wins = useMemo(() => [winTex(th.hero[2][0], th.a[0][0], 1), winTex(th.hero[2][0], th.a[0][0], 2)], [th]);
  const sign = useMemo(() => signTex((p.sign as string) ?? ""), [p.sign]);
  const store = p.store !== false;
  const doorOpen = smooth(ramp(f, dur * 0.45, dur * 0.6));
  const cast = shot.cast ?? ["figure"];
  // the customer: along the pavement, turn, in through the door
  const walkK = clamp01(f / (dur * 0.72));
  const along = smooth(clamp01(walkK / 0.62));
  const inward = smooth(clamp01((walkK - 0.6) / 0.4));
  const figPos: V3 = [lerp(-7.5, 0, along), 0, lerp(0.8, -2.8, inward)];
  const figYaw = lerp(Math.PI / 2, Math.PI, inward);
  const inside = clamp01((walkK - 0.92) / 0.08);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={9}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={groundG} m={{ palette: th.b, seed: 120, map: streetTex, mapAmt: 0.45, angleDeg: 3 } as never} rot={[-Math.PI / 2, 0, 0]} pos={[0, 0, 0]} />
              {BLDG.map((b, i) => (
                <Sprout key={i} at={[b.x, 0, b.z]} g={grow(f, -12 + Math.abs(b.x) * 1.2, 24)}>
                  <EMesh g={boxG} m={{ palette: th.a, seed: 130 + i, map: wins[i % 2], mapAmt: 0.85, angleDeg: 4 } as never} pos={[0, b.h / 2, 0]} scale={[b.w, b.h, b.d]} />
                  <EMesh g={boxG} m={{ palette: th.a, seed: 140 + i, angleDeg: 4 }} pos={[0, b.h + 0.15, 0]} scale={[b.w + 0.3, 0.3, b.d + 0.3]} />
                </Sprout>
              ))}
              {store ? (
                <Sprout at={[0, 0, -3.4]} g={grow(f, -6, 22)}>
                  <EMesh g={boxG} m={{ palette: th.hero, seed: 110, map: frontTex, mapAmt: 0.9, angleDeg: 4 } as never} pos={[0, 2.1, 0]} scale={[4.6, 4.2, 1.2]} />
                  <EMesh g={boxG} m={{ palette: th.hero, seed: 111, map: sign, mapAmt: 0.95, angleDeg: 2 } as never} pos={[0, 3.75, 0.66]} scale={[3.6, 0.56, 0.08]} />
                  <EMesh g={awningG} m={{ palette: th.b, seed: 112, angleDeg: 80, foil: 0.15 }} pos={[0, 3.25, 0.9]} scale={[1, 0.5, 1.1]} double />
                  {/* the door swings open */}
                  <group position={[-0.45, 0, 0.62]} rotation={[0, -1.6 * doorOpen, 0]}>
                    <EMesh g={boxG} m={{ palette: th.a, seed: 113, angleDeg: 6 }} pos={[0.45, 1.15, 0]} scale={[0.9, 2.3, 0.06]} />
                  </group>
                  <EMesh g={boxG} m={{ palette: th.a, seed: 114, angleDeg: 6, dim: 0.6 } as never} pos={[0, 1.15, 0.58]} scale={[0.9, 2.3, 0.02]} />
                </Sprout>
              ) : null}
              {cast.map((id, i) => {
                if (id === "figure") {
                  if (!p.enter) return <Figure key={i} pal={th.hero} phase={f / 24} pos={[-7 + f * 0.05, 0, 1.2]} rot={[0, Math.PI / 2, 0]} scale={1.05} seed={90 + i} />;
                  return inside >= 1 ? null : (
                    <group key={i}>
                      <Shadow pos={[figPos[0], 0.01, figPos[2]]} w={0.9} d={0.6} ink={th.a[0][0]} opacity={0.3 * (1 - inside)} />
                      <Figure pal={th.hero} phase={f / 24} walk={1 - inside * 0.5} pos={figPos} rot={[0, figYaw, 0]} scale={1.05 * (1 - 0.05 * inside)} seed={90 + i} />
                    </group>
                  );
                }
                const c = castOf(id);
                if (c.kind === "vehicle") return <Cast key={i} id={id} size={1.6} pos={[9 - f * 0.11, 0, 2.6]} rot={[0, -Math.PI / 2, 0]} pal={th.b} seed={95 + i} />;
                if (c.kind === "walker") return <Cast key={i} id={id} size={1.4} pos={[-8 + f * 0.06, 0, 1.6]} rot={[0, Math.PI / 2, 0]} clip="Walk" time={t} pal={th.hero} seed={95 + i} />;
                return <Cast key={i} id={id} pos={[i % 2 ? 3.6 : -3.6, 0, -1.2]} rot={[0, 0.4, 0]} pal={th.a} foilPhase={t * 0.1} seed={95 + i} />;
              })}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.18)} out={dur + shot.tail} th={th} top={890} size={68} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
export const cityEnterFrame = (dur: number) => Math.round(dur * 0.72);
