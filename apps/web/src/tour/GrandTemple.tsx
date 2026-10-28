"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Flag, Gold, Shikhara } from "@/temple/parts";
import { Diyas } from "./Diyas";
import { GlowPoints, Instanced, along, expand, point, sag, type Light, type Placement, type Vec3 } from "./instances";
import { carvedMarbleTexture, shikharaTexture } from "./textures";

const MARBLE = "#f4efe7";
const MARBLE_SHADE = "#e2d9c9";
const CARPET = "#2c4a9a";

const TERRACE_Y = 3.4;
const HALL = { left: -5.5, right: 5.5, back: -4.5, front: 3.0, top: 7.0 };
const ROOF_Y = 7.24;
const STAIRS = { halfWidth: 2.2, top: 6.25, length: 9, steps: 16 };
export const STAIRS_FOOT = STAIRS.top + STAIRS.length;
const DOOR = { halfWidth: 1.2, top: 6.4 };

function useCarved(repeatX: number, repeatY: number): THREE.Texture {
  return useMemo(() => {
    const texture = carvedMarbleTexture().clone();
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }, [repeatX, repeatY]);
}

function Marble({ carved, shade = false, roughness = 0.5 }: { carved?: THREE.Texture; shade?: boolean; roughness?: number }) {
  return <meshStandardMaterial color={shade ? MARBLE_SHADE : MARBLE} map={carved} roughness={roughness} />;
}

export function Block({ size, position, carved, shade, castShadow }: { size: Vec3; position: Vec3; carved?: THREE.Texture; shade?: boolean; castShadow?: boolean }) {
  return (
    <mesh position={position} castShadow={castShadow}>
      <boxGeometry args={size} />
      <Marble carved={carved} shade={shade} />
    </mesh>
  );
}

export function GoldBand({ size, position }: { size: Vec3; position: Vec3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <Gold roughness={0.35} />
    </mesh>
  );
}

const BALUSTER_PROFILE = [
  [0, 0],
  [0.085, 0],
  [0.085, 0.05],
  [0.055, 0.09],
  [0.05, 0.16],
  [0.085, 0.3],
  [0.09, 0.36],
  [0.06, 0.48],
  [0.04, 0.57],
  [0.06, 0.62],
  [0.08, 0.66],
  [0.08, 0.7],
  [0, 0.7],
].map(([x, y]) => new THREE.Vector2(x, y));

type Rail = { from: Vec3; to: Vec3 };

