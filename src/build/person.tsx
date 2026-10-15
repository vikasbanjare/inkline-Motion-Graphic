import React from "react";
import * as THREE from "three";
import { EMesh } from "../film/core/three.tsx";
import type { EOpts, Pal } from "../film/core/engrave.ts";
import { blob, lathe, smoothProfile, tube } from "./geo.ts";

/**
 * A person in the house style: an engraved figure with natural proportions (about 7.5 heads, 1.8 units tall, feet
 * at y = 0), tapered limbs, a fitted coat that flares and swings, trousers, shoes, hands, a head with hair, nose and
 * ears, and an optional fedora.
 *
 * The walk is a proper cycle, driven by `phase` (one full cycle = two steps):
 *   thighs swing ±24°, knees fold in the swing phase and stay soft in stance, the feet roll heel to toe;
 *   the pelvis bobs twice per cycle, sways side to side and turns with the leading leg;
 *   the shoulders turn against the pelvis, the arms swing opposite the legs with relaxed elbows.
 * Feet don't slide when the figure moves STRIDE * scale units per unit of phase: drive phase from distance
 * (phase = distance / (STRIDE * scale)), never from time alone.
 */
export const STRIDE = 1.42;

type V3 = [number, number, number];
const limb = (len: number, r0: number, r1: number) => tube([[0, 0, 0], [0, -len * 0.5, 0.01], [0, -len, 0]], r0, r1, 16, 14);
const G = (() => {
  const torso = lathe(smoothProfile([[0.0, 0.0], [0.15, 0.0], [0.155, 0.12], [0.14, 0.24], [0.16, 0.36], [0.19, 0.48], [0.2, 0.56], [0.17, 0.62], [0.08, 0.66], [0.0, 0.67]], 30), 40);
  torso.scale(1, 1, 0.68);
  const coat = lathe(smoothProfile([[0.21, 0.0], [0.205, -0.15], [0.18, -0.36], [0.2, -0.55], [0.24, -0.8], [0.27, -0.98]], 24), 40);
  coat.scale(1, 1, 0.78);
  const collar = lathe([[0.1, 0], [0.14, 0.02], [0.12, 0.08], [0.09, 0.09]], 30);
  const hips = blob(0.34, 0.2, 0.24, 0.0, 3);
  const head = blob(0.19, 0.24, 0.21, 0.01, 5);
  const hair = (() => {
    const g = new THREE.SphereGeometry(0.105, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55);
    g.scale(1, 1.05, 1.08);
    return g;
  })();
  const nose = new THREE.ConeGeometry(0.018, 0.05, 10);
  nose.rotateX(Math.PI / 2 + 0.3);
  const ear = blob(0.02, 0.05, 0.035, 0, 2);
  const neck = new THREE.CylinderGeometry(0.045, 0.055, 0.1, 16);
  const brim = lathe([[0.0, 0], [0.19, 0], [0.2, 0.012], [0.17, 0.008], [0.0, 0.01]], 36);
  brim.scale(1, 1, 0.9);
  const crown = lathe(smoothProfile([[0.12, 0], [0.122, 0.06], [0.115, 0.11], [0.08, 0.135], [0.0, 0.12]], 16), 36);
  const band = new THREE.CylinderGeometry(0.123, 0.123, 0.025, 36, 1, true);
  return {
    torso, coat, collar, hips, head, hair, nose, ear, neck, brim, crown, band,
    thigh: limb(0.45, 0.085, 0.06),
    shin: limb(0.43, 0.058, 0.04),
    upper: limb(0.3, 0.052, 0.042),
    fore: limb(0.27, 0.042, 0.032),
    hand: blob(0.06, 0.1, 0.035, 0.02, 7),
    shoe: blob(0.1, 0.075, 0.27, 0.01, 4),
  };
})();

export type PersonPals = { coat: Pal; trousers?: Pal; skin?: Pal; hair?: Pal; hat?: Pal };

