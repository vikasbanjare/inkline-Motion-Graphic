import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, Shadow, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { Backdrop, Cast, Figure, H, SayIt, W, WorldLook, clamp01, lerp, smooth, step, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { canvasTex, lathe, rnd, signTex, smoothProfile, tube } from "../../build/geo.ts";

/**
 * Velmora 6-7: the cup and the café. From straight above, milk is poured into the crema and a rosetta grows in foil;
 * the cup's circle then matches into the café: we start above the same cup on a bistro table outside and crane back
 * to the street corner as a man in a hat walks in and the door swings open under the striped awning.
 */
const cupG = lathe(smoothProfile([[0, 0], [0.32, 0], [0.36, 0.05], [0.5, 0.3], [0.6, 0.62], [0.63, 0.7], [0.6, 0.7], [0.55, 0.62], [0.45, 0.3], [0.0, 0.08]], 40), 72);
const saucerG = lathe(smoothProfile([[0, 0], [0.5, 0], [0.9, 0.06], [1.05, 0.12], [1.03, 0.13], [0.5, 0.05], [0, 0.04]], 24), 72);
const handleG = tube([[0.55, 0.55, 0], [0.82, 0.58, 0], [0.86, 0.36, 0], [0.5, 0.25, 0]], 0.045, 0.04, 30, 10);
const cremaG = new THREE.CircleGeometry(0.56, 64);
const cremaTex = canvasTex(512, 512, (x) => {
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, "#c9a27a");
  g.addColorStop(0.75, "#8a5a36");
  g.addColorStop(1, "#4a2a16");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(255,240,220,${rnd(i, 1) * 0.25})`;
    x.beginPath();
    x.arc(rnd(i, 2) * 512, rnd(i, 3) * 512, 1 + rnd(i, 4) * 3, 0, Math.PI * 2);
    x.fill();
  }
});
const plateTableG = new THREE.CylinderGeometry(6, 6, 0.3, 80);
const linenTex = canvasTex(1024, 1024, (x) => {
  x.fillStyle = "#ece6dc";
  x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1024; i += 6) {
    x.strokeStyle = i % 24 ? "rgba(80,70,60,0.16)" : "rgba(80,70,60,0.38)";
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 1024);
    x.moveTo(0, i);
    x.lineTo(1024, i);
    x.stroke();
  }
});

/** A Cup with crema: shared by the art shot and the café table. */
const Cup: React.FC<{ th: WorldProps["th"]; seed?: number }> = ({ th, seed = 700 }) => (
  <group>
    <EMesh g={saucerG} m={{ palette: th.b, seed, angleDeg: 10 }} />
    <group position={[0, 0.1, 0]}>
      <EMesh g={cupG} m={{ palette: th.b, seed: seed + 1, angleDeg: 70, follow: 0.5 }} double />
      <EMesh g={handleG} m={{ palette: th.b, seed: seed + 2 }} />
      <EMesh g={cremaG} m={{ palette: th.hero, seed: seed + 3, map: cremaTex, mapAmt: 0.9 } as never} rot={[-Math.PI / 2, 0, 0]} pos={[0, 0.62, 0]} />
    </group>
  </group>
);

/** The rosetta: stacked leaves growing from the bottom, then one line pulled through them (screen px, centred). */
const Rosetta: React.FC<{ f: number; cx: number; cy: number; R: number; rot: number; ink: string; id: string }> = ({ f, cx, cy, R, rot, ink, id }) => {
  const n = 7;
  const leaves = Array.from({ length: n }, (_, i) => {
    const k = expoOut(clamp01((f - 8 - i * 4) / 10));
    const y = R * (0.55 - i * 0.16);
    const w = R * (0.62 - i * 0.06) * k;
    const h = R * 0.13 * k;
    return k > 0 ? <path key={i} d={`M ${-w} ${y} Q ${-w * 0.4} ${y - h * 2.6} 0 ${y - h * 1.3} Q ${w * 0.4} ${y - h * 2.6} ${w} ${y} Q ${w * 0.5} ${y - h * 0.8} 0 ${y - h * 0.3} Q ${-w * 0.5} ${y - h * 0.8} ${-w} ${y} Z`} /> : null;
  });
  const heart = expoOut(clamp01((f - 8 - n * 4) / 12));
  const pull = clamp01((f - 14 - n * 4) / 10);
  const hy = -R * 0.62;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientTransform={`translate(${((f / 60) % 1) - 0.5} 0)`} spreadMethod="repeat">
          {["#fff7e8", "#f6e2c4", "#ffeef8", "#e8f6ff", "#fff7e8"].map((c, i) => (
            <stop key={i} offset={i / 4} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <g transform={`translate(${cx} ${cy}) rotate(${rot})`} fill={`url(#${id})`} stroke={ink} strokeOpacity={0.25} strokeWidth={1.2}>
        {leaves}
        {heart > 0 ? <path d={`M 0 ${hy + R * 0.16 * heart} C ${-R * 0.2 * heart} ${hy - R * 0.02} ${-R * 0.12 * heart} ${hy - R * 0.2 * heart} 0 ${hy - R * 0.08 * heart} C ${R * 0.12 * heart} ${hy - R * 0.2 * heart} ${R * 0.2 * heart} ${hy - R * 0.02} 0 ${hy + R * 0.16 * heart} Z`} /> : null}
        {pull > 0 ? <rect x={-R * 0.012} y={hy} width={R * 0.024} height={(R * 0.62 + R * 0.6) * pull} fill={ink} fillOpacity={0.45} stroke="none" /> : null}
      </g>
    </svg>
  );
};

export const Art: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const z = 3.3 - f * 0.006;
  const cam = { pos: [0.001, z, 0.002] as V3, target: [0, 0, 0] as V3, fov: 34 };
  // the crema's radius on screen, from the camera height (straight down, centred)
  const R = (0.56 / (z - 0.72)) * (H / 2) / Math.tan(((34 / 2) * Math.PI) / 180);
  const spin = t * 6;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={0.8} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={3}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={plateTableG} m={{ palette: th.a, seed: 690, map: linenTex, mapAmt: 0.7, angleDeg: 4 } as never} pos={[0, -0.15, 0]} />
              <group rotation={[0, (-spin * Math.PI) / 180, 0]}>
                <Cup th={th} />
              </group>
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        <Rosetta f={f} cx={W / 2} cy={H / 2} R={R} rot={spin * 0.4 - 8} ink={th.hero[0][0]} id={`ros${shot.index}`} />
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.4)} out={dur + shot.tail} th={th} top={60} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};

