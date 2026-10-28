"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Gold } from "@/temple/parts";
import { Diyas } from "./Diyas";
import { GARBA } from "./Grounds";
import { FESTIVE_COLORS, GlowPoints, Instanced, along, point, sag, seeded, type Light, type Placement, type Vec3 } from "./instances";
import { People, figures, type Arrange } from "./People";
import { signTexture, stripeTexture } from "./textures";

const RINGS = [
  { radius: 3.4, count: 12, speed: 0.2 },
  { radius: 5.2, count: 18, speed: -0.15 },
  { radius: 7.0, count: 26, speed: 0.11 },
];

const RING_SLOTS = RINGS.flatMap((ring, ringIndex) =>
  Array.from({ length: ring.count }, (_, slot) => ({ ring, slot, phase: (slot * 0.37 + ringIndex * 0.21) % 1 })),
);

const garbaCircle: Arrange = (index, time, pose) => {
  const { ring, slot, phase } = RING_SLOTS[index];
  const angle = (slot / ring.count) * Math.PI * 2 + ring.speed * time;
  pose.x = GARBA.x + Math.sin(angle) * ring.radius;
  pose.z = GARBA.z + Math.cos(angle) * ring.radius;
  pose.yaw = angle + Math.sign(ring.speed) * (Math.PI / 2) + 0.55 * Math.sin(time * 3.1 + phase * 6);
  const cycle = (time * 0.17 + phase) % 1;
  const twirl = cycle < 0.12 ? cycle / 0.12 : 0;
  pose.spin = twirl * twirl * (3 - 2 * twirl) * Math.PI * 2;
  pose.flare = 1 + 0.28 * Math.sin(Math.PI * twirl);
  pose.bob = 0.05 * Math.abs(Math.sin(time * 3.4 + phase * 6));
  pose.clap = 0.5 + 0.5 * Math.sin(time * 6.8 + phase * 3);
};

const SPECTATOR_ANGLES = Array.from({ length: 22 }, (_, index) => (index / 22) * Math.PI * 2 + 0.07).filter(
  (angle) => Math.abs(Math.sin(angle)) > 0.25 || Math.cos(angle) < 0,
);

const spectators: Arrange = (index, time, pose) => {
  const angle = SPECTATOR_ANGLES[index];
  const radius = GARBA.radius + 0.7 + (index % 2) * 0.5;
  pose.x = GARBA.x + Math.sin(angle) * radius;
  pose.z = GARBA.z + Math.cos(angle) * radius;
  pose.yaw = angle + Math.PI;
  pose.bob = 0.02 * Math.abs(Math.sin(time * 3.4 + index));
};

const STAGE: { position: Vec3; yaw: number } = { position: point(-8.7, 0, GARBA.z - 9.0), yaw: Math.atan2(8.7, 9.0) };

const musicians: Arrange = (index, time, pose) => {
  const offset = (index - 1) * 1.1;
  pose.x = STAGE.position[0] + Math.cos(STAGE.yaw) * offset - Math.sin(STAGE.yaw) * 0.2;
  pose.z = STAGE.position[2] - Math.sin(STAGE.yaw) * offset - Math.cos(STAGE.yaw) * 0.2;
  pose.y = 0.6;
  pose.legs = 0.55;
  pose.yaw = STAGE.yaw + 0.2 * Math.sin(time * 1.3 + index);
  pose.bob = 0.03 * Math.abs(Math.sin(time * 6.8 + index));
};

