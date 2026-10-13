import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, Shadow, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { BEAN, Backdrop, Cast, H, SayIt, Rise, Steam, W, WorldLook, clamp01, step, type V3, type WorldProps } from "../common.tsx";

/**
 * TABLE: a close still life on a textured surface, seen from a high three-quarter angle that slowly arcs.
 * Objects slide in from the frame edges and settle one by one. Best for: how something is made, food and drink,
 * craft, the everyday ritual, the product in use, a detail worth slowing down for.
 *   cast       1-4 objects; cast[0] is the hero at the centre (a cup for coffee, a dish for food...)
 *   p.pour     true: a stream pours from above into the hero, then steam rises (coffee, tea, a drink)
 *   p.beans    0-60: beans rain onto the table and scatter (coffee, grains, seeds, "small batches")
 *   p.steam    true: steam rises from the hero (without the pour)
 *   p.surface  "linen" | "wood" | "marble"
 * Camera: one scale-step into the hero at 58 % of the shot.
 */
const surfaceTex = (kind: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ece6dc";
  x.fillRect(0, 0, 1024, 1024);
  if (kind === "wood") {
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = i % 5 ? "rgba(90,60,40,0.35)" : "rgba(60,40,25,0.7)";
      x.lineWidth = i % 5 ? 2 : 4;
      x.beginPath();
      for (let k = 0; k <= 64; k++) {
        const y = i * 15 + 8 * Math.sin(k * 0.21 + i * 0.7) + 14 * Math.sin(k * 0.05 + i);
        if (k) x.lineTo(k * 16, y);
        else x.moveTo(0, y);
      }
      x.stroke();
    }
  } else if (kind === "marble") {
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = `rgba(70,70,80,${0.15 + (i % 4) * 0.12})`;
      x.lineWidth = 1 + (i % 3);
      x.beginPath();
      let px = (i * 397) % 1024, py = 0;
      x.moveTo(px, py);
      for (let k = 0; k < 40; k++) {
        px += Math.sin(k * 0.7 + i) * 30 + 6;
        py += 28;
        x.lineTo(px, py);
      }
      x.stroke();
    }
  } else {
    for (let i = 0; i < 1024; i += 6) {
      x.strokeStyle = i % 24 ? "rgba(80,70,60,0.18)" : "rgba(80,70,60,0.4)";
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 1024);
      x.moveTo(0, i);
      x.lineTo(1024, i);
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
};
const tableG = new THREE.CylinderGeometry(6.5, 6.5, 0.3, 96);
const streamG = new THREE.CylinderGeometry(0.028, 0.04, 1, 16, 8, true);
const liquidG = new THREE.CircleGeometry(0.33, 48);

/** Screen position of a world point for this camera (for 2D overlays such as steam). */
const project = (cam: { pos: V3; target: V3; fov: number }, p: V3): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 800);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
};

const SPOTS: V3[] = [[0, 0, 0], [-2.1, 0, 0.7], [2.2, 0, -0.4], [-1.2, 0, -1.9]];

