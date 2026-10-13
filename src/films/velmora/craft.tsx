import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, Shadow, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { BEAN, Backdrop, SayIt, Steam, W, H, WorldLook, clamp01, lerp, smooth, step, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { bandsTex, canvasTex, lathe, rnd, smoothProfile, tube, woodTex } from "../../build/geo.ts";

/**
 * Velmora 3-5: the craft. A drum roaster turns and drops its beans into the round cooling tray, where the stirring
 * arms sweep them; from above, the tray becomes the mouth of a hand grinder (match); then a gooseneck kettle pours a
 * slow spiral into a cone dripper over a glass carafe.
 */
type Pal = typeof PALS.espresso;
const project = (cam: { pos: V3; target: V3; fov: number }, p: V3): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 800);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
};

// ---- the roaster -----------------------------------------------------------------------------------------------
const drumG = (() => {
  const g = lathe([[0, -1.3], [1.05, -1.3], [1.1, -1.2], [1.1, 1.2], [1.05, 1.3], [0, 1.3]], 64);
  g.rotateZ(Math.PI / 2);
  return g;
})();
const bandG = (() => {
  const g = new THREE.TorusGeometry(1.13, 0.05, 10, 80);
  g.rotateY(Math.PI / 2);
  return g;
})();
const doorG = (() => {
  const g = new THREE.TorusGeometry(0.62, 0.08, 12, 64);
  g.rotateY(Math.PI / 2);
  return g;
})();
const glassG = (() => {
  const g = new THREE.CircleGeometry(0.6, 48);
  g.rotateY(Math.PI / 2);
  return g;
})();
const hopperG = lathe([[0.18, 0], [0.22, 0.1], [0.75, 0.9], [0.8, 1.0], [0.78, 1.02]], 48);
const chimneyG = tube([[-1.1, 1.0, -0.5], [-1.4, 1.6, -0.6], [-1.5, 2.6, -0.6], [-1.5, 3.8, -0.6]], 0.16, 0.16, 60, 16);
const legG = new THREE.CylinderGeometry(0.07, 0.09, 1.3, 12);
const baseG = new THREE.BoxGeometry(2.8, 0.25, 1.6);
const trayG = lathe([[0, 0], [1.5, 0], [1.55, 0.05], [1.55, 0.32], [1.5, 0.32], [1.45, 0.06], [0, 0.06]], 80);
const armG = new THREE.BoxGeometry(2.8, 0.08, 0.1);
const hubG = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 20);
const perfTex = canvasTex(512, 512, (x) => {
  x.fillStyle = "#e9e3da";
  x.fillRect(0, 0, 512, 512);
  x.fillStyle = "#4a3a2c";
  for (let i = 0; i < 32; i++) for (let k = 0; k < 32; k++) if (Math.hypot(i - 16, k - 16) < 15.5) x.fillRect(i * 16 + 5, k * 16 + 5, 6, 6);
});
const drumTex = bandsTex(18, "#e6dfd4", "#5a4a3c", true);

