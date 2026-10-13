import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, Shadow, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { Backdrop, H, SayIt, Steam, W, WorldLook, clamp01, lerp, smooth, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { canvasTex, lathe, rnd, signTex, smoothProfile } from "../../build/geo.ts";
import { Person, STRIDE } from "../../build/person.tsx";

/**
 * Velmora 4, 6, 8: the man's journey through the city before sunrise. One street, three framings (p.variant):
 *   door    a blue-hour terrace; his front door opens, he steps out, sets off left to right
 *   walk    the camera tracks with him past shopfronts; the lamps go out one by one behind him; a vent breathes steam
 *   corner  low angle down a side street: he turns the corner; at the far end Velmora's sign lights up
 * He always wears the ochre coat and the dark fedora, and always walks left to right.
 */
export const MAN = { coat: PALS.amber, trousers: PALS.ink, hat: PALS.ink, hair: PALS.espresso };
const boxG = new THREE.BoxGeometry(1, 1, 1);
const groundG = new THREE.PlaneGeometry(120, 40);
const poleG = lathe(smoothProfile([[0.09, 0], [0.12, 0.05], [0.06, 0.3], [0.05, 3.2], [0.08, 3.3], [0, 3.32]], 20), 20);
const headG = (() => {
  const g = new THREE.CylinderGeometry(0.2, 0.15, 0.42, 6);
  g.translate(0, 0.21, 0);
  return g;
})();
const capG = (() => {
  const g = new THREE.ConeGeometry(0.3, 0.22, 6);
  g.translate(0, 0.53, 0);
  return g;
})();
const ventG = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32);
const facade = (seed: number, lit: number) =>
  canvasTex(512, 768, (x) => {
    x.fillStyle = "#e6e0d8";
    x.fillRect(0, 0, 512, 768);
    x.strokeStyle = "rgba(60,55,70,0.25)";
    x.lineWidth = 2;
    for (let y = 0; y < 768; y += 18) {
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(512, y);
      x.stroke();
    }
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 3; k++) {
        const on = rnd(seed * 31 + r * 3 + k, 4) < lit;
        x.fillStyle = on ? "#f3dcae" : "#2a2a44";
        x.fillRect(52 + k * 150, 40 + r * 140, 100, 100);
        x.strokeStyle = "#e6e0d8";
        x.lineWidth = 6;
        x.strokeRect(52 + k * 150, 40 + r * 140, 100, 100);
        x.beginPath();
        x.moveTo(102 + k * 150, 40 + r * 140);
        x.lineTo(102 + k * 150, 140 + r * 140);
        x.stroke();
      }
    x.fillStyle = "#2a2a44";
    x.fillRect(0, 610, 512, 8);
  });
const cobbles = canvasTex(1024, 1024, (x) => {
  x.fillStyle = "#e4dfd6";
  x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = "rgba(60,55,70,0.35)";
  x.lineWidth = 3;
  for (let r = 0; r < 32; r++)
    for (let k = 0; k < 32; k++) {
      x.beginPath();
      x.ellipse(k * 32 + (r % 2) * 16 + 16, r * 32 + 16, 13, 12, 0, 0, Math.PI * 2);
      x.stroke();
    }
}, [10, 4]);

/** A row of terrace houses along x (z = -3 is the facade line). */
const BLDGS = Array.from({ length: 9 }, (_, i) => ({ x: -16 + i * 4, h: 6 + 2.2 * rnd(i, 7), w: 3.9, lit: 0.25 + 0.3 * rnd(i, 8) }));
const LAMPS = [-10, -4, 2, 8, 14];

