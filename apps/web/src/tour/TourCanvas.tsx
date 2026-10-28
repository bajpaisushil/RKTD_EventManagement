"use client";

import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { Festival } from "./Festival";
import { GrandTemple } from "./GrandTemple";
import { Grounds } from "./Grounds";
import { MotionContext, useMotion } from "./motion";
import { START, type Stop } from "./stops";

export type Framing = { x: number; y: number };

type Props = { stop: Stop; previous: Stop | null; animate: boolean; framing: Framing; onReady: () => void };

function FrameShift({ x, y }: Framing) {
  const animate = useMotion();
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const current = useRef<Framing>({ x, y });

  useEffect(() => invalidate(), [x, y, invalidate]);

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const ease = animate ? 1 - Math.exp(-delta * 5) : 1;
    current.current.x += (x - current.current.x) * ease;
    current.current.y += (y - current.current.y) * ease;
    camera.setViewOffset(size.width, size.height, -current.current.x * size.width, current.current.y * size.height, size.width, size.height);
    if (animate && (Math.abs(x - current.current.x) > 0.001 || Math.abs(y - current.current.y) > 0.001)) invalidate();
  });
  return null;
}

function PortraitLens() {
  const camera = useThree((state) => state.camera);
  const portrait = useThree((state) => state.size.width < state.size.height);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = portrait ? 62 : 50;
    camera.updateProjectionMatrix();
  }, [camera, portrait]);
  return null;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const signalled = useRef(false);
  useFrame(() => {
    if (signalled.current) return;
    signalled.current = true;
    onReady();
  });
  return null;
}

const Scene = memo(function Scene() {
  return (
    <>
      <Grounds />
      <GrandTemple />
      <Festival />
    </>
  );
});

export default function TourCanvas({ stop, previous, animate, framing, onReady }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [maxDpr, setMaxDpr] = useState(() => (window.matchMedia("(pointer: coarse)").matches ? 1.25 : 1.6));

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, maxDpr]}
      frameloop={animate ? "always" : "demand"}
      camera={{ position: START.camera, fov: 50, near: 0.1, far: 900 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ camera }) => camera.lookAt(...START.target)}
      style={{ touchAction: "none" }}
    >
      <MotionContext value={animate}>
        <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
        <color attach="background" args={["#0d0a1c"]} />
        <fog attach="fog" args={["#1c1533", 70, 230]} />
        <ambientLight intensity={0.15} />
        <hemisphereLight args={["#5b5a8f", "#1b2a1b", 0.55]} />
        <directionalLight position={[-30, 40, 40]} intensity={0.55} color="#b9c6ff" />
        <Environment resolution={64}>
          <Lightformer form="rect" intensity={1.6} color="#fff1cc" position={[0, 6, -8]} scale={[12, 4, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#c99b24" position={[8, 2, 6]} scale={[6, 4, 1]} />
          <Lightformer form="ring" intensity={0.6} color="#8f8cff" position={[-6, 8, 4]} scale={4} />
        </Environment>
        <Scene />
        <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.55} zoomSpeed={0.7} />
        <CameraRig stop={stop} previous={previous} controls={controls} instant={!animate} />
        <FrameShift x={framing.x} y={framing.y} />
        <PortraitLens />
        <ReadySignal onReady={onReady} />
      </MotionContext>
    </Canvas>
  );
}
