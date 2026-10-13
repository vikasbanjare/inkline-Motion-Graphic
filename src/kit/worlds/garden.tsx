import React from "react";
import { AbsoluteFill } from "remotion";
import { expoOut } from "../../ensemble/score.ts";
import { Cam, Detail, EMesh, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { castOf } from "../cast.ts";
import { PALS } from "../theme.ts";
import { Backdrop, CHERRY, Cast, Figure, SayIt, Sprout, WorldLook, grow, step, type V3, type WorldProps } from "../common.tsx";

/**
 * GARDEN: a hedge grows in from the right, foreground branches sweep in from the frame edges, a hero crosses it.
 * Best for: origin, growth, nature, rewards, a beginning.
 *   cast[0]      the hero: a walker (fox) or "figure" (the mannequin) walks across; an object stands centre-right
 *   cast[1..]    flora (default plant + flowers)
 *   p.cherries   true: red cherries on the hedge (coffee, fruit, harvest)
 *   p.walk       "walk" | "run" (walker clip)
 * Camera: a slow dolly, one scale-step to a closer framing at 62 % of the shot.
 */
const BUSH_X = [-5.5, -3.2, -1.0, 1.4, 3.6, 5.8];
const FLOWER_X = [-4.4, -2.0, 2.2, 4.6];

export const GardenWorld: React.FC<WorldProps & { bare?: boolean; framing?: number }> = ({ f, shot, th, bare, framing, print }) => {
  const g0 = shot.enter === "lines" ? 30 : 0; // the opening's disc reveals the world first
  const t = f / 24;
  const cutAt = Math.round(shot.dur * 0.62);
  const cut = framing ?? step(f, [cutAt]);
  const fc = f - g0;
  const cam = cut === 0
    ? { pos: [0.2 + (fc - 10) * 0.008, 1.25, 6.9 - (fc - 10) * 0.012] as V3, target: [0.2, 1.0, 0] as V3, fov: 34 }
    : { pos: [0.4 + (f - cutAt) * 0.01, 1.05, 4.0 - (f - cutAt) * 0.006] as V3, target: [0.5, 0.9, 0] as V3, fov: 32 };
  const sprout = (x: number, delay = 0) => grow(f, g0 + 4 + (6 - x) * 2.2 + delay);
  const sweep = (delay: number) => expoOut(Math.min(1, Math.max(0, (f - g0 - 10 - delay) / 26)));
  const cast = shot.cast ?? ["fox"];
  const hero = cast[0];
  const flora = cast.slice(1).length ? cast.slice(1) : ["plant", "flowers"];
  const fA = flora[0], fB = flora[1] ?? flora[0];
  const heroK = hero === "figure" ? null : castOf(hero);
  const walkX = -4.6 + (fc - 18) * 0.042;
  const open = hero === "figure" ? 1.6 : 0; // keep the path clear when a person walks through
  const cherries = !!shot.p?.cherries;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        {bare ? null : (
          <>
            <Backdrop f={f} th={th} />
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <circle cx={1500} cy={520} r={700} fill={th.disc} />
            </svg>
          </>
        )}
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={6}>
            <Detail.Provider value={ENGRAVE}>
              {BUSH_X.map((x, i) => (
                <Sprout key={`b${i}`} at={[x, -0.2, -3.2 - (i % 2)]} g={sprout(x)} lean={i % 2 ? 1 : -1}>
                  <Cast id={fA} size={3.2} rot={[0, i * 1.3, 0]} pal={th.a} m={{ atmos: 0.35 }} seed={10 + i} />
                  {cherries
                    ? Array.from({ length: 7 }, (_, k) => (
                        <EMesh key={k} g={CHERRY} m={{ palette: PALS.cherry, seed: 300 + i * 7 + k, foil: 0.15 }} pos={[Math.sin(k * 2.1 + i) * 0.7, 1.2 + ((k * 37) % 9) * 0.16, Math.cos(k * 1.7 + i) * 0.5 + 0.3]} scale={0.16 + 0.03 * (k % 3)} />
                      ))
                    : null}
                </Sprout>
              ))}
              {FLOWER_X.filter((x) => !open || Math.abs(x) > 3).map((x, i) => (
                <Sprout key={`f${i}`} at={[x, -0.1, -1.6]} g={sprout(x, 6)} lean={i % 2 ? -1 : 1}>
                  <Cast id={fB} size={2.4} rot={[0, i * 1.7 + t * 0.05, 0]} pal={fB === fA ? th.a : th.b} m={{ atmos: 0.2 }} seed={20 + i} />
                </Sprout>
              ))}
              {hero === "figure" ? (
                <Figure pal={th.hero} phase={fc / 26} pos={[-3.6 + fc * 0.03, 0, -0.1]} rot={[0, Math.PI / 2 - 0.35, 0]} scale={0.9} />
              ) : heroK && heroK.kind === "walker" ? (
                <Cast id={hero} pos={[walkX, 0, -0.2]} rot={[0, Math.PI / 2 - 0.25, 0]} clip={(shot.p?.walk as string) === "run" ? "Run" : "Walk"} time={t} pal={th.hero} foilPhase={t * 0.15} />
              ) : heroK ? (
                <Sprout at={[1.2, 0, 0]} g={grow(f, g0 + 20, 18)}>
                  <Cast id={hero} rot={[0, 0.4 + t * 0.2, 0]} pal={th.hero} foilPhase={t * 0.2} seed={9} />
                </Sprout>
              ) : null}
              {/* foreground branches sweep in from the frame edges */}
              <group position={[-6 * (1 - sweep(0)) - open, -1.2 * (1 - sweep(0)) - open * 0.5, 0]} rotation={[0, 0, 0.5 * (1 - sweep(0))]}>
                <Cast id={fA} size={4.4} pos={[-3.0, -0.6, 1.4]} rot={[0, 0.6 + t * 0.02, 0]} pal={th.a} seed={31} />
              </group>
              <group position={[5 * (1 - sweep(4)) + open, -1 * (1 - sweep(4)) - open * 0.4, 0]} rotation={[0, 0, -0.4 * (1 - sweep(4))]}>
                <Cast id={fB} size={2.8} pos={[2.6, -0.3, 1.0]} rot={[0, -0.4, 0]} pal={fB === fA ? th.a : th.b} seed={32} />
              </group>
              <group position={[6 * (1 - sweep(8)) + open, -1.4 * (1 - sweep(8)) - open * 0.5, 0]} rotation={[0, 0, -0.5 * (1 - sweep(8))]}>
                <Cast id={fA} size={3.8} pos={[3.8, -0.9, 2.2]} rot={[0, 2.2, 0]} pal={th.a} seed={33} />
              </group>
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <SayIt say={shot.text} f={f} at={g0 + 32} out={shot.dur + shot.tail} th={th} plate />}
      </AbsoluteFill>
    </WorldLook>
  );
};
