import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/awesomechicken.glb";

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function ChickenModel() {
  const groupRef = useRef<THREE.Group>(null);
  const appearRef = useRef(0);
  const { scene } = useGLTF(MODEL_URL);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    appearRef.current = Math.min(appearRef.current + delta * 1.85, 1);
    group.scale.setScalar(easeOutBack(appearRef.current));
    group.rotation.y += delta * 1.35;
    group.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.12;
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={scene} dispose={null} scale={24} />
      </Center>
    </group>
  );
}

export default function RotatingChicken() {
  return (
    <Canvas
      className="pointer-events-none"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.45, 4.2], fov: 30 }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2.8, 4.2, 3.2]} intensity={2.6} />
      <directionalLight position={[-3.2, 1.6, -2]} intensity={0.55} />
      <spotLight
        position={[0, 5.2, 2.4]}
        intensity={1.35}
        angle={0.45}
        penumbra={0.65}
      />
      <Suspense fallback={null}>
        <ChickenModel />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
