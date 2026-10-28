"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seeded } from "./instances";
import { useMotion } from "./motion";

type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  spin: number;
  flare: number;
  bob: number;
  clap: number;
  legs: number;
};

type Figure = { outfit: string; top: string; skin: string; stick: string; build: number };

export type Arrange = (index: number, time: number, pose: Pose) => void;

const OUTFITS = ["#e11d74", "#f59e0b", "#16a34a", "#7c3aed", "#dc2626", "#0ea5e9", "#f97316", "#db2777", "#65a30d", "#eab308", "#be123c"];
const KURTAS = ["#f5efe0", "#fde68a", "#7f1d1d", "#1e3a8a", "#f8fafc"];
const SKIN = ["#8d5524", "#a8683a", "#c68642", "#7a4a2a", "#b5774a"];
const STICKS = ["#e11d74", "#f5c518", "#16a34a", "#0ea5e9", "#f97316"];

export function figures(count: number, seed: number, menShare = 0.35): Figure[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    const man = random() < menShare;
    const outfit = man ? KURTAS[Math.floor(random() * KURTAS.length)] : OUTFITS[Math.floor(random() * OUTFITS.length)];
    return {
      outfit,
      top: man ? outfit : OUTFITS[(index * 3 + 5) % OUTFITS.length],
      skin: SKIN[Math.floor(random() * SKIN.length)],
      stick: STICKS[index % STICKS.length],
      build: man ? 0.6 : 1,
    };
  });
}

function resetPose(pose: Pose): Pose {
  pose.x = pose.y = pose.z = pose.yaw = pose.spin = pose.bob = 0;
  pose.flare = pose.legs = 1;
  pose.clap = -1;
  return pose;
}

export function People({ crowd, arrange }: { crowd: Figure[]; arrange: Arrange }) {
  const animate = useMotion();
  const skirts = useRef<THREE.InstancedMesh>(null);
  const torsos = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
  const sticks = useRef<THREE.InstancedMesh>(null);
  const work = useMemo(() => {
    const stick = new THREE.Object3D();
    stick.rotation.order = "YXZ";
    return { body: new THREE.Object3D(), stick, pose: { x: 0, y: 0, z: 0, yaw: 0, spin: 0, flare: 1, bob: 0, clap: -1, legs: 1 } };
  }, []);

  const place = (time: number) => {
    const [skirtMesh, torsoMesh, headMesh, hairMesh, stickMesh] = [skirts.current, torsos.current, heads.current, hair.current, sticks.current];
    if (!skirtMesh || !torsoMesh || !headMesh || !hairMesh || !stickMesh) return;
    const { body, stick, pose } = work;

    crowd.forEach((figure, index) => {
      arrange(index, time, resetPose(pose));
      const facing = pose.yaw + pose.spin;
      const drop = (1 - pose.legs) * 0.9;
      const base = pose.y + pose.bob;

      body.rotation.set(0, facing, 0);
      body.position.set(pose.x, base + 0.47 * pose.legs, pose.z);
      body.scale.set(figure.build * pose.flare, pose.legs, figure.build * pose.flare);
      body.updateMatrix();
      skirtMesh.setMatrixAt(index, body.matrix);

      body.scale.set(1, 1, 1);
      body.position.set(pose.x, base + 1.12 - drop, pose.z);
      body.updateMatrix();
      torsoMesh.setMatrixAt(index, body.matrix);

      body.position.set(pose.x, base + 1.47 - drop, pose.z);
      body.updateMatrix();
      headMesh.setMatrixAt(index, body.matrix);

      body.position.set(pose.x - Math.sin(facing) * 0.08, base + 1.52 - drop, pose.z - Math.cos(facing) * 0.08);
      body.updateMatrix();
      hairMesh.setMatrixAt(index, body.matrix);

      [-1, 1].forEach((side, hand) => {
        const reach = 0.22;
        const forward = 0.16;
        stick.position.set(
          pose.x + side * reach * Math.cos(facing) + forward * Math.sin(facing),
          base + 1.2 - drop,
          pose.z - side * reach * Math.sin(facing) + forward * Math.cos(facing),
        );
        stick.rotation.set(-0.35 - 0.55 * Math.max(pose.clap, 0), facing, side * (0.25 + 0.45 * Math.max(pose.clap, 0)));
        stick.scale.setScalar(pose.clap < 0 ? 0 : 1);
        stick.updateMatrix();
        stickMesh.setMatrixAt(index * 2 + hand, stick.matrix);
      });
    });

    for (const mesh of [skirtMesh, torsoMesh, headMesh, hairMesh, stickMesh]) mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const color = new THREE.Color();
    crowd.forEach((figure, index) => {
      skirts.current?.setColorAt(index, color.set(figure.outfit));
      torsos.current?.setColorAt(index, color.set(figure.top));
      heads.current?.setColorAt(index, color.set(figure.skin));
      sticks.current?.setColorAt(index * 2, color.set(figure.stick));
      sticks.current?.setColorAt(index * 2 + 1, color.set(figure.stick));
    });
    for (const mesh of [skirts.current, torsos.current, heads.current, sticks.current]) {
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    place(0);
    for (const mesh of [skirts.current, torsos.current, heads.current, hair.current, sticks.current]) {
      mesh?.computeBoundingSphere();
      if (mesh?.boundingSphere) mesh.boundingSphere.radius += 1.5;
    }
  }, [crowd]);

  useFrame(({ clock }) => {
    if (animate) place(clock.elapsedTime);
  });

  const count = crowd.length;
  return (
    <group>
      <instancedMesh ref={skirts} args={[undefined, undefined, count]}>
        <coneGeometry args={[0.38, 0.94, 14]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={torsos} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.12, 0.15, 0.42, 10]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.115, 12, 10]} />
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={hair} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#17110c" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={sticks} args={[undefined, undefined, count * 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.42, 6]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
    </group>
  );
}
