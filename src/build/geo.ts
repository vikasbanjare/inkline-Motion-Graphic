import * as THREE from "three";

/**
 * The subject builder: make any object in the house style from a few honest primitives. The engraving shader does the
 * rest (line screen, two inks, foil), so a turned profile or an extruded outline already reads as an engraved plate.
 * Build what the script needs (a kettle, a rocket, a turbine) instead of borrowing a model that only nearly fits.
 *
 *   lathe     anything turned on an axis: cups, kettles, drums, bottles, planets' rings, domes, vases, lenses
 *   extrude   anything flat with thickness: signs, leaves, keys, tickets, gears, letters in plain type
 *   tube      anything that follows a path: branches, spouts, cables, handles, orbits, steam, roads
 *   leaf      a leaf with a midrib fold and a wavy edge (coffee, tea, laurel, banana...)
 *   blob      an organic lump: a cherry, a bean, a stone, a cloud, a planet with relief
 *   gear      a toothed wheel
 *   scatter   deterministic positions for many copies (beans, stars, seeds, crowds)
 * All geometry is made once (call these at module level or in useMemo), never per frame.
 */
export type P2 = [number, number];
export type P3 = [number, number, number];

/** A turned solid from a profile of [radius, height] points, bottom to top. */
export const lathe = (profile: P2[], segments = 64) => {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), segments);
  g.computeVertexNormals();
  return g;
};

/** A smooth profile through key points (Catmull-Rom), for lathe(): give 5-10 points, get a curved silhouette. */
export const smoothProfile = (keys: P2[], n = 48): P2[] => {
  const c = new THREE.CatmullRomCurve3(keys.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, "centripetal");
  return c.getPoints(n).map((p) => [p.x, p.y]);
};

/** A flat shape with depth and a soft bevel. Outline in units, counter-clockwise; holes optional. */
export const extrude = (outline: P2[], depth = 0.1, bevel = 0.02, holes: P2[][] = []) => {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
  g.center();
  g.computeVertexNormals();
  return g;
};

/** A tube along a smooth path; radius may taper (r0 at the start, r1 at the end). */
export const tube = (path: P3[], r0 = 0.05, r1 = r0, segments = 96, radial = 14) => {
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const g = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  if (r0 !== 1 || r1 !== 1) {
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const frames = curve.computeFrenetFrames(segments, false);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const c = curve.getPointAt(t);
      const r = r0 + (r1 - r0) * t;
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).normalize().multiplyScalar(r).add(c);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
      void frames;
    }
    g.computeVertexNormals();
  }
  return g;
};

/** A leaf: length along +y, width w, folded along the midrib, with a wavy margin and a slight curl back. */
export const leaf = (len = 1, w = 0.42, fold = 0.35, wave = 0.04, curl = 0.25, seg = 28) => {
  const g = new THREE.PlaneGeometry(w, len, 12, seg);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + len / 2; // 0..len
    const t = y / len;
    const half = (w / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.02))), 0.85) * (1 - 0.15 * t); // pointed tip
    const u = x / (w / 2); // -1..1
    const xx = u * half + wave * Math.sin(t * 22 + u) * Math.abs(u) * half * 3;
    const z = -fold * Math.abs(u * half) + curl * t * t;
    p.setXYZ(i, xx, y, z);
  }
  g.computeVertexNormals();
  return g;
};

/** An organic lump: a sphere squashed to (sx, sy, sz) with low-frequency relief. */
export const blob = (sx = 1, sy = 1, sz = 1, relief = 0.04, seed = 1, seg = 40) => {
  const g = new THREE.SphereGeometry(0.5, seg, Math.round(seg * 0.75));
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const n = Math.sin(v.x * 7 + seed) * Math.sin(v.y * 6 + seed * 1.7) * Math.sin(v.z * 8 + seed * 2.3);
    v.multiplyScalar(1 + relief * n);
    p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  g.computeVertexNormals();
  return g;
};

/** A toothed wheel (flat, extruded), radius r, n teeth, tooth depth d. */
export const gear = (r = 1, n = 18, d = 0.12, depth = 0.15, hole = 0.25) => {
  const pts: P2[] = [];
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2;
    const rr = i % 4 === 1 || i % 4 === 2 ? r : r - d;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const h: P2[] = Array.from({ length: 32 }, (_, i) => [Math.cos((-i / 32) * Math.PI * 2) * hole, Math.sin((-i / 32) * Math.PI * 2) * hole]);
  return extrude(pts, depth, 0.01, [h]);
};

/** Deterministic pseudo-random in 0..1. */
export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** n deterministic samples from fn(i, r) where r(k) is a seeded random 0..1. */
export const scatter = <T,>(n: number, seed: number, fn: (i: number, r: (k: number) => number) => T): T[] => Array.from({ length: n }, (_, i) => fn(i, (k) => rnd(i * 13 + k, seed)));

// ---- canvas textures: the tone under the line screen (light = paper, dark = ink) ---------------------------------------
export const canvasTex = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  draw(x);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
};
/** Plain type on a board (a shop sign, a label). The brand NAME only, set in the film's serif: never a drawn logo. */
export const signTex = (text: string, bg = "#1c1a18", fg = "#f4efe6", w = 1024, h = 180) =>
  canvasTex(w, h, (x) => {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = fg;
    x.font = `600 ${Math.min(h * 0.6, (w * 1.7) / Math.max(1, text.length))}px Newsreader, serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, h * 0.54);
  });
/** Rings / grooves (a record, a burr, a tree's end grain, a planet's bands when used on a sphere). */
export const bandsTex = (n = 24, light = "#ece6dc", dark = "#5a4a3c", vertical = false) =>
  canvasTex(512, 512, (x) => {
    x.fillStyle = light;
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < n; i++) {
      x.fillStyle = dark;
      x.globalAlpha = 0.25 + 0.5 * rnd(i, 3);
      const t = (i / n) * 512, th = 4 + 10 * rnd(i, 5);
      if (vertical) x.fillRect(t, 0, th, 512);
      else x.fillRect(0, t, 512, th);
    }
    x.globalAlpha = 1;
  });
/** Wood grain. */
export const woodTex = (light = "#ece4d6", dark = "#5a3c28") =>
  canvasTex(1024, 1024, (x) => {
    x.fillStyle = light;
    x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = dark;
      x.globalAlpha = i % 5 ? 0.3 : 0.6;
      x.lineWidth = i % 5 ? 2 : 4;
      x.beginPath();
      for (let k = 0; k <= 64; k++) {
        const y = i * 15 + 8 * Math.sin(k * 0.21 + i * 0.7) + 14 * Math.sin(k * 0.05 + i);
        if (k) x.lineTo(k * 16, y);
        else x.moveTo(0, y);
      }
      x.stroke();
    }
    x.globalAlpha = 1;
  });
