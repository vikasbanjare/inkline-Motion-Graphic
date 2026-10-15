import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { mixPal } from "../../film/core/look.ts";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { BEAN, Backdrop, SayIt, WorldLook, clamp01, lerp, smooth, step, type V3, type WorldProps } from "../../kit/common.tsx";
import { PALS } from "../../kit/theme.ts";
import { blob, leaf, rnd, tube } from "../../build/geo.ts";

/**
 * Velmora 1-2: the origin. A coffee branch (opposite pairs of glossy, wavy-edged leaves; cherries clustered tight at
 * the nodes) grows along the frame; one cherry ripens from green to red. Then a macro on that cherry: it splits and
 * two beans turn out of it, flat faces together, the way they grow.
 */
const GREEN = PALS.moss;
const RED = PALS.cherry;
const UNRIPE: typeof RED = [["#2c4a14", 0], ["#6f9a2c", 0.42], ["#c8dc8a", 0.8], ["#f0f5dc", 1]];

// the branch: a gentle S across the frame, nodes along it
const STEM: V3[] = [[-6.5, -1.6, -0.6], [-3.5, -0.6, -0.2], [-0.5, 0.2, 0], [2.5, 0.7, -0.2], [6.5, 1.6, -0.8]];
const stemCurve = new THREE.CatmullRomCurve3(STEM.map((p) => new THREE.Vector3(...p)));
const stemG = tube(STEM, 0.07, 0.04, 160, 12);
const leafG = leaf(1.6, 0.62, 0.3, 0.05, 0.3);
const smallLeafG = leaf(1.0, 0.4, 0.3, 0.05, 0.25);
const cherryG = blob(1, 1.1, 1, 0.03, 4);
const NODES = Array.from({ length: 9 }, (_, i) => 0.06 + i * 0.105);

/** Frame (local) when the branch has grown to parameter u (0..1): it grows from left to right. */
const reach = (f: number, g0: number) => clamp01((f - g0) / 52);

export const Branch: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const g0 = shot.enter === "lines" ? 26 : 0;
  const t = f / 24;
  const dur = shot.dur;
  const cutAt = Math.round(dur * 0.64);
  const cut = step(f, [cutAt]);
  const hero = NODES[4];
  const hp = stemCurve.getPointAt(hero);
  const cam = cut === 0
    ? { pos: [lerp(-1.2, 0.4, f / dur), 0.4, 8.6 - f * 0.012] as V3, target: [0.2, 0.25, 0] as V3, fov: 34 }
    : { pos: [hp.x + 0.6 + (f - cutAt) * 0.006, hp.y + 0.35, 3.3 - (f - cutAt) * 0.008] as V3, target: [hp.x, hp.y - 0.15, hp.z] as V3, fov: 30 };
  const r = reach(f, g0);
  const ripe = shot.enter === "lines" ? smooth(ramp(f, g0 + 50, g0 + 78)) : smooth(ramp(f, dur * 0.12, dur * 0.5));
  const fall = shot.enter === "lines" ? 0 : Math.max(0, f - dur * 0.62) / 24; // seconds since the cherry let go
  const drop = 4.9 * fall * fall;
  const heroPal = useMemo(() => (k: number) => mixPal(UNRIPE, RED, k), []);
  const clusters = useMemo(
    () =>
      NODES.map((u, n) =>
        Array.from({ length: 7 }, (_, k) => {
          const a = (k / 7) * Math.PI * 2 + n;
          return { a, off: [Math.cos(a) * 0.17, -0.1 + Math.sin(a) * 0.15, 0.1 + Math.sin(a * 1.7) * 0.08] as V3, s: 0.24 + 0.05 * rnd(n * 7 + k, 2), ripe: rnd(n * 7 + k, 9) };
        }),
      ),
    [],
  );
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1.2} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={7}>
            <Detail.Provider value={ENGRAVE}>
              {/* the stem draws itself left to right */}
              <group scale={[1, 1, 1]}>
                <EMesh g={stemG} m={{ palette: PALS.espresso, seed: 400, angleDeg: 30, follow: 0.6 }} scale={r > 0.001 ? 1 : 0.0001} />
              </group>
              {NODES.map((u, n) => {
                const p = stemCurve.getPointAt(u);
                const tan = stemCurve.getTangentAt(u);
                const ang = Math.atan2(tan.y, tan.x);
                const k = expoOut(clamp01((r - u) * 6)); // this node has grown
                if (k <= 0) return null;
                const sway = 0.06 * Math.sin(t * 1.3 + n);
                const sizeL = n % 3 === 1 ? smallLeafG : leafG;
                return (
                  <group key={n} position={[p.x, p.y, p.z]} rotation={[0, 0, ang]}>
                    {/* an opposite pair of leaves, unfurling */}
                    <group rotation={[0.5 + sway, 0, Math.PI / 2 + 0.5 - 0.4 * (1 - k)]} scale={k}>
                      <EMesh g={sizeL} m={{ palette: GREEN, seed: 410 + n, angleDeg: 60, follow: 0.7, spec: 0.5 } as never} pos={[0, 0, 0]} double />
                    </group>
                    <group rotation={[-0.5 - sway, 0, -Math.PI / 2 - 0.5 + 0.4 * (1 - k)]} scale={k}>
                      <EMesh g={sizeL} m={{ palette: GREEN, seed: 430 + n, angleDeg: 60, follow: 0.7, spec: 0.5 } as never} double />
                    </group>
                    {/* the cherry cluster hugging the node */}
                    {clusters[n].map((c, j) => {
                      const pop = expoOut(clamp01((r - u) * 6 - 0.4 - j * 0.08));
                      if (pop <= 0) return null;
                      const isHero = n === 4 && j === 0;
                      const pal = isHero ? heroPal(ripe) : c.ripe > 0.45 ? RED : c.ripe > 0.2 ? mixPal(UNRIPE, RED, 0.5) : UNRIPE;
                      return <EMesh key={j} g={cherryG} m={{ palette: RED, seed: 450 + n * 7 + j, foil: isHero ? 0.25 : 0.1, spec: 0.8 } as never} live={{ pal }} pos={isHero ? [0.05 + 0.6 * fall, -0.32 - drop, 0.26] : c.off} scale={(isHero ? 0.3 : c.s) * pop} />;
                    })}
                  </group>
                );
              })}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={g0 + 36} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};

