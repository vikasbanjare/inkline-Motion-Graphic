import { createNoise2D, createNoise3D } from "simplex-noise";

/** Seeded PRNG (mulberry32). Every random choice in the ensemble goes through one of these, so frames are repeatable. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const n2 = new Map<number, ReturnType<typeof createNoise2D>>();
const n3 = new Map<number, ReturnType<typeof createNoise3D>>();
/** Seeded simplex noise (simplex-noise, MIT); cached per seed. */
export const noise2 = (seed: number) => {
  let n = n2.get(seed);
  if (!n) n2.set(seed, (n = createNoise2D(rng(seed))));
  return n;
};
export const noise3 = (seed: number) => {
  let n = n3.get(seed);
  if (!n) n3.set(seed, (n = createNoise3D(rng(seed))));
  return n;
};

/** Hand-drawn "boil": a seed that changes every `hold` frames (2 = animated on twos). */
export const boil = (f: number, hold = 2, base = 0) => base + Math.floor(f / hold) * 7919;
