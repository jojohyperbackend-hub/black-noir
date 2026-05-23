import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Vertex Shader ────────────────────────────────────────────
const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uWaveAmplitude;
  uniform float uWaveFrequency;
  uniform float uFillLevel;    // 0.0 = kosong, 1.0 = penuh

  varying vec2  vUv;
  varying float vWave;
  varying float vElevation;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Surface wave — hanya di bagian atas cairan
    float wave1 = sin(pos.x * uWaveFrequency + uTime * 1.4) * uWaveAmplitude;
    float wave2 = sin(pos.z * uWaveFrequency * 0.8 + uTime * 1.1) * uWaveAmplitude * 0.6;
    float wave3 = cos((pos.x + pos.z) * uWaveFrequency * 0.5 + uTime * 0.9) * uWaveAmplitude * 0.4;

    float combinedWave = wave1 + wave2 + wave3;

    // Hanya terapkan wave di permukaan atas (Y mendekati top)
    float surfaceMask = smoothstep(uFillLevel - 0.15, uFillLevel, vUv.y);
    pos.y += combinedWave * surfaceMask;

    vWave      = combinedWave;
    vElevation = pos.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ── Fragment Shader ──────────────────────────────────────────
const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uFillLevel;
  uniform vec3  uColorDeep;     // warna dasar cairan
  uniform vec3  uColorLight;    // highlight di permukaan
  uniform float uOpacity;
  uniform float uRefraction;    // efek bias cahaya

  varying vec2  vUv;
  varying float vWave;
  varying float vElevation;

  // Simple noise untuk internal swirl
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }

  void main() {
    // Clip di atas fill level
    if (vUv.y > uFillLevel) discard;

    // Depth gradient — lebih gelap di bawah, terang di atas
    float depth    = vUv.y / uFillLevel;
    vec3  baseColor = mix(uColorDeep, uColorLight, depth * 0.6);

    // Internal swirl noise
    vec2  noiseUv   = vUv * 3.0 + vec2(uTime * 0.04, uTime * 0.06);
    float swirlNoise = noise(noiseUv) * 0.5 + noise(noiseUv * 2.2 + 0.5) * 0.25;
    baseColor += uColorLight * swirlNoise * 0.12;

    // Surface highlight di puncak gelombang
    float surfaceMask = smoothstep(uFillLevel - 0.06, uFillLevel, vUv.y);
    float waveHighlight = smoothstep(0.0, 0.005, vWave) * surfaceMask;
    baseColor += uColorLight * waveHighlight * 0.4;

    // Refraction fringe di tepi permukaan
    float fringe = smoothstep(uFillLevel - 0.02, uFillLevel, vUv.y);
    baseColor = mix(baseColor, uColorLight, fringe * uRefraction * 0.3);

    // Vignette — pinggir lebih gelap (efek botol)
    float vignette = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
    baseColor *= 0.75 + vignette * 0.35;

    // Final opacity — surface sedikit lebih opaque
    float alpha = uOpacity + surfaceMask * 0.15;

    gl_FragColor = vec4(baseColor, clamp(alpha, 0.0, 1.0));
  }
`;

// ── Config ───────────────────────────────────────────────────
const CONFIG = {
  fillLevel:     0.62,   // seberapa penuh botol (0–1)
  waveAmplitude: 0.012,  // tinggi gelombang
  waveFrequency: 4.5,    // frekuensi gelombang
  opacity:       0.82,
  colorDeep:     new THREE.Color("#1a0a00"),   // amber gelap
  colorLight:    new THREE.Color("#c9a96e"),   // gold highlight
  refraction:    0.6,
} as const;

// ── Hook ─────────────────────────────────────────────────────
export function useLiquid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime:          { value: 0 },
    uFillLevel:     { value: CONFIG.fillLevel },
    uWaveAmplitude: { value: CONFIG.waveAmplitude },
    uWaveFrequency: { value: CONFIG.waveFrequency },
    uColorDeep:     { value: CONFIG.colorDeep },
    uColorLight:    { value: CONFIG.colorLight },
    uOpacity:       { value: CONFIG.opacity },
    uRefraction:    { value: CONFIG.refraction },
  }), []);

  // Update hanya uTime setiap frame — murah
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  // Simulasi cairan terguncang (panggil manual saat interaksi)
  function shake(intensity: number = 1.0) {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    const base = CONFIG.waveAmplitude;

    u.uWaveAmplitude.value = base * (1 + intensity * 2.5);

    // Kembalikan ke normal secara smooth
    let t = 0;
    const decay = setInterval(() => {
      t += 0.05;
      u.uWaveAmplitude.value = base * (1 + intensity * 2.5 * Math.exp(-t * 2));
      if (t >= 2) {
        u.uWaveAmplitude.value = base;
        clearInterval(decay);
      }
    }, 30);
  }

  return {
    materialRef,
    uniforms,
    vertexShader,
    fragmentShader,
    shake,
  };
}