function railPlacement(from: Vec3, to: Vec3, lift: number): Placement {
  const [dx, dy, dz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const flat = Math.hypot(dx, dz);
  return {
    position: point((from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + lift, (from[2] + to[2]) / 2),
    rotation: point(0, Math.atan2(-dz, dx), Math.atan2(dy, flat)),
    scale: point(Math.hypot(flat, dy), 1, 1),
  };
}

function Balustrade({ rails, height = 0.78 }: { rails: Rail[]; height?: number }) {
  const parts = useMemo(() => {
    const balusters: Placement[] = [];
    const topRails: Placement[] = [];
    const bottomRails: Placement[] = [];
    const posts: Placement[] = [];
    for (const { from, to } of rails) {
      for (const [x, y, z] of along(from, to, 0.3).slice(1, -1)) {
        balusters.push({ position: point(x, y + 0.05, z), scale: point(1, height / 0.78, 1) });
      }
      topRails.push(railPlacement(from, to, height));
      bottomRails.push(railPlacement(from, to, 0.04));
      for (const [x, y, z] of [from, to]) posts.push({ position: point(x, y + height / 2, z), scale: point(1, height + 0.1, 1) });
    }
    return { balusters, topRails, bottomRails, posts };
  }, [rails, height]);

  return (
    <group>
      <Instanced placements={parts.balusters}>
        <latheGeometry args={[BALUSTER_PROFILE, 8]} />
        <Marble />
      </Instanced>
      <Instanced placements={parts.topRails}>
        <boxGeometry args={[1, 0.09, 0.22]} />
        <Marble />
      </Instanced>
      <Instanced placements={parts.bottomRails}>
        <boxGeometry args={[1, 0.08, 0.2]} />
        <Marble shade />
      </Instanced>
      <Instanced placements={parts.posts}>
        <boxGeometry args={[0.28, 1, 0.28]} />
        <Marble />
      </Instanced>
    </group>
  );
}

function rectangle(left: number, right: number, back: number, front: number, y: number): Rail[] {
  return [
    { from: point(left, y, front), to: point(right, y, front) },
    { from: point(right, y, front), to: point(right, y, back) },
    { from: point(right, y, back), to: point(left, y, back) },
    { from: point(left, y, back), to: point(left, y, front) },
  ];
}

function Pillars({ placements, height }: { placements: Placement[]; height: number }) {
  const sets = useMemo(
    () => ({
      bases: expand(placements, [0, 0.15, 0]),
      shafts: expand(placements, [0, height / 2, 0], [1, height - 0.5, 1]),
      rings: expand(placements, [0, height * 0.32, 0]),
      capitals: expand(placements, [0, height - 0.17, 0]),
    }),
    [placements, height],
  );
  return (
    <group>
      <Instanced placements={sets.bases}>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
        <Marble shade />
      </Instanced>
      <Instanced placements={sets.shafts}>
        <cylinderGeometry args={[0.17, 0.2, 1, 8]} />
        <meshStandardMaterial color={MARBLE} roughness={0.45} flatShading />
      </Instanced>
      <Instanced placements={sets.rings}>
        <cylinderGeometry args={[0.23, 0.23, 0.08, 8]} />
        <Gold roughness={0.35} />
      </Instanced>
      <Instanced placements={sets.capitals}>
        <boxGeometry args={[0.56, 0.34, 0.56]} />
        <Marble />
      </Instanced>
    </group>
  );
}

const CHHATRI_PILLARS: Vec3[] = [
  [0.72, 1.2, 0.72],
  [-0.72, 1.2, 0.72],
  [0.72, 1.2, -0.72],
  [-0.72, 1.2, -0.72],
];

export function Chhatris({ placements }: { placements: Placement[] }) {
  const sets = useMemo(
    () => ({
      platforms: expand(placements, [0, 0.125, 0]),
      pillars: CHHATRI_PILLARS.flatMap((offset) => expand(placements, offset)),
      tops: expand(placements, [0, 2.27, 0]),
      bands: expand(placements, [0, 2.13, 0]),
      domes: expand(placements, [0, 2.39, 0], [1, 1.08, 1]),
      lotus: expand(placements, [0, 2.44, 0], 1, [Math.PI / 2, 0, 0]),
      balls: expand(placements, [0, 3.52, 0]),
      spikes: expand(placements, [0, 3.8, 0]),
    }),
    [placements],
  );
  return (
    <group>
      <Instanced placements={sets.platforms}>
        <boxGeometry args={[2.0, 0.25, 2.0]} />
        <Marble shade />
      </Instanced>
      <Instanced placements={sets.pillars}>
        <cylinderGeometry args={[0.09, 0.11, 1.9, 8]} />
        <Marble />
      </Instanced>
      <Instanced placements={sets.tops}>
        <boxGeometry args={[2.2, 0.24, 2.2]} />
        <Marble />
      </Instanced>
      <Instanced placements={sets.bands}>
        <boxGeometry args={[2.26, 0.07, 2.26]} />
        <Gold roughness={0.35} />
      </Instanced>
      <Instanced placements={sets.domes}>
        <sphereGeometry args={[1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={MARBLE} roughness={0.45} flatShading />
      </Instanced>
      <Instanced placements={sets.lotus}>
        <torusGeometry args={[0.98, 0.09, 6, 24]} />
        <Marble shade />
      </Instanced>
      <Instanced placements={sets.balls}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <Gold />
      </Instanced>
      <Instanced placements={sets.spikes}>
        <coneGeometry args={[0.07, 0.36, 10]} />
        <Gold />
      </Instanced>
    </group>
  );
}

function MiniSpires({ placements }: { placements: Placement[] }) {
  const profile = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new THREE.Vector2(0.4 * (1 - 0.82 * (i / 11) ** 1.3), (i / 11) * 1.8)),
    [],
  );
  const finials = useMemo(() => expand(placements, [0, 1.92, 0]), [placements]);
  return (
    <group>
      <Instanced placements={placements}>
        <latheGeometry args={[profile, 10]} />
        <meshStandardMaterial color={MARBLE} map={shikharaTexture()} roughness={0.6} flatShading />
      </Instanced>
      <Instanced placements={finials}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <Gold />
      </Instanced>
    </group>
  );
}

type TowerSpec = { x: number; z: number; drum: number; height: number; radius: number; flag?: boolean };

const TOWERS: TowerSpec[] = [
  { x: -1.95, z: -1.3, drum: 2.9, height: 7.2, radius: 1.3, flag: true },
  { x: 1.95, z: -1.3, drum: 2.9, height: 7.2, radius: 1.3, flag: true },
  { x: -4.5, z: -2.5, drum: 2.2, height: 5.5, radius: 1.0 },
  { x: 4.5, z: -2.5, drum: 2.2, height: 5.5, radius: 1.0 },
];

const TOWER_TIPS: Vec3[] = TOWERS.map((tower) => point(tower.x, ROOF_Y + tower.drum * 0.2 + tower.height + tower.radius * 0.5, tower.z));

function Tower({ x, z, drum, height, radius, flag = false }: TowerSpec) {
  const drumHeight = drum * 0.2;
  return (
    <group>
      <Block size={[drum, drumHeight, drum]} position={[x, ROOF_Y + drumHeight / 2, z]} />
      <GoldBand size={[drum + 0.06, 0.06, drum + 0.06]} position={[x, ROOF_Y + drumHeight, z]} />
      <Shikhara height={height} radius={radius} position={[x, ROOF_Y + drumHeight, z]} color={MARBLE} map={shikharaTexture()} />
      {flag && (
        <group position={[x, ROOF_Y + drumHeight + height + radius * 0.55, z]} scale={2.6}>
          <Flag position={[0, 0, 0]} />
        </group>
      )}
    </group>
  );
}

type Opening = { x: number; z: number; yaw: number };

const WINDOWS: Opening[] = [
  { x: -3.4, z: HALL.front, yaw: 0 },
  { x: 3.4, z: HALL.front, yaw: 0 },
  { x: HALL.left, z: -2.6, yaw: -Math.PI / 2 },
  { x: HALL.left, z: 0.6, yaw: -Math.PI / 2 },
  { x: HALL.right, z: -2.6, yaw: Math.PI / 2 },
  { x: HALL.right, z: 0.6, yaw: Math.PI / 2 },
];

function onWall({ x, z, yaw }: Opening, y: number, offset: number): { position: Vec3; rotation: Vec3 } {
  return { position: point(x + Math.sin(yaw) * offset, y, z + Math.cos(yaw) * offset), rotation: point(0, yaw, 0) };
}

function JaliWindows() {
  const frames = useMemo(() => WINDOWS.map((window) => onWall(window, 5.0, 0.02)), []);
  const panes = useMemo(() => WINDOWS.map((window) => onWall(window, 5.0, 0.05)), []);
  return (
    <group>
      <Instanced placements={frames}>
        <planeGeometry args={[1.42, 1.92]} />
        <Gold roughness={0.4} />
      </Instanced>
      <Instanced placements={panes}>
        <planeGeometry args={[1.2, 1.7]} />
        <meshBasicMaterial color="#ffc46b" toneMapped={false} />
      </Instanced>
    </group>
  );
}

function Exterior() {
  const baseCarving = useCarved(9, 1.6);
  const hallCarving = useCarved(6, 2);

  const pilasters = useMemo<Placement[]>(() => [-7.75, -6.5, -3.0, 3.0, 6.5, 7.75].map((x) => ({ position: point(x, 1.85, 6.06) })), []);
  const porchPillars = useMemo<Placement[]>(() => [-5.25, -3.5, -1.75, 1.75, 3.5, 5.25].map((x) => ({ position: point(x, TERRACE_Y, 4.95) })), []);
  const miniSpires = useMemo<Placement[]>(
    () =>
      TOWERS.flatMap((tower) =>
        [-1, 1].map((side) => ({
          position: point(tower.x + side * tower.drum * 0.42, ROOF_Y + tower.drum * 0.2, tower.z + tower.drum * 0.42),
          scale: tower.drum / 2.9,
        })),
      ),
    [],
  );
  const chhatris = useMemo<Placement[]>(
    () => [
      { position: point(-6.9, TERRACE_Y, 5.0) },
      { position: point(6.9, TERRACE_Y, 5.0) },
      { position: point(-6.9, TERRACE_Y, -5.0) },
      { position: point(6.9, TERRACE_Y, -5.0) },
      { position: point(-5.35, ROOF_Y, 4.4), scale: 0.7 },
      { position: point(5.35, ROOF_Y, 4.4), scale: 0.7 },
    ],
    [],
  );
  const rails = useMemo<Rail[]>(
    () => [
      { from: point(-8.15, TERRACE_Y, 6.15), to: point(-STAIRS.halfWidth - 0.1, TERRACE_Y, 6.15) },
      { from: point(STAIRS.halfWidth + 0.1, TERRACE_Y, 6.15), to: point(8.15, TERRACE_Y, 6.15) },
      { from: point(8.15, TERRACE_Y, 6.15), to: point(8.15, TERRACE_Y, -6.15) },
      { from: point(8.15, TERRACE_Y, -6.15), to: point(-8.15, TERRACE_Y, -6.15) },
      { from: point(-8.15, TERRACE_Y, -6.15), to: point(-8.15, TERRACE_Y, 6.15) },
      ...rectangle(-6.15, 6.15, -4.83, 5.27, ROOF_Y),
    ],
    [],
  );
  const wallHeight = HALL.top - TERRACE_Y;
  const wallY = (HALL.top + TERRACE_Y) / 2;

  return (
    <group>
      <Block size={[16.8, 0.5, 12.8]} position={[0, 0.25, 0]} shade />
      <Block size={[16, 2.8, 12]} position={[0, 1.9, 0]} carved={baseCarving} />
      <GoldBand size={[16.3, 0.12, 12.3]} position={[0, 3.25, 0]} />
      <Block size={[16.6, 0.2, 12.6]} position={[0, 3.3, 0]} />
      <Instanced placements={pilasters}>
        <boxGeometry args={[0.38, 2.7, 0.14]} />
        <Marble shade />
      </Instanced>
      {[-5.0, 5.0].map((x) => (
        <group key={x} position={[x, 0, 6.02]}>
          <mesh position={[0, 1.7, 0]}>
            <planeGeometry args={[1.8, 2.4]} />
            <meshStandardMaterial color="#3a2414" roughness={0.6} />
          </mesh>
          <GoldBand size={[2.0, 0.1, 0.06]} position={[0, 2.95, 0.02]} />
          <GoldBand size={[0.1, 2.45, 0.06]} position={[-0.95, 1.73, 0.02]} />
          <GoldBand size={[0.1, 2.45, 0.06]} position={[0.95, 1.73, 0.02]} />
        </group>
      ))}

      <Block size={[HALL.right - HALL.left, wallHeight, 0.3]} position={[0, wallY, HALL.back + 0.15]} carved={hallCarving} castShadow />
      {[HALL.left + 0.15, HALL.right - 0.15].map((x) => (
        <Block key={x} size={[0.3, wallHeight, HALL.front - HALL.back]} position={[x, wallY, (HALL.front + HALL.back) / 2]} carved={hallCarving} castShadow />
      ))}
      {[-1, 1].map((side) => (
        <Block
          key={side}
          size={[HALL.right - DOOR.halfWidth, wallHeight, 0.3]}
          position={[(side * (HALL.right + DOOR.halfWidth)) / 2, wallY, HALL.front - 0.15]}
          carved={hallCarving}
          castShadow
        />
      ))}
      <Block size={[DOOR.halfWidth * 2, HALL.top - DOOR.top, 0.3]} position={[0, (HALL.top + DOOR.top) / 2, HALL.front - 0.15]} castShadow />
      <GoldBand size={[DOOR.halfWidth * 2 + 0.3, 0.14, 0.4]} position={[0, DOOR.top + 0.05, HALL.front - 0.1]} />
      {[-1, 1].map((side) => (
        <GoldBand key={side} size={[0.14, DOOR.top - TERRACE_Y, 0.4]} position={[side * (DOOR.halfWidth + 0.07), (DOOR.top + TERRACE_Y) / 2, HALL.front - 0.1]} />
      ))}
      <JaliWindows />

      <Pillars placements={porchPillars} height={wallHeight} />
      <GoldBand size={[12.7, 0.07, 10.5]} position={[0, HALL.top - 0.02, 0.22]} />
      <Block size={[12.6, 0.24, 10.4]} position={[0, HALL.top + 0.12, 0.22]} castShadow />

      <Balustrade rails={rails} />
      {TOWERS.map((tower) => (
        <Tower key={`${tower.x}-${tower.z}`} {...tower} />
      ))}
      <MiniSpires placements={miniSpires} />
      <Chhatris placements={chhatris} />
    </group>
  );
}

function Staircase() {
  const run = STAIRS.length / STAIRS.steps;
  const rise = TERRACE_Y / STAIRS.steps;
  const wingX = STAIRS.halfWidth + 0.3;

  const parts = useMemo(() => {
    const steps: Placement[] = [];
    const treads: Placement[] = [];
    const risers: Placement[] = [];
    for (let index = 0; index < STAIRS.steps; index++) {
      const top = (index + 1) * rise;
      const front = STAIRS_FOOT - index * run;
      steps.push({ position: point(0, top / 2, front - run / 2), scale: point(1, top, run) });
      treads.push({ position: point(0, top + 0.012, front - run / 2), scale: point(1, 1, run) });
      risers.push({ position: point(0, top - rise / 2, front + 0.012), scale: point(1, rise, 1) });
    }
    return { steps, treads, risers };
  }, [rise, run]);

  const wingShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, TERRACE_Y + 0.4);
    shape.lineTo(STAIRS.length, rise + 0.4);
    shape.lineTo(STAIRS.length + 0.6, rise + 0.4);
    shape.lineTo(STAIRS.length + 0.6, 0);
    shape.closePath();
    return shape;
  }, [rise]);

  const rails = useMemo<Rail[]>(
    () => [-wingX, wingX].map((x) => ({ from: point(x, TERRACE_Y + 0.4, STAIRS.top + 0.1), to: point(x, rise + 0.4, STAIRS_FOOT - 0.1) })),
    [rise, wingX],
  );

  const diyas = useMemo(() => {
    const wallTop = (z: number) => TERRACE_Y + 0.4 - ((z - STAIRS.top) / STAIRS.length) * (TERRACE_Y - rise);
    const onWalls = [-wingX, wingX].flatMap((x) =>
      along(point(x, 0, STAIRS.top + 0.6), point(x, 0, STAIRS_FOOT - 0.3), 1.05).map(([px, , pz]) => point(px, wallTop(pz) + 0.76, pz)),
    );
    return [...onWalls, point(-wingX, 1.76, STAIRS_FOOT + 0.35), point(wingX, 1.76, STAIRS_FOOT + 0.35)];
  }, [rise, wingX]);

  return (
    <group>
      <Instanced placements={parts.steps}>
        <boxGeometry args={[STAIRS.halfWidth * 2, 1, 1]} />
        <Marble />
      </Instanced>
      <Instanced placements={parts.treads}>
        <boxGeometry args={[2.3, 0.024, 1]} />
        <meshStandardMaterial color={CARPET} roughness={0.95} />
      </Instanced>
      <Instanced placements={parts.risers}>
        <boxGeometry args={[2.3, 1, 0.024]} />
        <meshStandardMaterial color={CARPET} roughness={0.95} />
      </Instanced>
      <mesh position={[0, TERRACE_Y + 0.012, (STAIRS.top + HALL.front) / 2]}>
        <boxGeometry args={[2.3, 0.024, STAIRS.top - HALL.front]} />
        <meshStandardMaterial color={CARPET} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * wingX + 0.3, 0, STAIRS.top]} rotation={[0, -Math.PI / 2, 0]}>
          <extrudeGeometry args={[wingShape, { depth: 0.6, bevelEnabled: false }]} />
          <Marble shade />
        </mesh>
      ))}
      <Balustrade height={0.7} rails={rails} />
      {[-wingX, wingX].map((x) => (
        <group key={x} position={[x, 0, STAIRS_FOOT + 0.35]}>
          <Block size={[0.95, 1.5, 0.95]} position={[0, 0.75, 0]} />
          <GoldBand size={[1.0, 0.08, 1.0]} position={[0, 1.5, 0]} />
          <Block size={[1.1, 0.16, 1.1]} position={[0, 1.62, 0]} />
        </group>
      ))}
      <Diyas positions={diyas} />
    </group>
  );
}

