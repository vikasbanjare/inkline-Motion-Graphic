import React, { useContext, useMemo } from "react";
import { staticFile, useVideoConfig } from "remotion";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { engrave, setU, type EOpts } from "../core/engrave.ts";
import { Detail, RefDepth } from "../core/three.tsx";

type V3 = [number, number, number];

/**
 * A licensed glTF subject (Khronos glTF sample assets, CC0 / CC-BY 4.0, see public/models/CREDITS.md)
 * drawn through the engraving material. The model's base-colour texture becomes the tone under the line screen, which
 * is where the reference film's richness comes from: feathers, fur, petals and grain are in the source, not in the code.
 *
 * Rigged models (the fox) are cloned with SkeletonUtils and posed by an AnimationMixer set to an exact time each frame,
 * so a frame always shows the same pose (deterministic, chunk-safe).
 */
export const Rig: React.FC<{
  url: string;
  size: number; // largest dimension after normalising
  m: Omit<EOpts, "map">;
  pos?: V3;
  rot?: V3;
  /** keep only meshes whose material name passes (drop glass, labels...) */
  keep?: (material: string) => boolean;
  /** per-material overrides (palette per part: leaves green, petals violet) */
  per?: (material: string) => Partial<EOpts>;
  clip?: string;
  time?: number; // seconds into the clip
  foilPhase?: number;
  opacity?: number;
}> = ({ url, size, m, pos, rot, keep, per, clip, time = 0, foilPhase, opacity }) => {
  const { width, height } = useVideoConfig();
  const gltf = useLoader(GLTFLoader, staticFile(url));
  const rd = useContext(RefDepth);
  const dflt = useContext(Detail);
  const { obj, mats, mixer } = useMemo(() => {
    const root = skeletonClone(gltf.scene);
    const mats: THREE.ShaderMaterial[] = [];
    const drop: THREE.Object3D[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (keep && !keep(src.name)) {
        drop.push(mesh);
        return;
      }
      // some models ship without normals (the low-poly fox): give them flat facet normals so light can shape them
      if (!mesh.geometry.attributes.normal) {
        const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
        g.computeVertexNormals();
        mesh.geometry = g;
      }
      const map = src.map ?? null;
      if (map) map.colorSpace = THREE.NoColorSpace;
      const d0 = { ...dflt };
      const ps = d0.periodScale ?? 1;
      delete d0.maps;
      delete d0.gltfFollow;
      delete d0.periodScale;
      delete d0.paint;
      const extra = per ? per(src.name) : {};
      const mat = engrave({ res: [width, height], refDepth: rd, albedoNoise: 0.1, noiseScale: 30, mapAmt: 0.9, ...d0, ...m, ...extra, map, periodFrac: (extra.periodFrac ?? m.periodFrac ?? d0.periodFrac ?? 0.0068) * ps });
      mat.side = THREE.DoubleSide;
      mesh.material = mat;
      mesh.frustumCulled = false; // skinned bounds are the bind pose
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
    let mixer: THREE.AnimationMixer | null = null;
    if (clip) {
      const a = gltf.animations.find((x) => x.name === clip);
      if (a) {
        mixer = new THREE.AnimationMixer(root);
        mixer.clipAction(a).play();
      }
    }
    return { obj: wrap, mats, mixer };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, size, width, height, clip]);
  if (mixer) mixer.setTime(time);
  for (const x of mats) {
    const u: Record<string, number> = {};
    if (foilPhase !== undefined) u.uFoilPhase = foilPhase;
    if (opacity !== undefined) {
      u.uOpacity = opacity;
      x.transparent = opacity < 1;
    }
    setU(x, u);
  }
  return (
    <group position={pos} rotation={rot}>
      <primitive object={obj} />
    </group>
  );
};