function Mandvi() {
  const posts = useMemo<Placement[]>(() => [-0.85, 0.85].flatMap((x) => [-0.85, 0.85].map((z) => ({ position: point(GARBA.x + x, 1.55, GARBA.z + z) }))), []);
  const diyas = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2;
        return point(GARBA.x + Math.sin(angle) * 2.75, 0.09, GARBA.z + Math.cos(angle) * 2.75);
      }),
    [],
  );
  const petals = useMemo<Placement[]>(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return {
          position: point(GARBA.x + Math.sin(angle) * 2.48, 0.09, GARBA.z + Math.cos(angle) * 2.48),
          rotation: point(0, angle, 0),
          scale: point(0.14, 0.02, 0.32),
          color: ["#e8761c", "#c2185b", "#f5c518", "#2e7d32"][index % 4],
        };
      }),
    [],
  );
  const rangoli: [number, number, string][] = [
    [1.45, 1.65, "#e8761c"],
    [1.65, 1.85, "#c2185b"],
    [1.85, 2.05, "#2e7d32"],
    [2.05, 2.25, "#f5c518"],
  ];
  return (
    <group>
      <mesh position={[GARBA.x, 0.04, GARBA.z]}>
        <cylinderGeometry args={[GARBA.radius, GARBA.radius, 0.08, 72]} />
        <meshStandardMaterial color="#e3d6c0" roughness={0.85} />
      </mesh>
      <mesh position={[GARBA.x, 0.085, GARBA.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GARBA.radius - 0.25, GARBA.radius - 0.05, 72]} />
        <meshStandardMaterial color="#c99b24" roughness={0.5} metalness={0.4} />
      </mesh>
      {rangoli.map(([inner, outer, color]) => (
        <mesh key={color} position={[GARBA.x, 0.086, GARBA.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[inner, outer, 48]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      <Instanced placements={petals}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial roughness={0.9} />
      </Instanced>
      <mesh position={[GARBA.x, 0.3, GARBA.z]}>
        <cylinderGeometry args={[1.3, 1.4, 0.45, 8]} />
        <meshStandardMaterial color="#8c1d2c" roughness={0.7} />
      </mesh>
      <mesh position={[GARBA.x, 0.53, GARBA.z]}>
        <cylinderGeometry args={[1.32, 1.32, 0.04, 8]} />
        <Gold roughness={0.35} />
      </mesh>
      <Instanced placements={posts}>
        <cylinderGeometry args={[0.06, 0.06, 2.1, 8]} />
        <Gold roughness={0.35} />
      </Instanced>
      <mesh position={[GARBA.x, 3.05, GARBA.z]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.45, 0.95, 4]} />
        <meshStandardMaterial color="#a3172d" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[GARBA.x, 2.6, GARBA.z]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[1.47, 1.47, 0.08, 4, 1, true]} />
        <Gold roughness={0.35} />
      </mesh>
      <mesh position={[GARBA.x, 0.9, GARBA.z]}>
        <sphereGeometry args={[0.32, 18, 14]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <mesh position={[GARBA.x, 4.6, GARBA.z]}>
        <cylinderGeometry args={[0.06, 0.08, 7.2, 8]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.6} />
      </mesh>
      <mesh position={[GARBA.x, 8.25, GARBA.z]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <Gold />
      </mesh>
      <GlowPoints lights={[{ position: point(GARBA.x, 0.9, GARBA.z), color: "#ffb347" }]} size={3.2} />
      <Diyas positions={diyas} />
      <pointLight position={[GARBA.x, 5.5, GARBA.z]} color="#ffc98a" intensity={70} distance={24} decay={2} />
    </group>
  );
}

function CanopyOfLights() {
  const poles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = ((index + 0.5) / 12) * Math.PI * 2;
        return point(GARBA.x + Math.sin(angle) * (GARBA.radius + 1.4), 0, GARBA.z + Math.cos(angle) * (GARBA.radius + 1.4));
      }),
    [],
  );
  const { bulbs, lanterns, lanternGlows } = useMemo(() => {
    const bulbs: Light[] = [];
    const lanterns: Placement[] = [];
    const lanternGlows: Light[] = [];
    const hub = point(GARBA.x, 8.2, GARBA.z);
    poles.forEach(([x, , z], index) => {
      const top = point(x, 3.9, z);
      sag(hub, top, 22, 1.0).forEach((position, bulb) => bulbs.push({ position, color: FESTIVE_COLORS[(bulb + index) % FESTIVE_COLORS.length] }));
      const [nx, , nz] = poles[(index + 1) % poles.length];
      sag(top, point(nx, 3.9, nz), 12, 0.45).forEach((position) => bulbs.push({ position, color: "#ffd27a" }));
      const color = ["#ff5a36", "#ff9f1c", "#ff4f8b", "#ffd23f"][index % 4];
      lanterns.push({ position: point(x, 4.1, z), scale: point(1, 1.3, 1), color });
      lanternGlows.push({ position: point(x, 4.1, z), color });
    });
    return { bulbs, lanterns, lanternGlows };
  }, [poles]);
  const poleSticks = useMemo(() => poles.map(([x, , z]) => ({ position: point(x, 1.95, z) })), [poles]);

  return (
    <group>
      <Instanced placements={poleSticks}>
        <cylinderGeometry args={[0.06, 0.08, 3.9, 6]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.7} />
      </Instanced>
      <Instanced placements={lanterns}>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </Instanced>
      <GlowPoints lights={bulbs} size={0.6} twinkle />
      <GlowPoints lights={lanternGlows} size={2.4} opacity={0.7} />
    </group>
  );
}

function Stage() {
  const crowd = useMemo(() => figures(3, 11, 0.7), []);
  const speakers = useMemo<Placement[]>(
    () =>
      [-2.5, 2.5].map((offset) => ({
        position: point(STAGE.position[0] + Math.cos(STAGE.yaw) * offset, 1.25, STAGE.position[2] - Math.sin(STAGE.yaw) * offset),
        rotation: point(0, STAGE.yaw, 0),
      })),
    [],
  );
  return (
    <group>
      <group position={STAGE.position} rotation={[0, STAGE.yaw, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[4.4, 0.6, 2.4]} />
          <meshStandardMaterial color="#5a1420" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <boxGeometry args={[4.5, 0.03, 2.5]} />
          <Gold roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.0, -1.15]}>
          <planeGeometry args={[4.4, 2.8]} />
          <meshStandardMaterial color="#7a1626" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.2, 0.85, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.6, 16]} />
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </mesh>
        <mesh position={[-1.0, 0.78, 0.5]}>
          <boxGeometry args={[0.6, 0.3, 0.4]} />
          <meshStandardMaterial color="#6b3b1f" roughness={0.6} />
        </mesh>
      </group>
      <Instanced placements={speakers}>
        <boxGeometry args={[0.6, 2.5, 0.55]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </Instanced>
      <People crowd={crowd} arrange={musicians} />
    </group>
  );
}