export const Roast: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const cutAt = Math.round(dur * 0.6);
  const cut = step(f, [cutAt]);
  const orb = 0.55 + f * 0.004;
  // wide 3/4 on the roaster, then a scale-step to straight above the tray (it becomes the grinder's mouth)
  const cam = cut === 0
    ? { pos: [Math.sin(orb) * 9, 3.6, Math.cos(orb) * 9] as V3, target: [0.4, 1.4, 0.6] as V3, fov: 36 }
    : { pos: [0.6 + 0.004 * (f - cutAt), 7.2 - (f - cutAt) * 0.02, 1.9 + 0.01] as V3, target: [0.6, 0.6, 1.9] as V3, fov: 36 };
  const spin = t * 2.2;
  const drop = ramp(f, 8, dur * 0.7);
  const stream = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ ph: rnd(i, 1), dx: (rnd(i, 2) - 0.5) * 0.25, dz: (rnd(i, 3) - 0.5) * 0.25, r: rnd(i, 4) * 6 })), []);
  const tray = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ a: rnd(i, 5) * Math.PI * 2, rr: 0.25 + 1.15 * Math.sqrt(rnd(i, 6)), rx: rnd(i, 7) * 6 })), []);
  const pal: Pal = th.hero;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1.4} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={9}>
            <Detail.Provider value={ENGRAVE}>
              <group position={[-0.6, 1.9, -0.6]}>
                {/* the drum turns on its axis */}
                <group rotation={[spin, 0, 0]}>
                  <EMesh g={drumG} m={{ palette: th.a, seed: 500, map: drumTex, mapAmt: 0.8, angleDeg: 80 } as never} />
                </group>
                {[-1.0, 0, 1.0].map((x, i) => (
                  <EMesh key={i} g={bandG} m={{ palette: th.a, seed: 501 + i, foil: i === 1 ? 0.3 : 0 }} pos={[x, 0, 0]} />
                ))}
                <EMesh g={doorG} m={{ palette: th.b, seed: 505, foil: 0.4 }} pos={[1.32, 0, 0]} />
                <EMesh g={glassG} m={{ palette: pal, seed: 506, foil: 0.5 }} pos={[1.31, 0, 0]} live={{ foilPhase: t * 0.4 }} />
                <EMesh g={hopperG} m={{ palette: th.a, seed: 507, angleDeg: 20 }} pos={[0.2, 1.05, 0]} />
                <EMesh g={chimneyG} m={{ palette: th.a, seed: 508, angleDeg: 80 }} pos={[0, -1.0, 0]} />
                <EMesh g={baseG} m={{ palette: th.b, seed: 509 }} pos={[0, -1.55, 0]} />
                {[[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].map(([x, z], i) => (
                  <EMesh key={i} g={legG} m={{ palette: th.b, seed: 510 + i }} pos={[x, -2.2, z]} />
                ))}
              </group>
              {/* the cooling tray: beans stream from the door and the arms sweep them round */}
              <group position={[0.6, 0, 1.9]}>
                <Shadow pos={[0, 0.01, 0]} w={3.6} d={3.6} ink={th.a[0][0]} opacity={0.25} />
                <EMesh g={trayG} m={{ palette: th.b, seed: 520, map: perfTex, mapAmt: 0.7, angleDeg: 4 } as never} pos={[0, 0.5, 0]} />
                <EMesh g={hubG} m={{ palette: th.a, seed: 521 }} pos={[0, 0.7, 0]} />
                <group position={[0, 0.66, 0]} rotation={[0, -t * 1.6, 0]}>
                  <EMesh g={armG} m={{ palette: th.a, seed: 522 }} />
                  <EMesh g={armG} m={{ palette: th.a, seed: 523 }} rot={[0, Math.PI / 2, 0]} />
                  {tray.map((b, i) => {
                    const on = drop * 70 > i;
                    return on ? <EMesh key={i} g={BEAN} m={{ palette: pal, seed: 530 + (i % 9), angleDeg: 20 }} pos={[Math.cos(b.a) * b.rr, -0.05, Math.sin(b.a) * b.rr]} rot={[Math.PI / 2, b.rx, b.a]} scale={0.2} /> : null;
                  })}
                </group>
              </group>
              {cut === 0
                ? stream.map((s, i) => {
                    const u = (t * 1.4 + s.ph) % 1;
                    const p0 = new THREE.Vector3(0.75, 1.9, -0.6), p1 = new THREE.Vector3(0.6, 0.75, 1.6);
                    const p = p0.clone().lerp(p1, u);
                    p.y += Math.sin(u * Math.PI) * 0.5;
                    return f > 8 ? <EMesh key={i} g={BEAN} m={{ palette: pal, seed: 540 + (i % 7), angleDeg: 20 }} pos={[p.x + s.dx, p.y, p.z + s.dz]} rot={[s.r + t * 6, s.r, 0]} scale={0.2} /> : null;
                  })
                : null}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.18)} out={cutAt + 4} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};

