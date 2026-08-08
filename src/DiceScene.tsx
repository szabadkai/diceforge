import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { printableConfigKey } from "./modelConfig";
import type { DiceConfig } from "./types";

type DiceSceneProps = {
  config: DiceConfig;
  onBuildStart: () => void;
  onModelReady: (stl: Blob, configKey: string) => void;
  onBuildError: (configKey: string) => void;
};

function Die({ config, onBuildStart, onModelReady, onBuildError }: DiceSceneProps) {
  const group = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const generation = useRef(0);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const configKey = printableConfigKey(config);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    let cancelled = false;
    onBuildStart();

    // Avoid launching a costly boolean for every intermediate slider event.
    const timer = window.setTimeout(async () => {
      try {
        const { buildDiceStl, parseDiceStl } = await import("./stlExport");
        const stl = await buildDiceStl(config);
        const nextGeometry = await parseDiceStl(stl);
        nextGeometry.computeBoundingBox();
        if (cancelled || currentGeneration !== generation.current) {
          nextGeometry.dispose();
          return;
        }
        geometryRef.current?.dispose();
        geometryRef.current = nextGeometry;
        setGeometry(nextGeometry);
        onModelReady(stl, configKey);
      } catch (error) {
        if (cancelled || currentGeneration !== generation.current) return;
        console.error(error);
        onBuildError(configKey);
      }
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    configKey,
    onBuildStart,
    onModelReady,
    onBuildError,
  ]);

  useEffect(() => () => {
    generation.current += 1;
    geometryRef.current?.dispose();
    geometryRef.current = null;
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
  });

  const meshPosition = geometry && config.bladeSupports
    ? geometry.boundingBox?.getCenter(new THREE.Vector3()).negate() ?? new THREE.Vector3()
    : new THREE.Vector3();

  return (
    <group ref={group} rotation={config.bladeSupports ? [-1.18, 0, -0.18] : [0.38, -0.55, -0.08]}>
      {geometry && (
        <mesh
          geometry={geometry}
          position={meshPosition}
          scale={config.bladeSupports ? 0.62 : 1}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={config.color}
            roughness={0.38}
            metalness={0.04}
            clearcoat={0.28}
            clearcoatRoughness={0.55}
          />
        </mesh>
      )}
    </group>
  );
}

export default function DiceScene(props: DiceSceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [25, 18, 28], fov: 34 }}>
      <color attach="background" args={["#242722"]} />
      <fog attach="fog" args={["#242722", 35, 62]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={["#fff5df", "#1b211d", 0.72]} />
      <directionalLight
        castShadow
        position={[10, 16, 14]}
        intensity={4.8}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-14, 5, 6]} color="#ff7a3e" intensity={1.8} />
      <directionalLight position={[4, 7, -16]} color="#8db7ff" intensity={1.15} />
      <Die {...props} />
      <ContactShadows position={[0, -11, 0]} opacity={0.48} scale={42} blur={2.8} far={24} />
      <gridHelper args={[60, 30, "#50564e", "#30332e"]} position={[0, -11.4, 0]} />
      <OrbitControls enablePan={false} minDistance={24} maxDistance={58} autoRotate={false} />
    </Canvas>
  );
}
