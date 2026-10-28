"use client";

import { Diya, Flag, Gold, Pillar, Shikhara, Stone } from "./parts";

const PLINTH_TIERS: [width: number, height: number, depth: number][] = [
  [3.4, 0.22, 2.7],
  [3.05, 0.2, 2.35],
  [2.7, 0.18, 2.05],
];

const heightBelow = (index: number) => PLINTH_TIERS.slice(0, index).reduce((sum, [, height]) => sum + height, 0);

export function Temple() {
  const plinthTop = heightBelow(PLINTH_TIERS.length);

  return (
    <group>
      {PLINTH_TIERS.map(([width, height, depth], index) => (
        <mesh key={index} position={[0, heightBelow(index) + height / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[width, height, depth]} />
          <Stone shade={index % 2 === 0} />
        </mesh>
      ))}

      {[0, 1, 2, 3].map((step) => (
        <mesh key={step} position={[0, plinthTop - 0.08 - step * 0.15, 1.1 + step * 0.17]} receiveShadow>
          <boxGeometry args={[0.95, 0.15, 0.2]} />
          <Stone />
        </mesh>
      ))}

      <group position={[0, plinthTop, -0.35]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.3, 1.1, 1.25]} />
          <Stone />
        </mesh>
        <mesh position={[0, 1.13, 0]}>
          <boxGeometry args={[1.42, 0.07, 1.37]} />
          <Gold roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0.63]}>
          <planeGeometry args={[0.42, 0.72]} />
          <meshBasicMaterial color="#ffb347" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.5, 1]} color="#ffb347" intensity={3} distance={3.5} decay={2} />
        <Shikhara height={2.25} radius={0.72} position={[0, 1.16, 0]} />
        <Flag position={[0, 3.62, 0]} />
      </group>

      <group position={[0, plinthTop, 0.62]}>
        {[-0.6, -0.2, 0.2, 0.6].map((x) => (
          <Pillar key={x} position={[x, 0, 0.38]} height={0.78} />
        ))}
        <mesh position={[0, 0.82, 0.05]} castShadow>
          <boxGeometry args={[1.5, 0.08, 0.95]} />
          <Stone shade />
        </mesh>
        <mesh position={[0, 1.05, 0.05]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.82, 0.42, 4]} />
          <Stone />
        </mesh>
        <mesh position={[0, 1.32, 0.05]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <Gold />
        </mesh>
      </group>

      <Shikhara height={0.95} radius={0.32} position={[-1.12, plinthTop, -0.72]} />
      <Shikhara height={0.95} radius={0.32} position={[1.12, plinthTop, -0.72]} />

      {[-1.25, -0.9, -0.55, 0.55, 0.9, 1.25].map((x, index) => (
        <Diya key={x} position={[x, plinthTop + 0.015, 1.0]} phase={index * 1.7} />
      ))}
    </group>
  );
}
