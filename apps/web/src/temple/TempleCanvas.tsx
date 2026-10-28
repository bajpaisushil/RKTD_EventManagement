"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Temple } from "./Temple";

type Props = { animate: boolean; interactive: boolean };

function FullMoon() {
  return (
    <group position={[-3.4, 2.5, -9]}>
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#fdf3e4" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#d1ac3e" transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function TempleCanvas({ animate, interactive }: Props) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop={animate ? "always" : "demand"}
      camera={{ position: [5.6, 2.4, 6.9], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#fdf3e4", "#2c2c2c", 0.6]} />
      <directionalLight position={[-4, 6, 3]} intensity={1.4} color="#fff4dc" castShadow shadow-mapSize={[1024, 1024]} />

      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2} color="#fff1cc" position={[0, 5, -5]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#c99b24" position={[5, 1, 3]} scale={[4, 4, 1]} />
      </Environment>

      <FullMoon />
      <group position={[0, -1.55, 0]}>
        <Temple />
        <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={9} blur={2.4} far={3} color="#000000" />
      </group>
      {animate && <Sparkles count={45} scale={[7, 4, 6]} position={[0, 1, 0]} size={2.5} speed={0.25} color="#d1ac3e" />}

      <OrbitControls
        target={[0, 0.35, 0]}
        enablePan={false}
        enableZoom={false}
        enableRotate={interactive}
        autoRotate={animate}
        autoRotateSpeed={0.45}
        minPolarAngle={1.05}
        maxPolarAngle={1.45}
      />
    </Canvas>
  );
}
