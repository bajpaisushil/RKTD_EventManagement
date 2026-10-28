"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export const STONE = "#efe2c8";
export const STONE_SHADE = "#d6c19a";
export const GOLD = "#c99b24";
export const SAFFRON = "#e8761c";

export function Gold({ roughness = 0.28 }: { roughness?: number }) {
  return <meshStandardMaterial color={GOLD} metalness={0.9} roughness={roughness} />;
}

export function Stone({ shade = false }: { shade?: boolean }) {
  return <meshStandardMaterial color={shade ? STONE_SHADE : STONE} roughness={0.78} />;
}

function towerRadius(t: number, radius: number): number {
  return radius * (1 - 0.8 * t ** 1.35) * (1 + 0.08 * Math.sin(t * Math.PI));
}

// A Nagara-style tower: a curved profile spun around its axis, with flat facets for the ribs.
type ShikharaProps = {
  height: number;
  radius: number;
  position: [number, number, number];
  color?: string;
  map?: THREE.Texture;
};

export function Shikhara({ height, radius, position, color = STONE, map }: ShikharaProps) {
  const radiusAt = (t: number) => towerRadius(t, radius);
  const profile = useMemo(
    () => Array.from({ length: 24 }, (_, i) => new THREE.Vector2(towerRadius(i / 23, radius), (i / 23) * height)),
    [height, radius],
  );

  return (
    <group position={position}>
      <mesh castShadow>
        <latheGeometry args={[profile, 12]} />
        <meshStandardMaterial color={color} map={map} roughness={0.75} flatShading />
      </mesh>
      {[0.22, 0.45, 0.68].map((t) => (
        <mesh key={t} position={[0, t * height, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radiusAt(t) * 1.03, radius * 0.035, 6, 24]} />
          <Gold />
        </mesh>
      ))}
      <mesh position={[0, height + radius * 0.08, 0]}>
        <cylinderGeometry args={[radius * 0.34, radius * 0.34, radius * 0.16, 20]} />
        <Stone shade />
      </mesh>
      <mesh position={[0, height + radius * 0.3, 0]}>
        <sphereGeometry args={[radius * 0.13, 16, 16]} />
        <Gold />
      </mesh>
      <mesh position={[0, height + radius * 0.5, 0]}>
        <coneGeometry args={[radius * 0.06, radius * 0.24, 12]} />
        <Gold />
      </mesh>
    </group>
  );
}

export function Pillar({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, height, 10]} />
        <Stone />
      </mesh>
      <mesh position={[0, height - 0.02, 0]}>
        <boxGeometry args={[0.16, 0.05, 0.16]} />
        <Gold roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Diya({ position, phase }: { position: [number, number, number]; phase: number }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const flicker = 1 + 0.18 * Math.sin(clock.elapsedTime * 9 + phase) * Math.sin(clock.elapsedTime * 3.7 + phase);
    flame.current.scale.set(1, flicker, 1);
  });
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.03, 0.03, 12]} />
        <meshStandardMaterial color="#8a4b1e" roughness={0.9} />
      </mesh>
      <mesh ref={flame} position={[0, 0.045, 0]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Flag({ position }: { position: [number, number, number] }) {
  const cloth = useRef<THREE.Mesh>(null);
  const shape = useMemo(() => {
    const triangle = new THREE.Shape();
    triangle.moveTo(0, 0);
    triangle.lineTo(0.42, -0.1);
    triangle.lineTo(0, -0.22);
    return triangle;
  }, []);
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = 0.35 * Math.sin(clock.elapsedTime * 1.6);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.6, 6]} />
        <Gold />
      </mesh>
      <mesh ref={cloth} position={[0, 0.58, 0]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={SAFFRON} side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
    </group>
  );
}
