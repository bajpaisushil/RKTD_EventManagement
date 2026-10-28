"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import { GlowPoints, Instanced, point, writeTransform, type Light, type Placement, type Vec3 } from "./instances";
import { useMotion } from "./motion";

export function Diyas({ positions }: { positions: Vec3[] }) {
  const animate = useMotion();
  const flames = useRef<THREE.InstancedMesh>(null);
  const bases = useMemo<Placement[]>(() => positions.map(([x, y, z]) => ({ position: point(x, y + 0.035, z) })), [positions]);
  const glows = useMemo<Light[]>(() => positions.map(([x, y, z]) => ({ position: point(x, y + 0.14, z), color: "#ffb347" })), [positions]);

  const flicker = (time: number) => {
    const target = flames.current;
    if (!target) return;
    positions.forEach(([x, y, z], index) => {
      const height = 1 + 0.22 * Math.sin(time * 9 + index * 1.7) * Math.sin(time * 3.7 + index);
      writeTransform(target, index, { position: point(x, y + 0.1, z), scale: point(1, 1.7 * height, 1) });
    });
    target.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    flicker(0);
    flames.current?.computeBoundingSphere();
  }, [positions]);

  useFrame(({ clock }) => {
    if (animate) flicker(clock.elapsedTime);
  });

  return (
    <group>
      <Instanced placements={bases}>
        <cylinderGeometry args={[0.11, 0.07, 0.07, 10]} />
        <meshStandardMaterial color="#9a5524" roughness={0.9} />
      </Instanced>
      <instancedMesh ref={flames} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </instancedMesh>
      <GlowPoints lights={glows} size={0.75} />
    </group>
  );
}
