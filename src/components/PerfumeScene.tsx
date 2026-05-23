"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import { useLiquid }    from "../hooks/useLiquid";
import { useFog }       from "../hooks/useFog";
import Particles        from "./Particles";

// ── Constants ─────────────────────────────────────────────────
const GOLD   = new THREE.Color("#c9a96e");
const RIMCOL = new THREE.Color("#e2c89a");

// ── Scroll tracker (outside React) ───────────────────────────
let scrollY = 0;
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });
}

// ────────────────────────────────────────────────────────────
//  BOTTLE — load .obj + glass material
// ────────────────────────────────────────────────────────────
function Bottle({ onShake }: { onShake: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const obj      = useLoader(OBJLoader, "/perfume-bottle.obj");

  // Apply glass material ke semua mesh dalam .obj
  useEffect(() => {
    if (!obj) return;
    obj.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshPhysicalMaterial({
          color:               new THREE.Color("#1a1208"),
          transmission:        0.92,
          roughness:           0.04,
          metalness:           0.08,
          thickness:           1.4,
          ior:                 1.52,
          transparent:         true,
          opacity:             0.88,
          envMapIntensity:     1.5,
          attenuationColor:    new THREE.Color("#c9a96e"),
          attenuationDistance: 0.6,
          side:                THREE.FrontSide,
        });
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
      }
    });
  }, [obj]);

  // Idle rotate + scroll rotate
  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.getElapsedTime();

    // Idle: gentle rock + breathe
    const idleY   = t * 0.18;
    const idleX   = Math.sin(t * 0.4) * 0.03;
    const idleZ   = Math.cos(t * 0.31) * 0.018;
    const breathe = Math.sin(t * 0.6) * 0.012;

    // Scroll: tambah rotasi Y
    const scrollRot = (scrollY / window.innerHeight) * Math.PI * 1.2;

    group.rotation.y = idleY + scrollRot;
    group.rotation.x = idleX;
    group.rotation.z = idleZ;
    group.position.y = breathe;
  });

  if (!obj) return null;

  return (
    <group ref={groupRef} onPointerEnter={onShake}>
      <primitive object={obj} scale={[1, 1, 1]} />
    </group>
  );
}

// ────────────────────────────────────────────────────────────
//  LIQUID — shader plane inside bottle
// ────────────────────────────────────────────────────────────
function Liquid() {
  const { materialRef, uniforms, vertexShader, fragmentShader, shake } = useLiquid();

  return (
    <mesh
      position={[0, -0.18, 0]}
      onPointerEnter={() => shake(0.8)}
    >
      {/* cylinder mengikuti interior botol */}
      <cylinderGeometry args={[0.265, 0.265, 1.1, 64, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ────────────────────────────────────────────────────────────
//  FOG LAYERS
// ────────────────────────────────────────────────────────────
function FogLayers() {
  const { fogLayers, refs } = useFog();

  return (
    <>
      {fogLayers.map((layer, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          position={[0, layer.y, 0]}
          scale={[layer.scale[0], layer.scale[1], layer.scale[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1, 1, 12, 12]} />
          <shaderMaterial
            vertexShader={layer.vertexShader}
            fragmentShader={layer.fragmentShader}
            uniforms={layer.uniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  LIGHTING RIG
// ────────────────────────────────────────────────────────────
function Lights() {
  const spotRef = useRef<THREE.SpotLight>(null);

  // Spot light slow drift biar dramatis
  useFrame(({ clock }) => {
    const light = spotRef.current;
    if (!light) return;
    const t = clock.getElapsedTime();
    light.position.x = Math.sin(t * 0.22) * 2.5;
    light.position.z = Math.cos(t * 0.18) * 2.5;
  });

  return (
    <>
      {/* Ambient — fill dasar, sangat redup */}
      <ambientLight intensity={0.08} color="#0a0805" />

      {/* Key light — dari atas, warm gold */}
      <spotLight
        ref={spotRef}
        position={[0, 5, 2]}
        intensity={18}
        angle={0.28}
        penumbra={0.9}
        color={GOLD}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.001}
      />

      {/* Rim light kiri — cool blue contrast */}
      <directionalLight
        position={[-3, 1.5, -2]}
        intensity={1.2}
        color="#1a2a3a"
      />

      {/* Rim light kanan — warm gold highlight */}
      <directionalLight
        position={[3, 0.5, -1]}
        intensity={2.0}
        color={RIMCOL}
      />

      {/* Under light — refraksi dari bawah */}
      <pointLight
        position={[0, -2, 0]}
        intensity={3.5}
        color="#3a1a00"
        distance={4}
        decay={2}
      />

      {/* Halo atas — aura gold */}
      <pointLight
        position={[0, 3, 0]}
        intensity={1.8}
        color={GOLD}
        distance={6}
        decay={2}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  FALLBACK — sebelum .obj selesai load
// ────────────────────────────────────────────────────────────
function BottleFallback() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.18;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.55, 1.2, 0.35]} />
      <meshPhysicalMaterial
        color="#1a1208"
        transmission={0.9}
        roughness={0.05}
        metalness={0.1}
        transparent
        opacity={0.85}
        thickness={1.2}
        ior={1.5}
      />
    </mesh>
  );
}

// ────────────────────────────────────────────────────────────
//  SCENE INNER (semua 3D objects)
// ────────────────────────────────────────────────────────────
function SceneInner() {
  const { shake } = useLiquid();

  return (
    <>
      <Lights />
      <FogLayers />
      <Particles />

      <Suspense fallback={<BottleFallback />}>
        <Bottle onShake={() => shake(0.8)} />
        <Liquid />
      </Suspense>
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  PERFUME SCENE — exported component
// ────────────────────────────────────────────────────────────
export default function PerfumeScene() {
  return (
    <div
      style={{
        position: "absolute",
        inset:    0,
        zIndex:   1,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 42, near: 0.1, far: 50 }}
        gl={{
          antialias:              true,
          alpha:                  true,
          powerPreference:        "high-performance",
          logarithmicDepthBuffer: true,
        }}
        shadows
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={["#0a0a0a", 6, 18]} />
        <SceneInner />
      </Canvas>
    </div>
  );
}