export const Street: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const p = shot.p ?? {};
  const variant = (p.variant as string) ?? "walk";
  const texes = useMemo(() => BLDGS.map((b, i) => facade(i + 1, variant === "door" ? b.lit : b.lit * 0.6)), [variant]);
  const sign = useMemo(() => signTex((p.sign as string) ?? "VELMORA", "#3a2418", "#f6e7c8"), [p.sign]);
  // the walk: distance drives the stride, so feet stay planted
  let man: { pos: V3; yaw: number; dist: number; walk: number } = { pos: [0, 0, 0], yaw: Math.PI / 2, dist: 0, walk: 1 };
  let cam = { pos: [0, 2, 10] as V3, target: [0, 1.8, -2] as V3, fov: 36 };
  if (variant === "door") {
    const out = smooth(ramp(f, 12, 34)); // steps out of the doorway
    const go = clamp01((f - 30) / (dur + shot.tail - 30));
    const dz = lerp(-2.7, 0.2, out);
    const dx = -4 + go * 4.2;
    man = { pos: [dx, 0, dz], yaw: lerp(0, Math.PI / 2, smooth(ramp(f, 26, 40))), dist: out * 2.9 + go * 4.2, walk: f < 12 ? 0.2 : 1 };
    cam = { pos: [-2.6 + f * 0.012, 1.6, 5.6], target: [-3.0 + f * 0.014, 1.6, -2], fov: 36 };
  } else if (variant === "walk") {
    const x = -8 + f * 0.085;
    man = { pos: [x, 0, 0.4], yaw: Math.PI / 2, dist: f * 0.085, walk: 1 };
    cam = { pos: [x + 1.2, 1.7, 7.0], target: [x + 0.6, 1.9, -2], fov: 38 };
  } else {
    // corner: low angle down the side street (now along -z); he comes round the corner from the left
    const k = clamp01(f / (dur + shot.tail));
    const turn = smooth(ramp(f, 6, 30));
    const x = lerp(-3.4, 0.4, smooth(clamp01(k * 1.6)));
    const z = lerp(1.6, -1.8, Math.max(0, k * 1.6 - 0.4));
    man = { pos: [x, 0, z], yaw: lerp(Math.PI / 2, Math.PI, turn), dist: Math.abs(x + 3.4) + Math.abs(z - 1.6), walk: 1 };
    cam = { pos: [1.6, 0.7, 4.6], target: [-0.4, 2.0, -14], fov: 40 };
  }
  const sky = variant === "corner" ? 1 : variant === "walk" ? ramp(f, 0, dur) * 0.6 : 0;
  const lampsOff = (i: number) => variant === "door" ? false : variant === "corner" ? true : f > 10 + i * 12;
  const vent: V3 = [3.5, 0.02, 1.4];
  const [vx, vy] = useMemo(() => {
    const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 800);
    c.position.set(...cam.pos);
    c.lookAt(new THREE.Vector3(...cam.target));
    c.updateMatrixWorld();
    const v = new THREE.Vector3(...vent).project(c);
    return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
  }, [cam.fov, cam.pos, cam.target, vent]);
  const signOn = variant === "corner" ? smooth(ramp(f, 18, 30)) * (0.85 + 0.15 * Math.sin(f * 1.7) * (f < 34 ? 1 : 0)) : 0;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.7} />
        {/* the sky warms as the walk goes on: blue hour → dawn */}
        <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(246,196,160,${0.55 * sky}) 0%, rgba(246,196,160,0) 55%)` }} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={9}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={groundG} m={{ palette: th.b, seed: 900, map: cobbles, mapAmt: 0.5, angleDeg: 3 } as never} rot={[-Math.PI / 2, 0, 0]} pos={[0, 0, -6]} />
              {(variant === "corner" ? [] : BLDGS).map((b, i) => (
                <group key={i} position={[b.x, 0, -3.4]}>
                  <EMesh g={boxG} m={{ palette: th.a, seed: 910 + i, map: texes[i], mapAmt: 0.85, angleDeg: 4 } as never} pos={[0, b.h / 2, 0]} scale={[b.w, b.h, 1.2]} />
                  <EMesh g={boxG} m={{ palette: th.a, seed: 930 + i }} pos={[0, b.h + 0.12, 0]} scale={[b.w + 0.2, 0.24, 1.4]} />
                  {/* doorway with a step */}
                  <EMesh g={boxG} m={{ palette: th.a, seed: 950 + i, dim: 0.5 } as never} pos={[i % 2 ? 0.9 : -0.9, 1.15, 0.61]} scale={[1.0, 2.3, 0.04]} />
                  <EMesh g={boxG} m={{ palette: th.b, seed: 970 + i }} pos={[i % 2 ? 0.9 : -0.9, 0.08, 0.95]} scale={[1.4, 0.16, 0.7]} />
                </group>
              ))}
              {variant === "door" ? (
                <group position={[-4.9 + 0.5, 0, -2.78]} rotation={[0, -1.4 * smooth(ramp(f, 4, 16)), 0]}>
                  <EMesh g={boxG} m={{ palette: th.hero, seed: 990 }} pos={[0.5, 1.15, 0]} scale={[1.0, 2.3, 0.07]} />
                </group>
              ) : null}
              {variant === "corner" ? (
                <>
                  {/* the side street: walls left and right converging, the café at the far end */}
                  {[-1, 1].map((sd) =>
                    Array.from({ length: 5 }, (_, i) => (
                      <EMesh key={`${sd}${i}`} g={boxG} m={{ palette: th.a, seed: 1000 + i + (sd > 0 ? 10 : 0), map: texes[i], mapAmt: 0.85, angleDeg: 4 } as never} pos={[sd * 4.2, 3.5 + (i % 2), -3 - i * 3.2]} scale={[1.2, 7 + 2 * (i % 2), 3.1]} />
                    )),
                  )}
                  <group position={[0, 0, -17]}>
                    <EMesh g={boxG} m={{ palette: th.hero, seed: 1030, angleDeg: 4 }} pos={[0, 2.8, 0]} scale={[7.2, 5.6, 0.8]} />
                    <EMesh g={boxG} m={{ palette: PALS.amber, seed: 1031, foil: 0.15 }} pos={[0, 1.4, 0.42]} scale={[5.2, 2.4, 0.04]} live={{ opacity: 0.35 + 0.65 * signOn }} />
                    <EMesh g={boxG} m={{ palette: th.a, seed: 1032, map: sign, mapAmt: 0.95, foil: 0.3 } as never} pos={[0, 4.1, 0.45]} scale={[3.8, 0.7, 0.08]} live={{ foilPhase: t * 0.6, lift: 0.25 * signOn }} />
                  </group>
                </>
              ) : null}
              {(variant === "corner" ? [] : LAMPS).map((x, i) => {
                const off = lampsOff(i);
                return (
                  <group key={i} position={[x, 0, 0.9]}>
                    <EMesh g={poleG} m={{ palette: th.a, seed: 1040 + i, angleDeg: 80 }} />
                    <EMesh g={headG} m={{ palette: off ? th.a : PALS.amber, seed: 1050 + i, foil: off ? 0 : 0.35 }} pos={[0, 3.0, 0]} live={{ pal: off ? th.a : PALS.amber, foilPhase: t }} />
                    <EMesh g={capG} m={{ palette: th.a, seed: 1070 + i }} pos={[0, 3.0, 0]} />
                  </group>
                );
              })}
              {variant === "walk" ? <EMesh g={ventG} m={{ palette: th.a, seed: 1060 }} pos={vent} /> : null}
              <Shadow pos={[man.pos[0], 0.01, man.pos[2]]} w={1.0} d={0.7} ink={th.a[0][0]} opacity={0.3} />
              <Person pals={MAN} phase={man.dist / (STRIDE * 1.0)} walk={man.walk} pos={man.pos} rot={[0, man.yaw, 0]} hat seed={1100} />
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {/* lamp glow while they're lit */}
        {variant !== "corner" ? (
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen" }}>
            {LAMPS.map((x, i) => {
              if (lampsOff(i)) return null;
              const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 800);
              c.position.set(...cam.pos);
              c.lookAt(new THREE.Vector3(...cam.target));
              c.updateMatrixWorld();
              const v = new THREE.Vector3(x, 3.2, 0.9).project(c);
              return <circle key={i} cx={(v.x * 0.5 + 0.5) * W} cy={(-v.y * 0.5 + 0.5) * H} r={70} fill="#f6d79a" opacity={0.35} style={{ filter: "blur(22px)" }} />;
            })}
          </svg>
        ) : null}
        {variant === "walk" ? <Steam f={f} x={vx} y={vy} h={260} color="#ffffff" o={0.55} /> : null}
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.3)} out={dur + shot.tail} th={th} top={880} size={70} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