const STALLS = [
  { z: 24.5, label: "Dinner", stripe: "#e8761c" },
  { z: 28.9, label: "Dinner", stripe: "#c2185b" },
  { z: 33.3, label: "Chai", stripe: "#2e7d32" },
  { z: 37.7, label: "Sweets", stripe: "#7c3aed" },
];
const STALL_X = -29;
const TABLE_XS = [-24, -20.8, -17.6];
const TABLE = { from: 25.2, to: 37.2 };

function Stall({ z, label, stripe }: { z: number; label: string; stripe: string }) {
  const stripes = useMemo(() => {
    const texture = stripeTexture(stripe).clone();
    texture.repeat.set(4, 1);
    return texture;
  }, [stripe]);
  const sign = useMemo(() => signTexture(label, "#6d1424", 512, 128), [label]);
  return (
    <group position={[STALL_X, 0, z]}>
      <mesh position={[1.2, 0.5, 0]}>
        <boxGeometry args={[1.0, 1.0, 3.4]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.8} />
      </mesh>
      <mesh position={[1.71, 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.4, 0.9]} />
        <meshStandardMaterial map={stripes} roughness={0.9} />
      </mesh>
      <mesh position={[1.2, 1.04, 0]}>
        <boxGeometry args={[1.2, 0.08, 3.6]} />
        <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
      </mesh>
      <mesh position={[-0.4, 1.4, 0]}>
        <boxGeometry args={[0.12, 2.8, 3.8]} />
        <meshStandardMaterial color="#f3e6cc" roughness={0.9} />
      </mesh>
      {[-1.85, 1.85].map((dz) => (
        <mesh key={dz} position={[1.95, 1.4, dz]}>
          <cylinderGeometry args={[0.06, 0.06, 2.8, 6]} />
          <meshStandardMaterial color="#5b3a1e" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0.8, 2.95, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[2.9, 0.06, 4.1]} />
        <meshStandardMaterial map={stripes} roughness={0.85} />
      </mesh>
      <mesh position={[2.06, 2.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
      {[-1, 0, 1].map((slot) => (
        <mesh key={slot} position={[1.15, 1.24, slot * 1.0]}>
          <cylinderGeometry args={[0.2, 0.16, 0.32, 14]} />
          <Gold roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function DinnerArea() {
  const plates = useMemo(
    () =>
      TABLE_XS.flatMap((x) => [-0.32, 0.32].flatMap((side) => along(point(x + side, 0.8, TABLE.from + 0.6), point(x + side, 0.8, TABLE.to - 0.6), 0.95))),
    [],
  );
  const plateMeshes = useMemo(() => plates.map((position) => ({ position })), [plates]);
  const food = useMemo(
    () => plates.map(([x, y, z], index) => ({ position: point(x, y + 0.02, z), color: ["#f5b041", "#e67e22", "#f4d03f", "#a04000"][index % 4] })),
    [plates],
  );
  const seats = useMemo(() => {
    const random = seeded(23);
    return TABLE_XS.flatMap((x) =>
      [-1, 1].flatMap((side) =>
        along(point(x + side * 0.95, 0, TABLE.from + 0.6), point(x + side * 0.95, 0, TABLE.to - 0.6), 0.95)
          .filter(() => random() < 0.45)
          .map(([sx, , sz]) => ({ x: sx, z: sz, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2 })),
      ),
    );
  }, []);
  const crowd = useMemo(() => figures(seats.length, 31), [seats]);
  const diners = useMemo<Arrange>(
    () => (index, time, pose) => {
      const seat = seats[index];
      pose.x = seat.x;
      pose.z = seat.z;
      pose.yaw = seat.yaw + 0.15 * Math.sin(time * 0.7 + index);
      pose.legs = 0.55;
    },
    [seats],
  );
  const { lanterns, glows, posts } = useMemo(() => {
    const lanterns: Placement[] = [];
    const glows: Light[] = [];
    const posts: Placement[] = [];
    [-25.6, -22.4, -19.2, -16].forEach((x, row) => {
      posts.push({ position: point(x, 1.8, TABLE.from - 1.2) }, { position: point(x, 1.8, TABLE.to + 1.2) });
      sag(point(x, 3.6, TABLE.from - 1.2), point(x, 3.6, TABLE.to + 1.2), 12, 0.55).forEach((position, index) => {
        const color = ["#ff5a36", "#ff9f1c", "#ff4f8b", "#ffd23f"][(index + row) % 4];
        lanterns.push({ position: point(position[0], position[1] - 0.3, position[2]), scale: point(1, 1.3, 1), color });
        glows.push({ position: point(position[0], position[1] - 0.3, position[2]), color });
      });
    });
    return { lanterns, glows, posts };
  }, []);
  const stallLamps = useMemo<Light[]>(() => STALLS.map(({ z }) => ({ position: point(STALL_X + 1.3, 2.6, z), color: "#ffd9a0" })), []);
  const benches = useMemo<Placement[]>(
    () => TABLE_XS.flatMap((x) => [-0.95, 0.95].map((side) => ({ position: point(x + side, 0.22, (TABLE.from + TABLE.to) / 2) }))),
    [],
  );
  const tables = useMemo<Placement[]>(() => TABLE_XS.map((x) => ({ position: point(x, 0.39, (TABLE.from + TABLE.to) / 2) })), []);

  return (
    <group>
      <mesh position={[-22, 0.03, 31]}>
        <boxGeometry args={[16, 0.06, 18]} />
        <meshStandardMaterial color="#cdbfa6" roughness={0.95} />
      </mesh>
      {STALLS.map((stall) => (
        <Stall key={stall.z} {...stall} />
      ))}
      <Instanced placements={tables}>
        <boxGeometry args={[1.15, 0.78, TABLE.to - TABLE.from]} />
        <meshStandardMaterial color="#f2ece2" roughness={0.85} />
      </Instanced>
      <Instanced placements={benches}>
        <boxGeometry args={[0.38, 0.44, TABLE.to - TABLE.from]} />
        <meshStandardMaterial color="#6b4226" roughness={0.8} />
      </Instanced>
      <Instanced placements={plateMeshes}>
        <cylinderGeometry args={[0.15, 0.13, 0.025, 14]} />
        <meshStandardMaterial color="#f7f7f2" roughness={0.3} />
      </Instanced>
      <Instanced placements={food}>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 10]} />
        <meshStandardMaterial roughness={0.7} />
      </Instanced>
      <People crowd={crowd} arrange={diners} />
      <Instanced placements={posts}>
        <cylinderGeometry args={[0.06, 0.08, 3.6, 6]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.7} />
      </Instanced>
      <Instanced placements={lanterns}>
        <sphereGeometry args={[0.17, 12, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </Instanced>
      <GlowPoints lights={glows} size={1.5} opacity={0.75} />
      <GlowPoints lights={stallLamps} size={2.6} opacity={0.8} />
      <pointLight position={[-21, 4.5, 31]} color="#ffc98a" intensity={60} distance={22} decay={2} />
    </group>
  );
}

const WORKSHOP = { x: 22, z: 31, width: 10, depth: 8 };
const WORKSHOP_EAVES = [WORKSHOP.z - WORKSHOP.depth / 2 - 0.27, WORKSHOP.z + WORKSHOP.depth / 2 + 0.27];

const LEARNER_SPOTS = [0, 1, 2].flatMap((row) => [-2.4, -0.8, 0.8, 2.4].map((dx) => ({ dx, dz: -0.4 + row * 1.4 })));

const workshop: Arrange = (index, time, pose) => {
  const beat = Math.sin(time * 1.7);
  pose.y = 0.2;
  pose.clap = 0.5 + 0.5 * Math.sin(time * 3.4);
  pose.bob = 0.04 * Math.abs(Math.sin(time * 3.4));
  if (index === 0) {
    pose.x = WORKSHOP.x - beat * 0.25;
    pose.z = WORKSHOP.z - 2.6;
    pose.yaw = 0.4 * beat;
    return;
  }
  const spot = LEARNER_SPOTS[index - 1];
  pose.x = WORKSHOP.x + spot.dx + beat * 0.22;
  pose.z = WORKSHOP.z + spot.dz;
  pose.yaw = Math.PI - 0.4 * beat + 0.1 * Math.sin(index);
};

function Workshop() {
  const crowd = useMemo(() => {
    const learners = figures(LEARNER_SPOTS.length, 41, 0.3);
    return [{ outfit: "#c2185b", top: "#f5c518", skin: "#a8683a", stick: "#f5c518", build: 1 }, ...learners];
  }, []);
  const { x, z, width, depth } = WORKSHOP;
  const posts = useMemo<Placement[]>(
    () => [x - width / 2 + 0.2, x, x + width / 2 - 0.2].flatMap((px) => [z - depth / 2 + 0.2, z + depth / 2 - 0.2].map((pz) => ({ position: point(px, 1.9, pz) }))),
    [x, z, width, depth],
  );
  const bunting = useMemo<Placement[]>(
    () =>
      WORKSHOP_EAVES.flatMap((ez) =>
        along(point(x - width / 2 - 0.2, 3.5, ez), point(x + width / 2 + 0.2, 3.5, ez), 0.5).map((position, index) => ({
          position,
          color: ["#e11d74", "#f5c518", "#16a34a", "#0ea5e9", "#f97316"][index % 5],
        })),
      ),
    [x, width],
  );
  const bulbs = useMemo<Light[]>(
    () =>
      WORKSHOP_EAVES.flatMap((ez) =>
        along(point(x - width / 2 - 0.2, 3.58, ez), point(x + width / 2 + 0.2, 3.58, ez), 0.32).map((position) => ({ position, color: "#ffd27a" })),
      ),
    [x, width],
  );
  const pennant = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.17, 0);
    shape.lineTo(0.17, 0);
    shape.lineTo(0, -0.34);
    shape.closePath();
    return shape;
  }, []);
  const banner = useMemo(() => signTexture("Garba Workshop", "#6d1424", 768, 128), []);
  const ridge = 5.02;
  const slope = 0.32;
  const half = depth / 2 + 0.25;

  return (
    <group>
      <mesh position={[x, 0.1, z]}>
        <boxGeometry args={[width, 0.2, depth]} />
        <meshStandardMaterial color="#8a5a33" roughness={0.75} />
      </mesh>
      <Instanced placements={posts}>
        <cylinderGeometry args={[0.09, 0.09, 3.4, 8]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.6} />
      </Instanced>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[x, ridge - (half / 2) * Math.sin(slope), z + side * (half / 2) * Math.cos(slope)]}
          rotation={[side * slope, 0, 0]}
        >
          <boxGeometry args={[width + 0.6, 0.08, half]} />
          <meshStandardMaterial color="#f6f1e6" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {WORKSHOP_EAVES.map((ez) => (
        <mesh key={ez} position={[x, 3.6, ez]}>
          <boxGeometry args={[width + 0.6, 0.16, 0.12]} />
          <meshStandardMaterial color="#e8761c" roughness={0.6} />
        </mesh>
      ))}
      <Instanced placements={bunting}>
        <shapeGeometry args={[pennant]} />
        <meshStandardMaterial roughness={0.8} side={THREE.DoubleSide} />
      </Instanced>
      <GlowPoints lights={bulbs} size={0.55} twinkle />
      <mesh position={[x, 3.05, z + depth / 2 + 0.36]}>
        <planeGeometry args={[4.2, 0.7]} />
        <meshStandardMaterial map={banner} emissive="#ffffff" emissiveMap={banner} emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * 4.3, 0.95, z - depth / 2 + 0.6]}>
          <boxGeometry args={[0.55, 1.5, 0.5]} />
          <meshStandardMaterial color="#141414" roughness={0.5} />
        </mesh>
      ))}
      <People crowd={crowd} arrange={workshop} />
      <pointLight position={[x, 3.2, z]} color="#ffd29a" intensity={40} distance={15} decay={2} />
    </group>
  );
}

export function Festival() {
  const dancers = useMemo(() => figures(RING_SLOTS.length, 3), []);
  const watchers = useMemo(() => figures(SPECTATOR_ANGLES.length, 17, 0.5), []);
  return (
    <group>
      <Mandvi />
      <CanopyOfLights />
      <People crowd={dancers} arrange={garbaCircle} />
      <People crowd={watchers} arrange={spectators} />
      <Stage />
      <DinnerArea />
      <Workshop />
    </group>
  );
}