// ---- the grinder: from above (the match), then the side; the crank turns, grounds fall -----------------------------
const grinderBody = lathe(smoothProfile([[0.0, 0], [0.62, 0], [0.66, 0.1], [0.6, 0.9], [0.52, 1.5], [0.58, 1.7], [0.6, 1.8], [0, 1.8]], 40), 64);
const grinderTop = lathe([[0, 0], [0.62, 0], [0.7, 0.12], [0.66, 0.16], [0.2, 0.16], [0.2, 0.5], [0, 0.5]], 64);
const crankG = tube([[0, 0, 0], [0.5, 0.2, 0], [1.1, 0.25, 0]], 0.05, 0.04, 30, 10);
const knobG = lathe(smoothProfile([[0, 0], [0.12, 0.02], [0.14, 0.2], [0.1, 0.36], [0, 0.38]], 16), 24);
const bowlG = lathe(smoothProfile([[0, 0], [0.5, 0.02], [0.75, 0.25], [0.8, 0.45], [0.78, 0.46]], 24), 48);
const groundsG = new THREE.CircleGeometry(0.62, 40);
const tableG = new THREE.CylinderGeometry(6, 6, 0.3, 80);
const wood = woodTex();
const grainTex = canvasTex(512, 512, (x) => {
  x.fillStyle = "#e3d6c4";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(60,40,25,${0.3 + rnd(i, 1) * 0.6})`;
    x.fillRect(rnd(i, 2) * 512, rnd(i, 3) * 512, 3, 3);
  }
});

export const Grind: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const tilt = smooth(ramp(f, 4, 40)); // from overhead (the matched circle) to the three-quarter view
  const top: V3 = [0.01, 6.0, 0.02], side: V3 = [4.0, 3.0, 5.6];
  const pos: V3 = [lerp(top[0], side[0], tilt) + f * 0.004, lerp(top[1], side[1], tilt), lerp(top[2], side[2], tilt)];
  const cam = { pos, target: [0, lerp(1.9, 2.0, tilt), 0] as V3, fov: lerp(30, 36, tilt) };
  const turn = t * 3.2;
  const fill = clamp01((f - 20) / (dur - 20));
  const grounds = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ ph: rnd(i, 1), x: (rnd(i, 2) - 0.5) * 0.18, z: (rnd(i, 3) - 0.5) * 0.18 })), []);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={6}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={tableG} m={{ palette: th.b, seed: 560, map: wood, mapAmt: 0.75, angleDeg: 4 } as never} pos={[0, -0.15, 0]} />
              {/* the grinder stands on its catch bowl's rim */}
              <EMesh g={bowlG} m={{ palette: th.b, seed: 561, angleDeg: 10 }} pos={[0, 0, 0]} />
              <EMesh g={groundsG} m={{ palette: th.a, seed: 562, map: grainTex, mapAmt: 0.9 } as never} rot={[-Math.PI / 2, 0, 0]} pos={[0, 0.06 + 0.3 * fill, 0]} scale={0.6 + 0.5 * fill} />
              <group position={[0, 0.5, 0]}>
                <EMesh g={grinderBody} m={{ palette: th.a, seed: 563, map: wood, mapAmt: 0.6, angleDeg: 80, follow: 0.5 } as never} />
                <EMesh g={grinderTop} m={{ palette: th.hero, seed: 564, foil: 0.35 }} pos={[0, 1.8, 0]} />
                <group position={[0, 2.3, 0]} rotation={[0, turn, 0]}>
                  <EMesh g={crankG} m={{ palette: th.hero, seed: 565, foil: 0.3 }} />
                  <EMesh g={knobG} m={{ palette: th.a, seed: 566 }} pos={[1.1, 0.25, 0]} />
                </group>
                {/* beans in the open mouth, sinking as they are ground */}
                {Array.from({ length: 9 }, (_, i) => {
                  const a = (i / 9) * Math.PI * 2 + turn * 0.5;
                  return <EMesh key={i} g={BEAN} m={{ palette: th.hero, seed: 570 + i, angleDeg: 20 }} pos={[Math.cos(a) * 0.38, 1.98 - 0.1 * fill, Math.sin(a) * 0.38]} rot={[Math.PI / 2, a, 0]} scale={0.16} />;
                })}
              </group>
              {grounds.map((g, i) => {
                const u = (t * 1.8 + g.ph) % 1;
                return f > 14 ? <EMesh key={i} g={BEAN} m={{ palette: th.a, seed: 580 + (i % 5) }} pos={[g.x, 0.48 - u * 0.4, g.z]} scale={0.035} /> : null;
              })}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.25)} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};

// ---- the pour-over -------------------------------------------------------------------------------------------------
const kettleBody = lathe(smoothProfile([[0, 0], [0.62, 0], [0.7, 0.15], [0.72, 0.55], [0.6, 0.85], [0.3, 1.0], [0.22, 1.05], [0, 1.08]], 40), 64);
const lidKnob = lathe(smoothProfile([[0, 0], [0.1, 0], [0.08, 0.12], [0.12, 0.2], [0, 0.24]], 12), 24);
const spoutG = tube([[0.55, 0.15, 0], [0.95, 0.25, 0], [1.15, 0.6, 0], [1.25, 1.05, 0], [1.55, 1.2, 0]], 0.07, 0.035, 80, 12);
const handleG = tube([[-0.55, 0.85, 0], [-1.05, 0.95, 0], [-1.1, 0.45, 0], [-0.68, 0.25, 0]], 0.07, 0.07, 40, 12);
const dripperG = lathe([[0.12, 0], [0.22, 0], [0.24, 0.05], [0.72, 0.85], [0.78, 0.9], [0.74, 0.92], [0.2, 0.08], [0.12, 0.06]], 64);
const ribTex = bandsTex(26, "#efe9e0", "#7a6a5a", true);
const carafeG = lathe(smoothProfile([[0, 0], [0.62, 0.02], [0.7, 0.4], [0.55, 0.85], [0.42, 1.1], [0.45, 1.25], [0.43, 1.26]], 40), 64);
const liquidG = new THREE.CylinderGeometry(0.6, 0.62, 1, 48);
const pourG = new THREE.CylinderGeometry(0.018, 0.026, 1, 12, 6, true);
const bloomG = lathe(smoothProfile([[0, 0.14], [0.35, 0.12], [0.55, 0.1], [0.6, 0.06]], 12), 48);

export const Pour: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const cutAt = Math.round(dur * 0.58);
  const cut = step(f, [cutAt]);
  const cam = cut === 0
    ? { pos: [lerp(-3.0, -2.0, f / dur), 3.0, 8.4 - f * 0.01] as V3, target: [-0.3, 2.2, 0] as V3, fov: 36 }
    : { pos: [-1.4 + (f - cutAt) * 0.008, 3.5, 3.2] as V3, target: [0, 2.7, 0] as V3, fov: 32 };
  const tiltK = smooth(ramp(f, 4, 22));
  const pouring = f > 18;
  const swirl = t * 5;
  const lvl = clamp01((f - 30) / (dur - 30));
  const steamOn = ramp(f, 30, 50);
  const lip: V3 = [0.12 + 0.18 * Math.cos(swirl), 3.9, 0.18 * Math.sin(swirl)];
  const [sx, sy] = project(cam, [0, 3.2, 0]);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.9} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={6}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={tableG} m={{ palette: th.b, seed: 600, map: wood, mapAmt: 0.75, angleDeg: 4 } as never} pos={[0, -0.15, 0]} />
              <EMesh g={carafeG} m={{ palette: th.b, seed: 601, angleDeg: 60, opacity: 0.55 } as never} />
              <EMesh g={liquidG} m={{ palette: th.hero, seed: 602, foil: 0.15 }} pos={[0, 0.02 + 0.3 * lvl, 0]} scale={[0.95, Math.max(0.01, 0.6 * lvl), 0.95]} />
              <EMesh g={dripperG} m={{ palette: th.a, seed: 603, map: ribTex, mapAmt: 0.6, angleDeg: 80 } as never} pos={[0, 1.27, 0]} />
              <EMesh g={bloomG} m={{ palette: th.hero, seed: 604, foil: 0.2 }} pos={[0, 1.6 + 0.25 * ramp(f, 20, 60), 0]} scale={[0.9, 1 + 0.6 * Math.sin(t * 2) * 0.1, 0.9]} />
              {/* the kettle tips in, its stream circling the bed */}
              <group position={[-1.6, 3.0, 0]} rotation={[0, 0, -0.55 * tiltK]}>
                <EMesh g={kettleBody} m={{ palette: th.hero, seed: 605, foil: 0.35, angleDeg: 70, follow: 0.5 }} />
                <EMesh g={lidKnob} m={{ palette: th.a, seed: 606 }} pos={[0, 1.06, 0]} />
                <EMesh g={spoutG} m={{ palette: th.hero, seed: 607, foil: 0.3 }} />
                <EMesh g={handleG} m={{ palette: th.a, seed: 608 }} />
              </group>
              {pouring ? <EMesh g={pourG} m={{ palette: th.hero, seed: 609, angleDeg: 85 }} pos={[(lip[0] - 0.05) * 0.9, 2.55, lip[2]]} scale={[1, 1.5, 1]} rot={[0, 0, 0.05 * Math.sin(t * 9)]} /> : null}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        <Steam f={f} x={sx} y={sy} h={300} color={th.a[1][0]} o={steamOn * 0.5} />
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.22)} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