const ELEPHANT_LEGS: [number, number][] = [
  [0.36, 0.55],
  [-0.36, 0.55],
  [0.36, -0.55],
  [-0.36, -0.55],
];

function Elephant({ position, rotation }: { position: Vec3; rotation: number }) {
  const trunk = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.5, 1.25),
        new THREE.Vector3(0, 1.05, 1.62),
        new THREE.Vector3(0, 0.45, 1.68),
        new THREE.Vector3(0, 0.3, 1.9),
      ]),
    [],
  );
  const statue = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f6f2ea", roughness: 0.42 }), []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block size={[2.1, 0.55, 3.2]} position={[0, 0.275, 0.25]} shade />
      <GoldBand size={[2.16, 0.06, 3.26]} position={[0, 0.55, 0.25]} />
      <group position={[0, 0.55, 0]}>
        <mesh position={[0, 1.25, 0]} scale={[0.72, 0.62, 1.02]} material={statue}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
        <group position={[0, 1.25, 0]} scale={[0.75, 0.65, 1.05]}>
          <mesh>
            <sphereGeometry args={[1.01, 24, 8, 0, Math.PI * 2, 0, 0.95]} />
            <meshStandardMaterial color="#9b1c2e" roughness={0.6} />
          </mesh>
          <mesh position={[0, Math.cos(0.95) * 1.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[Math.sin(0.95) * 1.01, 0.035, 6, 32]} />
            <Gold />
          </mesh>
        </group>
        <mesh position={[0, 1.55, 1.0]} material={statue}>
          <sphereGeometry args={[0.5, 20, 16]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.46, 1.58, 0.82]} rotation={[0, side * 0.5, 0]} scale={[0.14, 0.5, 0.42]} material={statue}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        ))}
        <mesh material={statue}>
          <tubeGeometry args={[trunk, 24, 0.13, 10, false]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.2, 1.15, 1.38]} rotation={[1.2, 0, side * 0.15]}>
            <coneGeometry args={[0.05, 0.5, 8]} />
            <meshStandardMaterial color="#fff8e6" roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 1.88, 1.12]} rotation={[0.45, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.03, 16]} />
          <Gold />
        </mesh>
        {ELEPHANT_LEGS.map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.45, 0]} material={statue}>
              <cylinderGeometry args={[0.2, 0.22, 0.9, 12]} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.235, 0.235, 0.07, 12]} />
              <Gold />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Limb({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const direction = new THREE.Vector3(...to).sub(start);
    return {
      position: start.clone().addScaledVector(direction, 0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <capsuleGeometry args={[radius, length, 4, 10]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function Halo() {
  const rays = useMemo<Placement[]>(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        return { position: point(Math.sin(angle) * 0.36, Math.cos(angle) * 0.36, 0), rotation: point(0, 0, -angle) };
      }),
    [],
  );
  return (
    <group position={[0, 1.5, -0.16]}>
      <mesh>
        <ringGeometry args={[0.24, 0.3, 36]} />
        <Gold />
      </mesh>
      <Instanced placements={rays}>
        <coneGeometry args={[0.035, 0.12, 6]} />
        <Gold />
      </Instanced>
    </group>
  );
}

type MurtiProps = { position: Vec3; skin: string; robe: string; top: string; krishna?: boolean };

function Murti({ position, skin, robe, top, krishna = false }: MurtiProps) {
  const skirt = useMemo(
    () =>
      [
        [0, 0.2],
        [0.36, 0.2],
        [0.33, 0.35],
        [0.27, 0.6],
        [0.19, 0.88],
        [0.14, 1.02],
        [0, 1.02],
      ].map(([x, y]) => new THREE.Vector2(krishna ? x * 0.86 : x, y)),
    [krishna],
  );
  const shoulderY = 1.3;
  const hands = krishna
    ? { left: point(0.02, 1.43, 0.2), right: point(0.27, 1.42, 0.15) }
    : { left: point(-0.24, 1.0, 0.12), right: point(0.22, 1.5, 0.12) };
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.36, 0.42, 0.2, 24]} />
        <Gold roughness={0.3} />
      </mesh>
      <mesh>
        <latheGeometry args={[skirt, 24]} />
        <meshStandardMaterial color={robe} roughness={0.55} />
      </mesh>
      {[0.24, 0.42].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[(krishna ? 0.86 : 1) * (0.355 - index * 0.04), 0.018, 6, 32]} />
          <Gold />
        </mesh>
      ))}
      <mesh position={[0, 1.17, 0]}>
        <cylinderGeometry args={[0.15, 0.13, 0.3, 16]} />
        <meshStandardMaterial color={top} roughness={0.5} />
      </mesh>
      <mesh position={[0, shoulderY, 0]} scale={[1.25, 0.5, 0.8]}>
        <sphereGeometry args={[0.13, 16, 10]} />
        <meshStandardMaterial color={top} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, 10]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.53, 0]}>
        <sphereGeometry args={[0.115, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.45} />
      </mesh>
      <Limb from={point(-0.15, shoulderY, 0)} to={hands.left} radius={0.034} color={skin} />
      <Limb from={point(0.15, shoulderY, 0)} to={hands.right} radius={0.034} color={skin} />
      <mesh position={[0, 1.31, 0.06]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <torusGeometry args={[0.12, 0.016, 6, 24]} />
        <Gold />
      </mesh>
      <mesh position={[0, 1.08, 0.1]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[1, 1.6, 1]}>
        <torusGeometry args={[0.14, 0.026, 6, 24]} />
        <meshStandardMaterial color={krishna ? "#e53935" : "#fff1d6"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.085, 0.11, 0.17, 12]} />
        <Gold roughness={0.22} />
      </mesh>
      {[-0.06, 0, 0.06].map((x) => (
        <mesh key={x} position={[x, 1.83 - Math.abs(x), 0]}>
          <coneGeometry args={[0.03, 0.12, 8]} />
          <Gold />
        </mesh>
      ))}
      {krishna ? (
        <>
          <mesh position={[0.1, 1.86, -0.02]} rotation={[0, 0, -0.5]} scale={[0.05, 0.15, 0.02]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#1f8a7a" roughness={0.4} />
          </mesh>
          <mesh position={[0.135, 1.93, -0.005]}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
          </mesh>
          <Limb from={point(-0.06, 1.47, 0.2)} to={point(0.55, 1.4, 0.12)} radius={0.014} color="#8a5a2b" />
        </>
      ) : (
        <mesh position={[0, 1.56, -0.035]} scale={[1.08, 1.12, 1.1]}>
          <sphereGeometry args={[0.13, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color="#d81b60" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Halo />
    </group>
  );
}

function InteriorLining() {
  const carving = useCarved(5, 1.6);
  const height = HALL.top - TERRACE_Y;
  const y = TERRACE_Y + height / 2;
  const inner = { left: HALL.left + 0.3, right: HALL.right - 0.3, back: HALL.back + 0.3, front: HALL.front - 0.3 };
  const panels: { position: Vec3; rotation: Vec3; width: number }[] = [
    { position: point(0, y, inner.back + 0.005), rotation: point(0, 0, 0), width: inner.right - inner.left },
    { position: point(inner.left + 0.005, y, (inner.back + inner.front) / 2), rotation: point(0, Math.PI / 2, 0), width: inner.front - inner.back },
    { position: point(inner.right - 0.005, y, (inner.back + inner.front) / 2), rotation: point(0, -Math.PI / 2, 0), width: inner.front - inner.back },
    ...[-1, 1].map((side) => ({
      position: point((side * (inner.right + DOOR.halfWidth)) / 2, y, inner.front - 0.005),
      rotation: point(0, Math.PI, 0),
      width: inner.right - DOOR.halfWidth,
    })),
  ];
  return (
    <group>
      {panels.map((panel) => (
        <mesh key={panel.position.join()} position={panel.position} rotation={panel.rotation} receiveShadow>
          <planeGeometry args={[panel.width, height]} />
          <meshStandardMaterial color="#e2cba5" map={carving} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function Interior() {
  const pillars = useMemo<Placement[]>(() => [-3.1, 3.1].flatMap((x) => [-2.6, -0.5, 1.6].map((z) => ({ position: point(x, TERRACE_Y, z) }))), []);
  const garland = useMemo<Placement[]>(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const angle = (index / 29) * Math.PI;
        return {
          position: point(Math.cos(angle) * 1.6, 5.9 + Math.sin(angle) * 1.6 * 0.45 - 0.08, -3.68),
          color: index % 2 === 0 ? "#ff9f1c" : "#ffd23f",
        };
      }),
    [],
  );
  const chandelier = useMemo<Light[]>(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2;
        return { position: point(Math.sin(angle) * 0.78, 6.1, -0.6 + Math.cos(angle) * 0.78), color: "#ffd9a0" };
      }),
    [],
  );
  const altarDiyas = useMemo(() => Array.from({ length: 9 }, (_, index) => point(-2.0 + index * 0.5, TERRACE_Y + 0.45, -3.3)), []);
  const flowers = useMemo<Placement[]>(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        position: point(-1.6 + (index % 11) * 0.32, TERRACE_Y + 0.9, -3.58 - Math.floor(index / 11) * 0.08),
        color: ["#e83f6f", "#ff9f1c", "#fff1d6", "#ffd23f"][index % 4],
      })),
    [],
  );
  const niches = useMemo<Opening[]>(
    () => [
      { x: HALL.left + 0.3, z: -1.1, yaw: Math.PI / 2 },
      { x: HALL.right - 0.3, z: -1.1, yaw: -Math.PI / 2 },
    ],
    [],
  );

  return (
    <group>
      <InteriorLining />
      <mesh position={[0, TERRACE_Y + 0.02, (HALL.back + HALL.front) / 2]} receiveShadow>
        <boxGeometry args={[HALL.right - HALL.left - 0.6, 0.04, HALL.front - HALL.back - 0.6]} />
        <meshStandardMaterial color="#efe4d2" roughness={0.18} metalness={0.05} />
      </mesh>
      <mesh position={[0, TERRACE_Y + 0.045, -0.4]} receiveShadow>
        <boxGeometry args={[1.4, 0.01, 5.4]} />
        <meshStandardMaterial color="#8c1d2c" roughness={0.9} />
      </mesh>
      <mesh position={[0, HALL.top - 0.1, (HALL.back + HALL.front) / 2]}>
        <boxGeometry args={[HALL.right - HALL.left - 0.5, 0.18, HALL.front - HALL.back - 0.5]} />
        <meshStandardMaterial color="#d9c29b" roughness={0.7} />
      </mesh>
      <mesh position={[0, HALL.top - 0.2, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.06, 8, 40]} />
        <Gold />
      </mesh>
      <mesh position={[0, 6.1, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.035, 6, 32]} />
        <Gold />
      </mesh>
      <GlowPoints lights={chandelier} size={0.32} />
      <Pillars placements={pillars} height={HALL.top - TERRACE_Y - 0.2} />

      <mesh position={[0, TERRACE_Y + 0.225, -3.95]} receiveShadow>
        <boxGeometry args={[6.4, 0.45, 1.6]} />
        <Marble shade />
      </mesh>
      <GoldBand size={[6.45, 0.06, 1.65]} position={[0, TERRACE_Y + 0.45, -3.95]} />
      <mesh position={[0, TERRACE_Y + 0.65, -4.1]} receiveShadow>
        <boxGeometry args={[4.6, 0.4, 1.2]} />
        <Marble />
      </mesh>
      <GoldBand size={[4.65, 0.06, 1.25]} position={[0, TERRACE_Y + 0.85, -4.1]} />
      <mesh position={[0, 5.3, HALL.back + 0.32]} receiveShadow>
        <planeGeometry args={[4.4, 2.9]} />
        <meshStandardMaterial color="#6e1322" roughness={0.85} />
      </mesh>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[x, 4.875, -3.75]}>
          <cylinderGeometry args={[0.09, 0.11, 2.05, 10]} />
          <Gold roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 5.9, -3.75]} scale={[1, 0.45, 1]}>
        <torusGeometry args={[1.75, 0.09, 8, 40, Math.PI]} />
        <Gold roughness={0.3} />
      </mesh>
      <Instanced placements={garland}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </Instanced>
      <Instanced placements={flowers}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial roughness={0.85} />
      </Instanced>
      <Murti position={[-0.62, TERRACE_Y + 0.86, -3.9]} skin="#2b3a6b" robe="#e8b923" top="#f2c94c" krishna />
      <Murti position={[0.62, TERRACE_Y + 0.86, -3.9]} skin="#f1d3b8" robe="#c2185b" top="#2e7d32" />
      <Diyas positions={altarDiyas} />
      {niches.map((niche) => (
        <group key={niche.x}>
          <mesh {...onWall(niche, 4.9, 0.02)}>
            <planeGeometry args={[1.5, 2.1]} />
            <Gold roughness={0.4} />
          </mesh>
          <mesh {...onWall(niche, 4.9, 0.04)}>
            <planeGeometry args={[1.25, 1.85]} />
            <meshBasicMaterial color="#ffb85c" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 5.4, -0.2]} color="#ffd9a0" intensity={9} distance={10} decay={2} />
      <pointLight position={[0, 5.5, -2.3]} color="#ffc27a" intensity={6} distance={4.5} decay={2} />
    </group>
  );
}

