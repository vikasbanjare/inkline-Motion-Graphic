import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { expoOut, pop, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { Backdrop, Cast, Figure, SayIt, WorldLook, step, type V3, type WorldProps } from "../common.tsx";

/**
 * HALL: a rotunda of classical columns on a patterned floor; objects drop onto plinths one by one.
 * Best for: a curated range, a store interior, a gallery of products, choice, a place of quality.
 *   cast       1-5 objects on plinths (the range on show)
 *   p.columns  number of columns (default 10)
 *   p.floor    "sunburst" (default) | "checker"
 *   p.figure   true: the mannequin stands browsing inside the ring
 * Enter by "match" and the camera starts overhead (the ring of capitals from above) and cranes down to eye level.
 */
const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40);
const COLUMN = (() => {
  const H0 = 4.4;
  const base = lathe([[0, 0], [0.62, 0], [0.62, 0.12], [0.58, 0.14], [0.6, 0.2], [0.54, 0.26], [0.5, 0.3], [0.48, 0.34], [0, 0.34]]);
  const shaft = new THREE.CylinderGeometry(0.4, 0.46, H0 - 0.9, 48, 12, true);
  const pos = shaft.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    const k = 1 - 0.06 * Math.max(0, Math.cos(a * 20));
    pos.setXYZ(i, Math.cos(a) * r * k, pos.getY(i), Math.sin(a) * r * k);
  }
  shaft.computeVertexNormals();
  shaft.translate(0, 0.34 + (H0 - 0.9) / 2, 0);
  const cap = lathe([[0, H0 - 0.56], [0.42, H0 - 0.56], [0.46, H0 - 0.5], [0.56, H0 - 0.38], [0.62, H0 - 0.3], [0, H0 - 0.3]]);
  const abacus = new THREE.BoxGeometry(1.36, 0.3, 1.36);
  abacus.translate(0, H0 - 0.15, 0);
  return { base, shaft, cap, abacus, h: H0 };
})();
const RING_R = 4.6;
const beamG = new THREE.TorusGeometry(RING_R, 0.32, 10, 96);
const plinthG = new THREE.CylinderGeometry(0.9, 0.98, 1.1, 40);
const floorG = new THREE.CircleGeometry(9, 96);
const floorTex = (kind: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e9e1d6";
  x.fillRect(0, 0, 1024, 1024);
  if (kind === "checker") {
    x.fillStyle = "#8a7a6a";
    for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) if ((r + k) % 2) x.fillRect(k * 64, r * 64, 64, 64);
  } else {
    x.translate(512, 512);
    x.strokeStyle = "#8a6f5a";
    for (let i = 0; i < 96; i++) {
      x.lineWidth = i % 4 ? 1 : 2.5;
      x.beginPath();
      x.moveTo(0, 0);
      const a = (i / 96) * Math.PI * 2;
      x.lineTo(Math.cos(a) * 520, Math.sin(a) * 520);
      x.stroke();
    }
    for (let r = 40; r < 520; r += 34) {
      x.lineWidth = 2;
      x.beginPath();
      for (let k = 0; k <= 360; k++) {
        const a = (k / 360) * Math.PI * 2;
        const rr = r + 6 * Math.sin(a * 12 + r * 0.05);
        if (k) x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
};

const Column: React.FC<{ pos: V3; seed: number; pal: WorldProps["th"]["a"] }> = ({ pos, seed, pal }) => {
  const m = { palette: pal, seed, angleDeg: 6 };
  return (
    <group position={pos}>
      <EMesh g={COLUMN.base} m={m} />
      <EMesh g={COLUMN.shaft} m={{ ...m, follow: 0.6 }} double />
      <EMesh g={COLUMN.cap} m={m} />
      <EMesh g={COLUMN.abacus} m={m} />
    </group>
  );
};

const SLOTS: [number, number, number][] = [[-2.2, 1.5, 0.9], [-0.7, 1.7, -1.4], [0.8, 1.7, 1.1], [2.2, 1.2, -0.7], [0.0, 1.5, 2.4]];

export const HallWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const p = shot.p ?? {};
  const t = f / 24;
  const fromAbove = shot.enter === "match";
  const crane = fromAbove ? expoOut(ramp(f, 2, 42)) : 1;
  const cutAt = Math.round(dur * 0.62);
  const cut = step(f, [cutAt]);
  const orbit = 0.18 + f * 0.003;
  const eye: V3 = [Math.sin(orbit) * 9.2, 2.4, Math.cos(orbit) * 9.2];
  const over: V3 = [0.01, 15, 0.4];
  const hr = 0.4 + 8.8 * expoOut(Math.min(1, crane * 2.2));
  const pos: V3 = cut === 0 ? [Math.sin(orbit) * hr, over[1] + (eye[1] - over[1]) * crane, Math.cos(orbit) * hr] : [1.6 + (f - cutAt) * 0.02, 2.3, 5.6 - (f - cutAt) * 0.01];
  const target: V3 = cut === 0 ? [0, 2.2 * crane, 0] : [0.6, 2.0, 0];
  const n = Math.max(6, Math.min(14, Number(p.columns ?? 10)));
  const cols = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + 0.31);
  const items = (shot.cast ?? ["boombox", "bottle", "shoe", "avocado"]).slice(0, 5);
  const tex = useMemo(() => floorTex((p.floor as string) ?? "sunburst"), [p.floor]);
  const at0 = fromAbove ? 25 : 8;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1} lambda={130} />
        <World aa>
          <Cam pos={pos} target={target} fov={cut === 0 ? 38 : 32} />
          <RefDepth.Provider value={8}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={floorG} m={{ palette: th.b, seed: 59, map: tex, mapAmt: 0.85, angleDeg: 4 } as never} rot={[-Math.PI / 2, 0, 0]} />
              {cols.map((a, i) => (
                <Column key={i} pos={[Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R]} seed={60 + i} pal={th.a} />
              ))}
              <EMesh g={beamG} m={{ palette: th.a, seed: 58, angleDeg: 6 }} pos={[0, COLUMN.h + 0.3, 0]} rot={[Math.PI / 2, 0, 0]} />
              {items.map((_, i) => (
                <EMesh key={`p${i}`} g={plinthG} m={{ palette: th.b, seed: 70 + i, angleDeg: 10 }} pos={[SLOTS[i][0], 0.55, SLOTS[i][2]]} />
              ))}
              {items.map((id, i) => {
                const at = at0 + i * 12 + (i === 3 ? 13 : 0);
                const k = f >= at ? pop(f, at) : 0;
                return k > 0 ? <Cast key={id + i} id={id} size={SLOTS[i][1]} pos={[SLOTS[i][0], 1.1 + 2.5 * (1 - k), SLOTS[i][2]]} rot={[0, 0.5 + t * 0.15 + i, 0]} pal={i % 2 ? th.a : th.hero} foilPhase={t * 0.2} seed={80 + i} /> : null;
              })}
              {p.figure ? <Figure pal={th.hero} phase={0.25} walk={0.15 + 0.05 * Math.sin(t * 2)} pos={[-1.6, 0, 2.6]} rot={[0, 2.6 + 0.2 * Math.sin(t * 0.8), 0]} hold seed={88} /> : null}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={at0 + 25} out={dur + shot.tail} th={th} top={140} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