export const TableWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const p = shot.p ?? {};
  const t = f / 24;
  const cutAt = Math.round(dur * 0.58);
  const cut = step(f, [cutAt]);
  const arcA = 0.5 + f * 0.0035;
  const cam = cut === 0
    ? { pos: [Math.sin(arcA) * 7.2, 4.6 - f * 0.006, Math.cos(arcA) * 7.2] as V3, target: [0, 0.5, 0] as V3, fov: 34 }
    : { pos: [Math.sin(arcA) * 3.9, 2.3 - (f - cutAt) * 0.004, Math.cos(arcA) * 3.9] as V3, target: [0, 0.75, 0] as V3, fov: 32 };
  const tex = useMemo(() => surfaceTex((p.surface as string) ?? "linen"), [p.surface]);
  const cast = (shot.cast ?? ["cup"]).slice(0, 4);
  const pourAt = Math.round(dur * 0.3);
  const pour = !!p.pour;
  const pk = ramp(f, pourAt, pourAt + 10); // stream reaches the cup
  const pEnd = 1 - ramp(f, pourAt + 26, pourAt + 34); // stream thins away
  const fill = clamp01((f - pourAt - 8) / 30);
  const nBeans = Math.min(60, Number(p.beans ?? 0));
  const beans = useMemo(
    () =>
      Array.from({ length: nBeans }, (_, i) => {
        const a = i * 2.39996, r = 1.0 + 2.6 * Math.sqrt((i + 0.5) / Math.max(1, nBeans));
        return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.8, at: 4 + (i % 12) * 2 + Math.floor(i / 12) * 3, ry: i * 1.7, rx: (i % 3) * 0.6 };
      }),
    [nBeans],
  );
  const heroTop: V3 = [0, 0.85, 0];
  const steamOn = pour ? ramp(f, pourAt + 30, pourAt + 46) : p.steam ? ramp(f, 20, 40) : 0;
  const [sx, sy] = project(cam, heroTop);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.8} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={7}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={tableG} m={{ palette: th.b, seed: 150, map: tex, mapAmt: 0.8, angleDeg: 4 } as never} pos={[0, -0.15, 0]} />
              {cast.map((id, i) => {
                const at = 6 + i * 12;
                const k = expoOut(ramp(f, at, at + 20));
                if (k <= 0) return null;
                const s = SPOTS[i];
                const from = i % 2 ? -1 : 1;
                return (
                  <group key={i}>
                    <Shadow pos={[s[0], 0.01, s[2]]} w={1.8} d={1.4} ink={th.a[0][0]} opacity={0.25 * k} />
                    <Cast id={id} pos={[s[0] + from * 6 * (1 - k), s[1] + 0.6 * (1 - k), s[2]]} rot={[0, 0.6 + i * 1.1 + (1 - k) * from * 1.2 + t * 0.03, 0]} pal={i === 0 ? th.hero : i % 2 ? th.a : th.b} foilPhase={t * 0.15} seed={160 + i} />
                  </group>
                );
              })}
              {beans.map((b, i) => {
                const u = clamp01((f - b.at) / 14);
                if (u <= 0) return null;
                const fall = 1 - u * u; // falls in, then a small bounce
                const bounce = u >= 1 ? 0.06 * Math.max(0, Math.sin(((f - b.at - 14) / 6) * Math.PI)) * Math.exp(-(f - b.at - 14) / 8) : 0;
                return <EMesh key={i} g={BEAN} m={{ palette: th.a, seed: 200 + (i % 7), angleDeg: 20, follow: 0.6 }} pos={[b.x, 0.08 + 4 * fall + bounce, b.z]} rot={[b.rx + (1 - u) * 4, b.ry, 0.3]} scale={0.2} />;
              })}
              {pour && pk > 0 && pEnd > 0 ? (
                <group position={[0, 0.7, 0]}>
                  <EMesh g={streamG} m={{ palette: th.hero, seed: 180, foil: 0.3, angleDeg: 80 }} pos={[0.02 * Math.sin(f * 0.6), 3 - 1.5 * pk, 0]} scale={[pEnd, 3 * pk + 0.01, pEnd]} />
                </group>
              ) : null}
              {pour && fill > 0 ? <EMesh g={liquidG} m={{ palette: th.hero, seed: 181, foil: 0.15 }} pos={[0, 0.42 + 0.2 * fill, 0]} rot={[-Math.PI / 2, 0, 0]} scale={0.6 + 0.4 * fill} /> : null}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {steamOn > 0 ? <Steam f={f} x={sx} y={sy} h={cut ? 380 : 240} color={th.a[1][0]} o={steamOn * 0.55} /> : null}
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.22)} out={dur + shot.tail} th={th} plate />}
        {print ? null : <Rise v={shot.value} f={f} at={Math.round(dur * 0.4)} out={dur + shot.tail} ink={th.a[0][0]} id={`rise${shot.index}`} />}
      </AbsoluteFill>
    </WorldLook>
  );
};
