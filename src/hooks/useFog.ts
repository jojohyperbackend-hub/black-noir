import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Vertex Shader ────────────────────────────────────────────
const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;

  varying vec2  vUv;
  varying float vElevation;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Gelombang lambat biar fog keliatan bernapas
    float wave = sin(pos.x * 1.2 + uTime * uSpeed)
               * cos(pos.z * 0.9 + uTime * uSpeed * 0.7)
               * 0.06;

    pos.y += wave;
    vElevation = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ── Fragment Shader ──────────────────────────────────────────
const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uFogColor;
  uniform float uSpeed;
  uniform float uDensity;

  varying vec2  vUv;
  varying float vElevation;

  // Hash + noise ringan
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),             hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1, 1)), f.x),
      f.y
    );
  }

  // 2 oktaf FBM — cukup untuk fog, gak berat
  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p)       * 0.55;
    v += noise(p * 2.1) * 0.30;
    v += noise(p * 4.3) * 0.15;
    return v;
  }

  void main() {
    // UV drift — fog bergerak pelan
    vec2 uv1 = vUv + vec2(uTime * uSpeed * 0.04,  uTime * uSpeed * 0.025);
    vec2 uv2 = vUv + vec2(-uTime * uSpeed * 0.03, uTime * uSpeed * 0.018);

    float fog1 = fbm(uv1 * uDensity);
    float fog2 = fbm(uv2 * uDensity * 0.75);
    float fogMix = (fog1 * 0.6 + fog2 * 0.4);

    // Fade di tepi (vignette radial)
    vec2  centered  = vUv - 0.5;
    float radial    = 1.0 - smoothstep(0.25, 0.5, length(centered));

    // Fade di atas & bawah
    float vertFade  = smoothstep(0.0, 0.25, vUv.y)
                    * smoothstep(1.0, 0.72, vUv.y);

    float alpha = fogMix * radial * vertFade * uOpacity;
    alpha      += vElevation * 0.08;   // puncak gelombang sedikit lebih padat
    alpha       = clamp(alpha, 0.0, 0.75);

    gl_FragColor = vec4(uFogColor, alpha);
  }
`;

// ── Config ───────────────────────────────────────────────────
const LAYERS = [
  // { scale, y,    opacity, speed,  density, color }
  { scale: [8, 1, 8],  y: -1.8, opacity: 0.50, speed: 0.35, density: 1.8, color: "#0d0d0d" }, // ground fog
  { scale: [6, 1, 6],  y: -0.8, opacity: 0.30, speed: 0.25, density: 1.4, color: "#1a1008" }, // mid fog amber tint
  { scale: [4, 1, 4],  y:  0.4, opacity: 0.15, speed: 0.18, density: 1.1, color: "#c9a96e" }, // high gold mist
] as const;

// ── Types ────────────────────────────────────────────────────
interface FogLayer {
  meshRef:          React.RefObject<THREE.Mesh>;
  uniforms:         Record<string, THREE.IUniform>;
  vertexShader:     string;
  fragmentShader:   string;
  scale:            readonly [number, number, number];
  y:                number;
}

// ── Hook ─────────────────────────────────────────────────────
export function useFog() {
  const fogLayers = useMemo<FogLayer[]>(() =>
    LAYERS.map((cfg) => ({
      meshRef:        { current: null } as React.RefObject<THREE.Mesh>,
      vertexShader,
      fragmentShader,
      scale:          cfg.scale,
      y:              cfg.y,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: cfg.opacity },
        uSpeed:   { value: cfg.speed },
        uDensity: { value: cfg.density },
        uFogColor:{ value: new THREE.Color(cfg.color) },
      },
    }))
  , []);

  // Buat ref array terpisah agar tidak di-recreate
  const refs = useRef<(THREE.Mesh | null)[]>([null, null, null]);

  // Hanya update uTime — satu value per layer, sangat murah
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    fogLayers.forEach((layer, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const mat = mesh.material as THREE.ShaderMaterial;
      if (mat?.uniforms) mat.uniforms.uTime.value = t;

      // Rotasi lambat di Y biar fog berputar organik
      mesh.rotation.y = t * 0.012 * (i % 2 === 0 ? 1 : -1);
    });
  });

  return { fogLayers, refs };
}