function Floodlight({ position, target }: { position: Vec3; target: Vec3 }) {
  const aim = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <primitive object={aim} position={target} />
      <spotLight
        position={position}
        target={aim}
        angle={0.55}
        penumbra={0.8}
        intensity={3.0}
        decay={0}
        color="#ffd9a6"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.003}
        shadow-camera-near={4}
        shadow-camera-far={60}
      />
    </>
  );
}

export function GrandTemple() {
  const lights = useMemo<Light[]>(() => {
    const result: Light[] = [];
    const warm = "#ffd27a";
    for (const { from, to } of rectangle(-6.25, 6.25, -4.95, 5.36, HALL.top - 0.08)) {
      for (const position of along(from, to, 0.36)) result.push({ position, color: warm });
    }
    for (const { from, to } of rectangle(-8.32, 8.32, -6.32, 6.32, 3.18)) {
      for (const position of along(from, to, 0.42)) result.push({ position, color: warm });
    }
    const rail = ROOF_Y + 0.85;
    TOWER_TIPS.forEach(([x, y, z], index) => {
      const inner = index < 2;
      const side = Math.sign(x);
      const ends = inner
        ? [point(side * 6.2, rail, 5.3), point(side * 3.2, rail, 5.3), point(side * 0.4, rail, 5.3), point(side * 6.2, rail, -4.8)]
        : [point(side * 6.2, rail, 5.3), point(side * 6.2, rail, -4.8)];
      for (const end of ends) {
        sag(point(x, y - 0.6, z), end, inner ? 34 : 26, inner ? 0.5 : 0.4).forEach((position, bulb) =>
          result.push({ position, color: bulb % 4 === 0 ? "#ff8fb8" : warm }),
        );
      }
    });
    return result;
  }, []);

  const terraceDiyas = useMemo(
    () =>
      [...along(point(-8.05, 0, 6.15), point(-STAIRS.halfWidth - 0.4, 0, 6.15), 0.9), ...along(point(STAIRS.halfWidth + 0.4, 0, 6.15), point(8.05, 0, 6.15), 0.9)].map(
        ([x, , z]) => point(x, TERRACE_Y + 0.83, z),
      ),
    [],
  );

  return (
    <group>
      <Exterior />
      <Staircase />
      <Interior />
      <Elephant position={[-STAIRS.halfWidth - 1.85, 0, STAIRS_FOOT + 0.2]} rotation={0.18} />
      <Elephant position={[STAIRS.halfWidth + 1.85, 0, STAIRS_FOOT + 0.2]} rotation={-0.18} />
      <GlowPoints lights={lights} size={0.55} twinkle />
      <Diyas positions={terraceDiyas} />
      <Floodlight position={[-11, 0.6, 24]} target={[0, 7, 0]} />
      <Floodlight position={[11, 0.6, 24]} target={[0, 7, 0]} />
    </group>
  );
}
