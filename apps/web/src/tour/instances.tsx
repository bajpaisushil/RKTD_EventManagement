"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useMotion } from "./motion";
import { glowTexture } from "./textures";
import { point, type Vec3 } from "./vectors";

export { point, type Vec3 } from "./vectors";

export type Placement = {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
  color?: string;
};

const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();

export function writeTransform(target: THREE.InstancedMesh, index: number, placement: Placement): void {
  scratch.position.set(...placement.position);
  scratch.rotation.set(...(placement.rotation ?? [0, 0, 0]));
  const scale = placement.scale ?? 1;
  if (typeof scale === "number") scratch.scale.setScalar(scale);
  else scratch.scale.set(...scale);
  scratch.updateMatrix();
  target.setMatrixAt(index, scratch.matrix);
  if (placement.color) target.setColorAt(index, scratchColor.set(placement.color));
}

export function Instanced({ placements, children }: { placements: Placement[]; children: ReactNode }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    placements.forEach((placement, index) => writeTransform(target, index, placement));
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [placements]);
  if (placements.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, placements.length]}>
      {children}
    </instancedMesh>
  );
}

// Repeats a multi-part model (each part an offset from the model's origin) at every placement.
export function expand(placements: Placement[], offset: Vec3, partScale: Vec3 | number = 1, rotation: Vec3 = [0, 0, 0]): Placement[] {
  return placements.map((placement) => {
    const scale = typeof placement.scale === "number" ? placement.scale : 1;
    const yaw = placement.rotation?.[1] ?? 0;
    const [x, y, z] = offset;
    const rotatedX = x * Math.cos(yaw) + z * Math.sin(yaw);
    const rotatedZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const part: Vec3 = typeof partScale === "number" ? [partScale, partScale, partScale] : partScale;
    return {
      position: point(placement.position[0] + rotatedX * scale, placement.position[1] + y * scale, placement.position[2] + rotatedZ * scale),
      rotation: point(rotation[0], rotation[1] + yaw, rotation[2]),
      scale: point(part[0] * scale, part[1] * scale, part[2] * scale),
      color: placement.color,
    };
  });
}

export type Light = { position: Vec3; color: string };

export function GlowPoints({ lights, size, opacity = 1, twinkle = false }: { lights: Light[]; size: number; opacity?: number; twinkle?: boolean }) {
  const animate = useMotion();
  const material = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    const color = new THREE.Color();
    result.setAttribute("position", new THREE.Float32BufferAttribute(lights.flatMap((light) => light.position), 3));
    result.setAttribute("color", new THREE.Float32BufferAttribute(lights.flatMap((light) => color.set(light.color).toArray()), 3));
    return result;
  }, [lights]);

  useFrame(({ clock }) => {
    if (twinkle && animate && material.current) material.current.opacity = opacity * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 2.3));
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={material}
        map={glowTexture()}
        size={size}
        sizeAttenuation
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function sag(from: Vec3, to: Vec3, count: number, droop: number): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    return point(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t - droop * 4 * t * (1 - t),
      from[2] + (to[2] - from[2]) * t,
    );
  });
}

export function along(from: Vec3, to: Vec3, spacing: number): Vec3[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const count = Math.max(2, Math.round(length / spacing) + 1);
  return sag(from, to, count, 0);
}

export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export const FESTIVE_COLORS = ["#ffd27a", "#ffd27a", "#ffb347", "#ff6fa8", "#7ee08a", "#ffd27a", "#7fc8ff"];