export const Person: React.FC<{
  pals: PersonPals;
  phase: number;
  /** 0 = standing still, 1 = full walk */
  walk?: number;
  pos?: V3;
  rot?: V3;
  scale?: number;
  seed?: number;
  hat?: boolean;
  /** forearm raised as if holding a cup */
  hold?: boolean;
}> = ({ pals, phase, walk = 1, pos, rot, scale = 1, seed = 800, hat = false, hold = false }) => {
  const skin = pals.skin ?? ([["#5a3a2a", 0], ["#a8765a", 0.42], ["#e6c2a6", 0.8], ["#f7e8dc", 1]] as Pal);
  const trousers = pals.trousers ?? pals.coat;
  const hairP = pals.hair ?? trousers;
  const hatP = pals.hat ?? trousers;
  const m = (p: Pal, k: number, extra: Partial<EOpts> = {}) => ({ palette: p, seed: seed + k, follow: 0.55, angleDeg: 10, ...extra }) as EOpts;
  const a = Math.PI * 2 * phase;
  const w = walk;
  // legs: thigh swing, knee folds in swing (thigh moving forward = cos > 0), foot rolls
  const legPose = (s: number) => {
    const th = 0.42 * Math.sin(a + s) * w;
    const sw = Math.cos(a + s);
    const knee = (0.08 + 0.95 * Math.pow(Math.max(0, sw), 1.6) + 0.1 * Math.max(0, -Math.sin(a + s))) * w + 0.04;
    const foot = (-0.25 * Math.sin(a + s) + 0.35 * Math.max(0, sw) * Math.max(0, Math.sin(a + s + 0.6))) * w;
    return { th, knee, foot };
  };
  const L = legPose(0), R = legPose(Math.PI);
  const bob = 0.022 * Math.cos(2 * a) * w;
  const sway = 0.018 * Math.sin(a) * w;
  const hipYaw = 0.12 * Math.sin(a) * w;
  const shoulderYaw = -0.16 * Math.sin(a) * w;
  const lean = 0.05 * w;
  const armSwing = (s: number) => -0.36 * Math.sin(a + s) * w;
  const elbow = (s: number) => 0.22 + 0.25 * Math.max(0, -Math.sin(a + s)) * w;
  const leg = (p: { th: number; knee: number; foot: number }, x: number, k: number) => (
    <group position={[x, 0, 0]} rotation={[-p.th, 0, 0]}>
      <EMesh g={G.thigh} m={m(trousers, k)} />
      <group position={[0, -0.45, 0]} rotation={[p.knee, 0, 0]}>
        <EMesh g={G.shin} m={m(trousers, k + 1)} />
        <group position={[0, -0.45, 0]} rotation={[-p.knee + p.th + p.foot, 0, 0]}>
          <EMesh g={G.shoe} m={m(hatP, k + 2, { spec: 0.6 } as Partial<EOpts>)} pos={[0, -0.025, 0.07]} />
        </group>
      </group>
    </group>
  );
  const arm = (s: number, x: number, k: number, holdIt: boolean) => (
    <group position={[x, 0, 0]} rotation={[holdIt ? -0.25 : armSwing(s), 0, x > 0 ? -0.06 : 0.06]}>
      <EMesh g={G.upper} m={m(pals.coat, k)} />
      <group position={[0, -0.3, 0]} rotation={[holdIt ? -1.5 : -elbow(s), 0, 0]}>
        <EMesh g={G.fore} m={m(pals.coat, k + 1)} />
        <EMesh g={G.hand} m={m(skin, k + 2)} pos={[0, -0.31, 0.01]} />
      </group>
    </group>
  );
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* pelvis: bob, sway, turn */}
      <group position={[sway, 0.95 + bob, 0]} rotation={[0, hipYaw, 0]}>
        <EMesh g={G.hips} m={m(trousers, 1)} />
        {leg(L, -0.1, 10)}
        {leg(R, 0.1, 20)}
        {/* torso turns against the pelvis, leans a little into the walk */}
        <group rotation={[lean, shoulderYaw - hipYaw, -sway * 1.5]}>
          <EMesh g={G.torso} m={m(pals.coat, 2)} pos={[0, 0.0, 0]} />
          {/* the coat hangs from the chest and swings with the legs */}
          <group position={[0, 0.48, 0]} rotation={[0.04 * Math.sin(2 * a) * w - lean * 0.6, -shoulderYaw * 0.3, 0]}>
            <EMesh g={G.coat} m={m(pals.coat, 3, { follow: 0.7 })} double />
          </group>
          <EMesh g={G.collar} m={m(pals.coat, 4)} pos={[0, 0.6, 0]} />
          <group position={[0, 0.555, 0]}>
            {arm(Math.PI, -0.215, 30, false)}
            {arm(0, 0.215, 40, hold)}
          </group>
          {/* head stays level and faces the walk */}
          <group position={[0, 0.7, 0.01]} rotation={[-lean * 0.8, -shoulderYaw * 0.7, sway]}>
            <EMesh g={G.neck} m={m(skin, 5)} pos={[0, -0.03, 0]} />
            <EMesh g={G.head} m={m(skin, 6)} pos={[0, 0.12, 0.01]} />
            <EMesh g={G.hair} m={m(hairP, 7)} pos={[0, 0.15, -0.012]} />
            <EMesh g={G.nose} m={m(skin, 8)} pos={[0, 0.115, 0.108]} />
            <EMesh g={G.ear} m={m(skin, 9)} pos={[-0.098, 0.12, 0]} />
            <EMesh g={G.ear} m={m(skin, 9)} pos={[0.098, 0.12, 0]} />
            {hat ? (
              <group position={[0, 0.185, -0.01]} rotation={[-0.08, 0, 0]}>
                <EMesh g={G.brim} m={m(hatP, 11)} double />
                <EMesh g={G.crown} m={m(hatP, 12)} pos={[0, 0.005, 0]} />
                <EMesh g={G.band} m={m(pals.coat, 13, { foil: 0.3 } as Partial<EOpts>)} pos={[0, 0.02, 0]} double />
              </group>
            ) : null}
          </group>
        </group>
      </group>
    </group>
  );
};
