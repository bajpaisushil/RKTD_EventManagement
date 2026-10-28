"use client";

import { Stars } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { Block, Chhatris, GoldBand, STAIRS_FOOT } from "./GrandTemple";
import { GlowPoints, Instanced, along, point, sag, seeded, type Light, type Placement, type Vec3 } from "./instances";
import { useMotion } from "./motion";
import { glowTexture, signTexture, skyMaterial } from "./textures";

export const GARBA = { x: 0, z: 32, radius: 9.5 };
const GATE_Z = 60;
const PATH_END = 92;
const STONE = "#d9cfbd";

function Sky() {
  const animate = useMotion();
  const material = useMemo(() => skyMaterial(), []);
  return (
    <group>
      <mesh material={material} renderOrder={-1}>
        <sphereGeometry args={[420, 32, 16]} />
      </mesh>
      <Stars radius={260} depth={60} count={1800} factor={7} saturation={0} fade speed={animate ? 0.4 : 0} />
      <group position={[-95, 92, -230]}>
        <mesh>
          <sphereGeometry args={[11, 32, 32]} />
          <meshBasicMaterial color="#fdf3e4" toneMapped={false} fog={false} />
        </mesh>
        <sprite scale={[120, 120, 1]}>
          <spriteMaterial map={glowTexture()} color="#ffe2a8" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      </group>
    </group>
  );
}

