import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createDieGeometry, faceTransform, getDieFaceFrames } from "./diceGeometry";
import { createMarkTexture } from "./markTexture";
import type { DiceConfig } from "./types";

function FaceMark({
  value,
  style,
  graphicData,
  patternScale,
  randomPips,
  pipSeed,
  faceIndex,
  font,
  matrix,
  radius,
}: {
  value: string;
  style: DiceConfig["markStyle"];
  graphicData: string;
  patternScale: number;
  randomPips: boolean;
  pipSeed: number;
  faceIndex: number;
  font: DiceConfig["font"];
  matrix: THREE.Matrix4;
  radius: number;
}) {
  const texture = useMemo(
    () => createMarkTexture(value, style, graphicData, patternScale, randomPips, pipSeed, faceIndex, font),
    [value, style, graphicData, patternScale, randomPips, pipSeed, faceIndex, font],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh matrixAutoUpdate={false} matrix={matrix} renderOrder={2}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={texture}
        bumpScale={-0.22}
        roughness={0.9}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

function Die({ config }: { config: DiceConfig }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => createDieGeometry(
      config.sides,
      config.size,
      config.edge,
      config.sphereCut,
      config.sphereCutAmount,
    ),
    [config.sides, config.size, config.edge, config.sphereCut, config.sphereCutAmount],
  );
  const frames = useMemo(
    () => getDieFaceFrames(config.sides, config.size),
    [config.sides, config.size],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
  });

  return (
    <group ref={group} rotation={[0.38, -0.55, -0.08]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={config.color}
          roughness={0.38}
          metalness={0.04}
          clearcoat={0.28}
          clearcoatRoughness={0.55}
        />
      </mesh>
      {frames.slice(0, config.sides).map((frame, index) => {
        const offset = frame.center.clone().addScaledVector(frame.normal, 0.025);
        const positioned = { ...frame, center: offset };
        return (
          <FaceMark
            key={`${config.sides}-${index}-${config.values[index]}-${config.pipSeed}`}
            value={config.values[index] || ""}
            style={config.markStyle}
            graphicData={config.graphicData}
            patternScale={config.patternScale}
            randomPips={config.randomPips}
            pipSeed={config.pipSeed}
            faceIndex={index}
            font={config.font}
            matrix={faceTransform(positioned)}
            radius={frame.inradius}
          />
        );
      })}
    </group>
  );
}

export default function DiceScene({ config }: { config: DiceConfig }) {
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
      <Suspense fallback={null}>
        <Die config={config} />
      </Suspense>
      <ContactShadows position={[0, -11, 0]} opacity={0.48} scale={42} blur={2.8} far={24} />
      <gridHelper args={[60, 30, "#50564e", "#30332e"]} position={[0, -11.4, 0]} />
      <OrbitControls enablePan={false} minDistance={24} maxDistance={58} autoRotate={false} />
    </Canvas>
  );
}
