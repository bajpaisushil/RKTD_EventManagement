"use client";

import type { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef, type RefObject } from "react";
import * as THREE from "three";
import { GARBA } from "./Grounds";
import type { Orbit, Stop } from "./stops";

type Controls = ComponentRef<typeof OrbitControls>;

type Flight = {
  curve: THREE.CatmullRomCurve3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
};

const DEFAULT_ORBIT: Orbit = { azimuth: 0.8, up: 0.4, down: 0.12, near: 0.55, far: 1.25 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function freeLimits(controls: Controls): void {
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
}

function fitLimits(controls: Controls, camera: THREE.Camera, stop: Stop): void {
  const orbit = { ...DEFAULT_ORBIT, ...stop.orbit };
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  const azimuth = Math.atan2(offset.x, offset.z);
  const polar = Math.acos(clamp(offset.y / distance, -1, 1));
  controls.minDistance = distance * orbit.near;
  controls.maxDistance = distance * orbit.far;
  controls.minAzimuthAngle = azimuth - orbit.azimuth;
  controls.maxAzimuthAngle = azimuth + orbit.azimuth;
  controls.minPolarAngle = Math.max(0.15, polar - orbit.up);
  controls.maxPolarAngle = Math.max(polar + 0.001, Math.min(polar + orbit.down, Math.PI / 2 - 0.04));
}

function portraitReach(aspect: number): number {
  return aspect >= 1 ? 1 : clamp(aspect ** -0.55, 1, 1.6);
}

function cameraFor(stop: Stop, aspect: number): THREE.Vector3 {
  const target = new THREE.Vector3(...stop.target);
  const reach = Math.min(portraitReach(aspect), stop.reach ?? Infinity);
  return new THREE.Vector3(...stop.camera).sub(target).multiplyScalar(reach).add(target);
}

function passesPole(from: THREE.Vector3, to: THREE.Vector3): boolean {
  const path = new THREE.Vector2(to.x - from.x, to.z - from.z);
  const toPole = new THREE.Vector2(GARBA.x - from.x, GARBA.z - from.z);
  const along = toPole.dot(path) / Math.max(path.lengthSq(), 0.0001);
  const closest = new THREE.Vector2(from.x, from.z).addScaledVector(path, clamp(along, 0, 1));
  return along > 0.05 && along < 0.95 && closest.distanceTo(new THREE.Vector2(GARBA.x, GARBA.z)) < 4;
}

function route(from: THREE.Vector3, leaving: Stop | null, arriving: Stop, destination: THREE.Vector3): THREE.Vector3[] {
  const points = [from.clone()];
  if (leaving?.via) points.push(new THREE.Vector3(...leaving.via));
  const last = points[points.length - 1];
  const next = arriving.via ? new THREE.Vector3(...arriving.via) : destination.clone();
  const gap = last.distanceTo(next);
  if (passesPole(last, next)) {
    points.push(new THREE.Vector3(GARBA.x + 2.5, 11.5, GARBA.z));
  } else if (gap > 12) {
    const crest = new THREE.Vector3().lerpVectors(last, next, 0.5);
    crest.y += clamp(gap * 0.15, 1.2, 8);
    points.push(crest);
  }
  if (arriving.via) points.push(new THREE.Vector3(...arriving.via));
  points.push(destination.clone());
  return points.filter((candidate, index) => index === 0 || candidate.distanceTo(points[index - 1]) > 0.05);
}

export function CameraRig({ stop, previous, controls, instant }: { stop: Stop; previous: Stop | null; controls: RefObject<Controls | null>; instant: boolean }) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const flight = useRef<Flight | null>(null);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const destination = cameraFor(stop, aspect);
    const target = new THREE.Vector3(...stop.target);

    if (instant) {
      flight.current = null;
      freeLimits(orbit);
      camera.position.copy(destination);
      orbit.target.copy(target);
      orbit.update();
      fitLimits(orbit, camera, stop);
      orbit.enabled = true;
      invalidate();
      return;
    }

    const points = route(camera.position, previous, stop, destination);
    const curve = new THREE.CatmullRomCurve3(points.length > 1 ? points : [camera.position.clone(), destination], false, "centripetal");
    flight.current = {
      curve,
      fromTarget: orbit.target.clone(),
      toTarget: target,
      elapsed: 0,
      duration: clamp(curve.getLength() / 16, 1.6, 4.2),
    };
    freeLimits(orbit);
    orbit.enabled = false;
  }, [stop.id, instant]);

  useFrame((_, delta) => {
    const current = flight.current;
    const orbit = controls.current;
    if (!current || !orbit) return;
    current.elapsed += Math.min(delta, 0.1);
    const progress = Math.min(current.elapsed / current.duration, 1);
    const eased = easeInOut(progress);
    camera.position.copy(current.curve.getPointAt(eased));
    orbit.target.lerpVectors(current.fromTarget, current.toTarget, eased);
    camera.lookAt(orbit.target);
    if (progress >= 1) {
      flight.current = null;
      orbit.update();
      fitLimits(orbit, camera, stop);
      orbit.enabled = true;
    }
  });

  return null;
}