function Lawn() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[240, 64]} />
        <meshStandardMaterial color="#2a4a2d" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, (STAIRS_FOOT + GARBA.z - GARBA.radius) / 2]}>
        <boxGeometry args={[17, 0.06, GARBA.z - GARBA.radius - STAIRS_FOOT]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.03, (GARBA.z + GARBA.radius + PATH_END) / 2]}>
        <boxGeometry args={[4.4, 0.06, PATH_END - GARBA.z - GARBA.radius]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
      <mesh position={[-12.6, 0.03, GARBA.z]}>
        <boxGeometry args={[7.5, 0.06, 3.2]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
      <mesh position={[12.6, 0.03, GARBA.z]}>
        <boxGeometry args={[7.5, 0.06, 3.2]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Hedges() {
  const hedges = useMemo<Placement[]>(
    () => [
      { position: point(-5.8, 0.45, 7.7), scale: point(5.2, 0.9, 1.0) },
      { position: point(5.8, 0.45, 7.7), scale: point(5.2, 0.9, 1.0) },
      { position: point(-9.3, 0.45, 13.5), scale: point(1.0, 0.9, 11) },
      { position: point(9.3, 0.45, 13.5), scale: point(1.0, 0.9, 11) },
      { position: point(-3.4, 0.4, 74), scale: point(1.0, 0.8, 26) },
      { position: point(3.4, 0.4, 74), scale: point(1.0, 0.8, 26) },
    ],
    [],
  );
  return (
    <Instanced placements={hedges}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1d4a2a" roughness={0.95} />
    </Instanced>
  );
}

function Trees() {
  const { trunks, canopies } = useMemo(() => {
    const random = seeded(7);
    const trunks: Placement[] = [];
    const canopies: Placement[] = [];
    while (trunks.length < 70) {
      const angle = random() * Math.PI * 2;
      const distance = 48 + random() * 70;
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance + 10;
      if (Math.abs(x) < 9 && z > 20) continue;
      const size = 0.8 + random() * 0.7;
      trunks.push({ position: point(x, 1.2 * size, z), scale: size });
      canopies.push({ position: point(x, 3.9 * size, z), scale: size, color: ["#1b3d24", "#234a2b", "#1a3520", "#2b5531"][trunks.length % 4] });
    }
    return { trunks, canopies };
  }, []);
  return (
    <group>
      <Instanced placements={trunks}>
        <cylinderGeometry args={[0.22, 0.32, 2.4, 6]} />
        <meshStandardMaterial color="#3b2a1d" roughness={1} />
      </Instanced>
      <Instanced placements={canopies}>
        <icosahedronGeometry args={[2.3, 1]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </Instanced>
    </group>
  );
}

function Planters() {
  const spots = useMemo<Placement[]>(
    () => [
      { position: point(-7.6, 0, 20.2) },
      { position: point(7.6, 0, 20.2) },
      { position: point(-2.9, 0, 46) },
      { position: point(2.9, 0, 46) },
      { position: point(-2.9, 0, 53) },
      { position: point(2.9, 0, 53) },
    ],
    [],
  );
  const urn = useMemo(
    () =>
      [
        [0, 0],
        [0.18, 0],
        [0.2, 0.06],
        [0.12, 0.14],
        [0.14, 0.26],
        [0.34, 0.5],
        [0.42, 0.66],
        [0.36, 0.72],
        [0, 0.72],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  const pedestals = useMemo(() => spots.map(({ position: [x, , z] }) => ({ position: point(x, 0.45, z) })), [spots]);
  const urns = useMemo(() => spots.map(({ position: [x, , z] }) => ({ position: point(x, 0.9, z) })), [spots]);
  const blooms = useMemo(
    () =>
      spots.flatMap(({ position: [x, , z] }, index) =>
        [0, 1, 2, 3, 4].map((petal) => ({
          position: point(x + Math.sin(petal * 1.3) * 0.2, 1.62 + (petal % 2) * 0.08, z + Math.cos(petal * 1.3) * 0.2),
          color: (index + petal) % 3 === 0 ? "#e83f6f" : "#ff9f1c",
        })),
      ),
    [spots],
  );
  return (
    <group>
      <Instanced placements={pedestals}>
        <boxGeometry args={[0.7, 0.9, 0.7]} />
        <meshStandardMaterial color="#efe9df" roughness={0.6} />
      </Instanced>
      <Instanced placements={urns}>
        <latheGeometry args={[urn, 16]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.5} />
      </Instanced>
      <Instanced placements={blooms}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </Instanced>
    </group>
  );
}

function PathLights() {
  const bollards = useMemo<Vec3[]>(
    () => [-2.55, 2.55].flatMap((x) => along(point(x, 0, GARBA.z + GARBA.radius + 2), point(x, 0, PATH_END - 2), 3.6)),
    [],
  );
  const posts = useMemo(() => bollards.map(([x, , z]) => ({ position: point(x, 0.42, z) })), [bollards]);
  const lights = useMemo<Light[]>(() => bollards.map(([x, , z]) => ({ position: point(x, 0.9, z), color: "#ffd9a0" })), [bollards]);
  return (
    <group>
      <Instanced placements={posts}>
        <cylinderGeometry args={[0.07, 0.1, 0.84, 8]} />
        <meshStandardMaterial color="#2d2620" roughness={0.6} metalness={0.4} />
      </Instanced>
      <GlowPoints lights={lights} size={1.1} />
    </group>
  );
}

function Gateway() {
  const pillarX = 3.3;
  const beamY = 5.4;
  const marigolds = useMemo<Placement[]>(() => {
    const beads: Placement[] = [];
    const colorAt = (index: number) => (index % 3 === 2 ? "#ffd23f" : "#ff8c1a");
    for (const x of along(point(-2.7, 0, 0), point(2.7, 0, 0), 0.42).map(([px]) => px)) {
      along(point(x, beamY - 0.45, GATE_Z + 0.5), point(x, beamY - 1.35 - Math.abs(x) * 0.12, GATE_Z + 0.5), 0.13).forEach((position, index) =>
        beads.push({ position, color: colorAt(index) }),
      );
    }
    sag(point(-pillarX + 0.4, beamY - 0.4, GATE_Z + 0.55), point(pillarX - 0.4, beamY - 0.4, GATE_Z + 0.55), 42, 1.0).forEach((position, index) =>
      beads.push({ position, color: colorAt(index) }),
    );
    for (const side of [-1, 1]) {
      for (let index = 0; index < 60; index++) {
        const angle = index * 0.55;
        beads.push({
          position: point(side * pillarX + Math.sin(angle) * 0.47, 0.3 + index * 0.08, GATE_Z + Math.cos(angle) * 0.47),
          color: colorAt(index),
        });
      }
    }
    return beads;
  }, []);
  const bulbs = useMemo<Light[]>(
    () =>
      [beamY + 0.42, beamY - 0.42].flatMap((y) =>
        along(point(-pillarX - 0.5, y, GATE_Z + 0.52), point(pillarX + 0.5, y, GATE_Z + 0.52), 0.3).map((position) => ({ position, color: "#ffd27a" })),
      ),
    [],
  );
  const domes = useMemo<Placement[]>(
    () => [
      { position: point(-pillarX, beamY + 0.4, GATE_Z), scale: 0.42 },
      { position: point(pillarX, beamY + 0.4, GATE_Z), scale: 0.42 },
      { position: point(0, beamY + 0.4, GATE_Z), scale: 0.62 },
    ],
    [],
  );
  const banner = useMemo(() => signTexture("Sharad Utsav 2026", "#6d1424", 1024, 160), []);

  return (
    <group>
      {[-pillarX, pillarX].map((x) => (
        <group key={x}>
          <Block size={[0.85, 0.5, 0.85]} position={[x, 0.25, GATE_Z]} shade />
          <Block size={[0.7, beamY - 0.5, 0.7]} position={[x, beamY / 2 + 0.25, GATE_Z]} />
        </group>
      ))}
      <Block size={[pillarX * 2 + 1.3, 0.8, 0.95]} position={[0, beamY, GATE_Z]} />
      <GoldBand size={[pillarX * 2 + 1.36, 0.08, 1.0]} position={[0, beamY - 0.42, GATE_Z]} />
      <mesh position={[0, beamY, GATE_Z + 0.49]}>
        <planeGeometry args={[pillarX * 2 - 0.2, 0.62]} />
        <meshStandardMaterial map={banner} roughness={0.7} emissive="#ffffff" emissiveMap={banner} emissiveIntensity={0.25} />
      </mesh>
      <Chhatris placements={domes} />
      <Instanced placements={marigolds}>
        <sphereGeometry args={[0.075, 7, 5]} />
        <meshStandardMaterial roughness={0.85} />
      </Instanced>
      <GlowPoints lights={bulbs} size={0.55} twinkle />
    </group>
  );
}

export function Grounds() {
  return (
    <group>
      <Sky />
      <Lawn />
      <Hedges />
      <Trees />
      <Planters />
      <PathLights />
      <Gateway />
    </group>
  );
}
