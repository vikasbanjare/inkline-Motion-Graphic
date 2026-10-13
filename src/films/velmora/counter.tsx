import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { Backdrop, H, SayIt, Steam, W, WorldLook, lerp, smooth, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { canvasTex, lathe, smoothProfile, tube, woodTex } from "../../build/geo.ts";
import { Person } from "../../build/person.tsx";
import { Cup } from "./cafe.tsx";
import { MAN } from "./street.tsx";

/**
 * Velmora 11b, the payoff: inside the café, warm morning light through the window. The cup with its rosetta sits on
 * the counter by the espresso machine; the man's hand lifts it and steam curls up into the light.
 */
const boxG = new THREE.BoxGeometry(1, 1, 1);
const groupHeadG = lathe(smoothProfile([[0, 0], [0.22, 0], [0.25, 0.08], [0.2, 0.3], [0, 0.32]], 12), 24);
const wandG = tube([[0, 0, 0], [0.15, -0.2, 0.1], [0.18, -0.7, 0.15]], 0.025, 0.02, 30, 8);
const gaugeG = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24);
const wood = woodTex();
const marble = canvasTex(1024, 512, (x) => {
  x.fillStyle = "#efebe4";
  x.fillRect(0, 0, 1024, 512);
  x.strokeStyle = "rgba(90,90,100,0.3)";
  for (let i = 0; i < 18; i++) {
    x.lineWidth = 1 + (i % 3);
    x.beginPath();
    let px = (i * 211) % 1024, py = 0;
    x.moveTo(px, py);
    for (let k = 0; k < 16; k++) {
      px += Math.sin(k + i) * 40 + 10;
      py += 34;
      x.lineTo(px, py);
    }
    x.stroke();
  }
});
const shelfTex = canvasTex(512, 512, (x) => {
  x.fillStyle = "#e8e0d4";
  x.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 4; r++) {
    x.fillStyle = "#5a3c28";
    x.fillRect(0, 100 + r * 120, 512, 10);
    for (let k = 0; k < 9; k++) {
      x.fillStyle = k % 3 ? "#3a2a20" : "#a07a50";
      x.fillRect(20 + k * 54, 40 + r * 120, 34, 60);
    }
  }
});

export const Counter: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const lift = smooth(ramp(f, dur * 0.35, dur * 0.75));
  const cam = { pos: [lerp(-0.2, 0.3, f / dur), 1.8, lerp(4.4, 4.0, f / dur)] as V3, target: [0.8, 1.35, 0.6] as V3, fov: 34 };
  const cupPos: V3 = [lerp(0.6, 1.3, lift), lerp(1.07, 1.24, lift), lerp(0.45, 1.12, lift)];
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 800);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  const v = new THREE.Vector3(cupPos[0], cupPos[1] + 0.3, cupPos[2]).project(c);
  const [sx, sy] = [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.6} />
        <AbsoluteFill style={{ background: "linear-gradient(110deg, rgba(246,214,160,0.55) 0%, rgba(246,214,160,0) 45%)" }} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={4}>
            <Detail.Provider value={ENGRAVE}>
              {/* back wall: shelves of bags and jars, a window of morning light */}
              <EMesh g={boxG} m={{ palette: th.a, seed: 1200, map: shelfTex, mapAmt: 0.8, angleDeg: 4 } as never} pos={[0.6, 1.9, -2.2]} scale={[3.4, 2.6, 0.1]} />
              <EMesh g={boxG} m={{ palette: PALS.amber, seed: 1201, foil: 0.12 }} pos={[-2.4, 2.0, -2.15]} scale={[2.2, 2.6, 0.05]} live={{ foilPhase: t * 0.2 }} />
              {/* the counter */}
              <EMesh g={boxG} m={{ palette: th.a, seed: 1202, map: wood, mapAmt: 0.7, angleDeg: 80 } as never} pos={[0, 0.5, 0]} scale={[4.4, 1.0, 1.4]} />
              <EMesh g={boxG} m={{ palette: th.b, seed: 1203, map: marble, mapAmt: 0.7, angleDeg: 4 } as never} pos={[0, 1.03, 0]} scale={[4.6, 0.06, 1.6]} />
              {/* the espresso machine */}
              <group position={[-1.1, 1.06, -0.2]}>
                <EMesh g={boxG} m={{ palette: th.hero, seed: 1204, foil: 0.35, angleDeg: 70 }} pos={[0, 0.45, 0]} scale={[1.3, 0.9, 0.7]} live={{ foilPhase: t * 0.3 }} />
                <EMesh g={boxG} m={{ palette: th.a, seed: 1205 }} pos={[0, 0.94, 0]} scale={[1.36, 0.08, 0.76]} />
                {[-0.35, 0.35].map((x, i) => (
                  <group key={i}>
                    <EMesh g={groupHeadG} m={{ palette: th.a, seed: 1206 + i }} pos={[x, 0.05, 0.38]} rot={[Math.PI, 0, 0]} />
                    <EMesh g={gaugeG} m={{ palette: th.b, seed: 1208 + i, foil: 0.3 }} pos={[x, 0.65, 0.36]} rot={[Math.PI / 2, 0, 0]} />
                  </group>
                ))}
                <EMesh g={wandG} m={{ palette: th.a, seed: 1210 }} pos={[0.6, 0.55, 0.3]} />
              </group>
              {/* the cup: on the counter, then lifted by his hand */}
              <group position={cupPos} scale={0.3}>
                <Cup th={th} seed={1220} />
              </group>
              {/* the man across the counter, lifting the cup */}
              <Person pals={MAN} phase={0.1} walk={0.05} pos={[1.6, 0, 0.9]} rot={[0, -Math.PI / 2 + 0.25, 0]} hat hold={lift > 0.15} seed={1230} />
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        <Steam f={f} x={sx} y={sy} h={280} color="#ffffff" o={0.6} />
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.45)} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
