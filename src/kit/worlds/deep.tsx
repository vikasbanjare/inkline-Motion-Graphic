import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Cam, Detail, RefDepth, World } from "../../film/core/three.tsx";
import { ENGRAVE } from "../../film/scenes/kit.tsx";
import { castOf } from "../cast.ts";
import { Backdrop, Cast, Rise, SayIt, WorldLook, step, type V3, type WorldProps } from "../common.tsx";

/**
 * DEEP: an underwater world; a school swims past a hero object that turns in the current, all foil, and a big value
 * rises from it like a pearl. Best for: the one number (a fee, a rate, a count), depth, calm, something precious.
 *   cast[0]   the hero object (default shell)
 *   cast[1]   the swimmers (default fish); flora in cast[2] sways at the side
 *   value     the number that rises ({label, value}); or text for a headline instead
 * Opens through a circle from below (its own iris); best left by "dive" (into the hero's iridescence).
 */
export const DeepWorld: React.FC<WorldProps> = ({ f, shot, th, print }) => {
  const dur = shot.dur;
  const t = f / 24;
  const k = expoOut(ramp(f, 0, 20));
  const cutAt = Math.round(dur * 0.47);
  const cut = step(f, [cutAt]);
  const cam = cut === 0
    ? { pos: [-0.3 + f * 0.012, 2.0, 7.6 - f * 0.012] as V3, target: [0, 1.5, 0] as V3, fov: 34 }
    : { pos: [0.4 + (f - cutAt) * 0.012, 2.2, 5.6 - (f - cutAt) * 0.01] as V3, target: [0, 1.8, 0] as V3, fov: 30 };
  const cast = shot.cast ?? [];
  const hero = cast[0] ?? "shell";
  const swim = cast[1] ?? "fish";
  const flora = cast[2] ?? "plant";
  const swimK = castOf(swim);
  const fish = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x0: -7.5 + ((i * 2.3) % 5), v: 0.55 + 0.12 * ((i * 7) % 3), y: 0.35 + ((i * 5) % 3) * 0.28, z: -2.2 - (i % 3) * 0.9, ph: i * 1.7, s: 1.0 + 0.2 * (i % 2) })), []);
  const ownIris = shot.enter === "cut";
  return (
    <WorldLook th={th}>
      <AbsoluteFill style={{ clipPath: ownIris ? `circle(${Math.max(1, 1600 * k)}px at 50% 60%)` : undefined }}>
        <Backdrop f={f} th={th} speed={2} lambda={160} />
        <World aa>
          <Cam {...cam} />
          <RefDepth.Provider value={7}>
            <Detail.Provider value={ENGRAVE}>
              {fish.map((q, i) => {
                const tt = f / 24 + q.ph;
                const x = q.x0 + (q.v * f) / 24;
                const y = q.y + 0.18 * Math.sin(tt * 0.9);
                const z = q.z + 0.5 * Math.sin(tt * 0.55 + q.ph);
                const dz = 0.5 * 0.55 * Math.cos(tt * 0.55 + q.ph);
                const yaw = Math.atan2(-dz, q.v) + 0.12 * Math.sin(tt * 7 + q.ph);
                return <Cast key={i} id={swim} size={swimK.kind === "swimmer" ? q.s : q.s * 0.7} pos={[x, y, z]} rot={[0, Math.PI / 2 + yaw, 0.1 * Math.cos(tt * 0.9)]} pal={th.b} m={{ atmos: 0.25 + 0.1 * (i % 2) }} seed={90 + i} />;
              })}
              <Cast id={flora} size={3.6} pos={[-3.4, -0.6, 0.6]} rot={[0, 0.4, 0]} pal={th.a} seed={98} />
              <Cast id={hero} pos={[0.2, 0, 0]} rot={[-0.5 + 0.4 * k, 0.6 + t * 0.25, 0]} pal={th.hero} foil={0.95} foilPhase={t * 0.35} seed={99} />
            </Detail.Provider>
          </RefDepth.Provider>
        </World>
        {print ? null : <Rise v={shot.value} f={f} at={22} out={dur + shot.tail} ink={th.a[0][0]} id={`rise${shot.index}`} />}
        {print || shot.value ? null : <SayIt say={shot.text} f={f} at={20} out={dur + shot.tail} th={th} />}
      </AbsoluteFill>
    </WorldLook>
  );
};