// ---- the café ----------------------------------------------------------------------------------------------------
const facadeTex = canvasTex(1024, 640, (x) => {
  x.fillStyle = "#e9e2d6";
  x.fillRect(0, 0, 1024, 640);
  x.strokeStyle = "rgba(90,70,55,0.35)";
  x.lineWidth = 2;
  for (let y = 0; y < 640; y += 22) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(1024, y);
    x.stroke();
    for (let k = (y / 22) % 2 ? 0 : 40; k < 1024; k += 80) {
      x.beginPath();
      x.moveTo(k, y);
      x.lineTo(k, y + 22);
      x.stroke();
    }
  }
});
const stripeTex = canvasTex(512, 64, (x) => {
  for (let i = 0; i < 16; i++) {
    x.fillStyle = i % 2 ? "#efe7da" : "#3a2418";
    x.fillRect(i * 32, 0, 32, 64);
  }
});
const tilesTex = canvasTex(1024, 1024, (x) => {
  x.fillStyle = "#e6e0d6";
  x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = "rgba(70,60,50,0.4)";
  x.lineWidth = 3;
  for (let i = 0; i <= 1024; i += 64) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 1024);
    x.moveTo(0, i);
    x.lineTo(1024, i);
    x.stroke();
  }
}, [8, 4]);
const boxG = new THREE.BoxGeometry(1, 1, 1);
const awningG = (() => {
  const g = new THREE.CylinderGeometry(0.6, 0.6, 1, 40, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  return g;
})();
const groundG = new THREE.PlaneGeometry(60, 30);
const bistroG = lathe([[0, 0], [0.35, 0], [0.36, 0.04], [0.06, 0.08], [0.05, 1.0], [0.55, 1.02], [0.56, 1.08], [0, 1.08]], 48);
const potG = lathe(smoothProfile([[0, 0], [0.32, 0], [0.42, 0.6], [0.46, 0.7], [0.44, 0.72]], 16), 40);
const wireG = tube(Array.from({ length: 13 }, (_, i) => [-4.2 + i * 0.7, 4.7 - 0.35 * Math.sin((i / 12) * Math.PI), 1.6] as V3), 0.012, 0.012, 120, 6);
const bulbG = new THREE.SphereGeometry(0.07, 12, 10);

const TABLES: V3[] = [[-2.6, 0, 2.2], [2.7, 0, 2.0]];

export const Cafe: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const p = shot.p ?? {};
  const fromCup = shot.enter === "match";
  const crane = fromCup ? smooth(ramp(f, 0, 44)) : 1;
  const cutAt = Math.round(dur * 0.62);
  const cut = step(f, [cutAt]);
  const cup = TABLES[1];
  const cupTop: V3 = [cup[0], 1.25, cup[2]];
  const wide = { pos: [lerp(1.5, 0.6, f / dur), 2.6, 12.5 - f * 0.02] as V3, target: [0, 2.6, -1.5] as V3 };
  const over = { pos: [cupTop[0] + 0.001, cupTop[1] + 2.6, cupTop[2] + 0.002] as V3, target: cupTop };
  const cam = cut === 0
    ? { pos: wide.pos.map((v, i) => lerp(over.pos[i], v, crane)) as V3, target: wide.target.map((v, i) => lerp(over.target[i], v, crane)) as V3, fov: lerp(34, 36, crane) }
    : { pos: [1.6 - (f - cutAt) * 0.006, 2.3, 8.2 - (f - cutAt) * 0.02] as V3, target: [-0.3, 2.4, -1.5] as V3, fov: 36 };
  const sign = useMemo(() => signTex((p.sign as string) ?? "", th.a[0][0], "#f4ede0"), [p.sign, th]);
  // the customer: along the pavement, turn, through the door
  const walkK = clamp01((f - 10) / (dur * 0.7));
  const along = smooth(clamp01(walkK / 0.62));
  const inward = smooth(clamp01((walkK - 0.6) / 0.4));
  const figPos: V3 = [lerp(-8, -0.2, along), 0, lerp(1.2, -1.9, inward)];
  const figYaw = lerp(Math.PI / 2, Math.PI, inward);
  const gone = walkK >= 0.98;
  const door = smooth(ramp(f, dur * 0.42, dur * 0.56));
  const glow = 0.4 + 0.1 * Math.sin(t * 2);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={9}>
            <Detail.Provider value={ENGRAVE}>
              <EMesh g={groundG} m={{ palette: th.b, seed: 720, map: tilesTex, mapAmt: 0.5, angleDeg: 3 } as never} rot={[-Math.PI / 2, 0, 0]} />
              {/* the facade, its sign, the striped awning and the lit windows */}
              <group position={[0, 0, -2.2]}>
                <EMesh g={boxG} m={{ palette: th.a, seed: 721, map: facadeTex, mapAmt: 0.75, angleDeg: 4 } as never} pos={[0, 2.6, 0]} scale={[9, 5.2, 0.8]} />
                <EMesh g={boxG} m={{ palette: th.a, seed: 722, map: sign, mapAmt: 0.95, angleDeg: 2 } as never} pos={[0, 4.55, 0.45]} scale={[4.2, 0.62, 0.08]} />
                <EMesh g={awningG} m={{ palette: th.a, seed: 723, map: stripeTex, mapAmt: 0.85, angleDeg: 80 } as never} pos={[0, 3.75, 0.9]} scale={[8.4, 0.55, 1.2]} double />
                {[-2.6, 2.6].map((x, i) => (
                  <group key={i}>
                    <EMesh g={boxG} m={{ palette: PALS.amber, seed: 724 + i, foil: 0.12 }} live={{ foilPhase: t * 0.2 + i }} pos={[x, 1.95, 0.42]} scale={[2.4, 2.3, 0.04]} />
                    <EMesh g={boxG} m={{ palette: th.a, seed: 726 + i }} pos={[x, 1.95, 0.46]} scale={[0.08, 2.3, 0.06]} />
                    <EMesh g={boxG} m={{ palette: th.a, seed: 728 + i }} pos={[x, 1.95, 0.46]} scale={[2.4, 0.08, 0.06]} />
                  </group>
                ))}
                {/* the doorway (lit) and the door swinging in */}
                <EMesh g={boxG} m={{ palette: PALS.amber, seed: 730, foil: 0.1 }} live={{ foilPhase: glow }} pos={[0, 1.25, 0.41]} scale={[1.2, 2.5, 0.02]} />
                <group position={[-0.6, 0, 0.46]} rotation={[0, -1.5 * door, 0]}>
                  <EMesh g={boxG} m={{ palette: th.a, seed: 731, angleDeg: 6 }} pos={[0.6, 1.25, 0]} scale={[1.2, 2.5, 0.07]} />
                </group>
              </group>
              {/* string lights for the opening */}
              <EMesh g={wireG} m={{ palette: th.a, seed: 732 }} pos={[0, 0, -2.2]} />
              {Array.from({ length: 12 }, (_, i) => (
                <EMesh key={i} g={bulbG} m={{ palette: th.hero, seed: 733 + i, foil: 0.8 }} live={{ foilPhase: t * 0.5 + i * 0.3 }} pos={[-3.85 + i * 0.7, 4.55 - 0.35 * Math.sin(((i + 0.5) / 12) * Math.PI), -0.6]} />
              ))}
              {/* the terrace: two bistro tables with chairs, a cup on the right one (the match) */}
              {TABLES.map((tp, i) => (
                <group key={i} position={tp}>
                  <Shadow pos={[0, 0.01, 0]} w={2.4} d={2.0} ink={th.a[0][0]} opacity={0.22} />
                  <EMesh g={bistroG} m={{ palette: th.a, seed: 740 + i, foil: 0.15 }} />
                  <Cast id="chair" size={1.5} pos={[-0.95, 0, 0.1]} rot={[0, Math.PI / 2 + 0.3, 0]} pal={th.b} seed={745 + i} />
                  <Cast id="chair" size={1.5} pos={[0.95, 0, -0.1]} rot={[0, -Math.PI / 2 - 0.3, 0]} pal={th.b} seed={747 + i} />
                </group>
              ))}
              <group position={[cup[0], 1.08, cup[2]]} scale={0.32}>
                <Cup th={th} seed={750} />
              </group>
              {/* a potted plant by the door */}
              <group position={[1.3, 0, -1.2]}>
                <EMesh g={potG} m={{ palette: th.b, seed: 760 }} />
                <Cast id="plant" size={1.8} pos={[0, 0.6, 0]} pal={PALS.moss} seed={761} />
              </group>
              {!gone ? <Figure pal={th.hero} phase={(f - 10) / 24} walk={f < 10 ? 0 : 1} pos={figPos} rot={[0, figYaw, 0]} scale={1.05} hat seed={770} /> : null}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={Math.round(dur * 0.3)} out={dur + shot.tail} th={th} top={880} size={70} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
