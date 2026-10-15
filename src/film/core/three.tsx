import React, { createContext, useContext, useMemo } from "react";
import { staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { engrave, hexToVec3, setU, type EOpts, type Pal } from "./engrave.ts";

type V3 = [number, number, number];

/** Camera distance at which the object-anchored screen has its nominal period (per world). */
export const RefDepth = createContext(15);
/** Engraving defaults applied under every EMesh/Gltf in the subtree (the v2 detailing pass sets hatch/stipple/follow here). */
export type DetailOpts = Partial<EOpts> & { maps?: boolean; gltfFollow?: number; periodScale?: number; paint?: boolean };
export const Detail = createContext<DetailOpts>({});

/** Camera driven by the Remotion frame only (deterministic). roll in radians about the view axis. */
export const Cam: React.FC<{ pos: V3; target: V3; fov?: number; roll?: number }> = ({ pos, target, fov = 35, roll = 0 }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = fov;
  cam.near = 0.05;
  cam.far = 800;
  cam.position.set(...pos);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(new THREE.Vector3(...target));
  cam.updateProjectionMatrix();
  return null;
};

/** Transparent full-frame 3D layer. */
export const World: React.FC<{ children: React.ReactNode; aa?: boolean; style?: React.CSSProperties }> = ({ children, aa = false, style }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      linear
      flat
      style={{ position: "absolute", inset: 0, ...style }}
      gl={{ antialias: aa, alpha: true, preserveDrawingBuffer: true }}
    >
      {children}
    </ThreeCanvas>
  );
};

export type Live = { foilPhase?: number; dim?: number; opacity?: number; atmos?: number; pal?: Pal; key?: [number, number, number]; lift?: number; ambient?: number; keyAmt?: number };

const setPal = (m: THREE.Material, pal?: Pal) => {
  if (!pal) return;
  const u = (m as THREE.ShaderMaterial).uniforms;
  pal.forEach(([h], i) => u.uStops.value[i].copy(hexToVec3(h)));
};

const liveU = (l?: Live) => {
  const u: Record<string, number> = {};
  if (!l) return u;
  if (l.foilPhase !== undefined) u.uFoilPhase = l.foilPhase;
  if (l.dim !== undefined) u.uDim = l.dim;
  if (l.opacity !== undefined) u.uOpacity = l.opacity;
  if (l.atmos !== undefined) u.uAtmos = l.atmos;
  if (l.lift !== undefined) u.uLift = l.lift;
  if (l.ambient !== undefined) u.uAmbient = l.ambient;
  if (l.keyAmt !== undefined) u.uKey = l.keyAmt;
  return u;
};
const setKey = (m: THREE.Material, key?: [number, number, number]) => {
  if (!key) return;
  ((m as THREE.ShaderMaterial).uniforms.uKeyWorld.value as THREE.Vector3).set(...key).normalize();
};

/** One engraved mesh. `m` is fixed per mesh (memoised by geometry); `live` uniforms may change per frame. */
export const EMesh: React.FC<{
  g: THREE.BufferGeometry;
  m: EOpts;
  pos?: V3;
  rot?: V3;
  scale?: number | V3;
  live?: Live;
  double?: boolean;
}> = ({ g, m, pos, rot, scale, live, double }) => {
  const { width, height } = useVideoConfig();
  const rd = useContext(RefDepth);
  const dflt = useContext(Detail);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => {
    const d0 = { ...dflt };
    const ps = d0.periodScale ?? 1;
    delete d0.maps;
    delete d0.gltfFollow;
    delete d0.periodScale;
    delete d0.paint;
    const x = engrave({ res: [width, height], refDepth: rd, ...d0, ...m, periodFrac: (m.periodFrac ?? d0.periodFrac ?? 0.0068) * ps });
    if (double) x.side = THREE.DoubleSide;
    if (m.opacity !== undefined || live?.opacity !== undefined) x.transparent = true;
    return x;
  }, [g, width, height]);
  setU(mat, { uRefDepth: rd, ...liveU(live) }); // depth scale follows the context every frame (framings can change it)
  setPal(mat, live?.pal);
  setKey(mat, live?.key);
  return <mesh geometry={g} material={mat} position={pos} rotation={rot} scale={scale} />;
};

/** CC0 glTF (Poly Haven) through the engraving material; the base-colour map becomes the tone albedo.
 * Normalised: centred on X/Z, bottom at y=0, largest dimension = size. */
export const Gltf: React.FC<{
  url: string;
  size: number;
  m: Omit<EOpts, "map">;
  pos?: V3;
  rot?: V3;
  live?: Live;
  pick?: (name: string, i: number) => boolean;
  perMaterial?: (matName: string) => Partial<EOpts>;
}> = ({ url, size, m, pos, rot, live, pick, perMaterial }) => {
  const { width, height } = useVideoConfig();
  const gltf = useLoader(GLTFLoader, staticFile(url));
  const rd = useContext(RefDepth);
  const dflt = useContext(Detail);
  const { obj, mats } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const mats: THREE.ShaderMaterial[] = [];
    let i = 0;
    const drop: THREE.Object3D[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (pick && !pick(mesh.name, i++)) {
        drop.push(mesh);
        return;
      }
      const src = mesh.material as THREE.MeshStandardMaterial;
      const map = src.map ?? null;
      if (map) map.colorSpace = THREE.NoColorSpace;
      const extra = perMaterial ? perMaterial(src.name) : {};
      const d0 = { ...dflt };
      const gltfFollow = d0.gltfFollow;
      const ps = d0.periodScale ?? 1;
      delete d0.maps;
      delete d0.gltfFollow;
      delete d0.periodScale;
      delete d0.paint;
      // scanned meshes carry bumpy normals: form-following lines would swirl, so they get their own (lower) amount
      const mat = engrave({ res: [width, height], refDepth: rd, albedoNoise: 0.15, noiseScale: 30, mapAmt: 0.8, ...d0, ...(gltfFollow !== undefined ? { follow: gltfFollow } : {}), ...m, ...extra, map, periodFrac: (m.periodFrac ?? extra.periodFrac ?? d0.periodFrac ?? 0.0068) * ps });
      mat.side = THREE.DoubleSide;
      mesh.material = mat;
      mats.push(mat);
    });
    drop.forEach((d) => d.parent?.remove(d));
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const s = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const k = size / Math.max(s.x, s.y, s.z);
    root.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(k);
    return { obj: wrap, mats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, size, width, height]);
  for (const x of mats) {
    setU(x, liveU(live));
    setPal(x, live?.pal);
    setKey(x, live?.key);
  }
  return (
    <group position={pos} rotation={rot}>
      <primitive object={obj} />
    </group>
  );
};

/** Soft contact shadow: a flat radial-alpha disc in the ink colour under an object (the sheet's grounded objects). */
const shadowCache = new Map<string, THREE.CanvasTexture>();
const shadowTex = (ink: string) => {
  let t = shadowCache.get(ink);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, ink + "ff");
  g.addColorStop(0.45, ink + "a0");
  g.addColorStop(1, ink + "00");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  shadowCache.set(ink, t);
  return t;
};
export const Shadow: React.FC<{ pos: V3; w: number; d: number; ink?: string; opacity?: number; rot?: number }> = ({ pos, w, d, ink = "#223344", opacity = 0.28, rot = 0 }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadowTex(ink), transparent: true, depthWrite: false, opacity }), [ink, opacity]);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  return <mesh geometry={geo} material={mat} position={pos} rotation={[-Math.PI / 2, 0, rot]} scale={[w, d, 1]} />;
};