// ---- the split: a cherry opens and two beans turn out of it ----------------------------------------------------
const halfG = (() => {
  const g = new THREE.SphereGeometry(0.5, 48, 32, 0, Math.PI);
  g.scale(1, 1.1, 1);
  g.computeVertexNormals();
  return g;
})();
const pulpG = new THREE.CircleGeometry(0.48, 48);

export const Split: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const open = smooth(ramp(f, 6, 30));
  const turn = smooth(ramp(f, 18, 46));
  const rain = ramp(f, 30, dur);
  const cam = { pos: [0.3 * Math.sin(t * 0.5), 0.25, 4.2 - f * 0.01] as V3, target: [0, 0, 0] as V3, fov: 32 };
  const beans = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: -5 + 10 * rnd(i, 1), z: -3 - 4 * rnd(i, 2), v: 0.6 + rnd(i, 3), at: rnd(i, 4), rx: rnd(i, 5) * 6, ry: rnd(i, 6) * 6 })), []);
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={1.6} lambda={120} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={5}>
            <Detail.Provider value={ENGRAVE}>
              {/* the two halves of the skin part left and right */}
              <group position={[-0.9 * open, 0.1 * open, -0.3 * open]} rotation={[0, Math.PI / 2 - 0.6 * open, 0.2 * open]} scale={1.4}>
                <EMesh g={halfG} m={{ palette: RED, seed: 470, foil: 0.15, spec: 0.8 } as never} double />
                <EMesh g={pulpG} m={{ palette: PALS.amber, seed: 471 }} rot={[0, Math.PI / 2, 0]} />
              </group>
              <group position={[0.9 * open, 0.1 * open, -0.3 * open]} rotation={[0, -Math.PI / 2 + 0.6 * open, -0.2 * open]} scale={1.4}>
                <EMesh g={halfG} m={{ palette: RED, seed: 472, foil: 0.15, spec: 0.8 } as never} double />
                <EMesh g={pulpG} m={{ palette: PALS.amber, seed: 473 }} rot={[0, -Math.PI / 2, 0]} />
              </group>
              {/* the twin beans, flat faces together, turn out and apart */}
              {[0, 1].map((k) => (
                <group key={k} position={[(k ? 0.2 : -0.2) + (k ? 0.35 : -0.35) * turn, 0.15 * turn, 0.4 * turn]} rotation={[0.3 * turn, (k ? Math.PI : 0) + (k ? -1 : 1) * 0.9 * turn + t * 0.2, 0]} scale={1.1 * (0.85 + 0.15 * open)}>
                  <EMesh g={BEAN} m={{ palette: PALS.cream, seed: 480 + k, foil: 0.3, angleDeg: 20, follow: 0.6 }} />
                </group>
              ))}
              {/* a fall of beans behind: the harvest */}
              {beans.map((b, i) => {
                const y = 4 - ((rain * 6 * b.v + b.at * 6) % 9);
                return rain > b.at * 0.6 ? <EMesh key={i} g={BEAN} m={{ palette: PALS.cream, seed: 490 + (i % 9), angleDeg: 20 }} pos={[b.x, y, b.z]} rot={[b.rx + t * 2, b.ry + t, 0]} scale={0.35} /> : null;
              })}
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={14} out={dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
