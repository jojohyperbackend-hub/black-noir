import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useParticles } from "../hooks/useParticles";

// ── Vertex Shader ────────────────────────────────────────────
const vertexShader = /* glsl */`
  attribute float size;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Drift sinusoidal per partikel (pakai posisi sebagai seed)
    float drift = sin(uTime * 0.6 + pos.x * 2.5 + pos.z * 1.8) * 0.018;
    pos.x += drift;
    pos.z += cos(uTime * 0.5 + pos.y * 2.1) * 0.012;

    // Alpha berdasarkan ketinggian — makin atas makin fade
    vAlpha = 1.0 - smoothstep(1.5, 3.5, pos.y);

    vec4 mvPos    = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize  = size * uPixelRatio * (280.0 / -mvPos.z);
    gl_Position   = projectionMatrix * mvPos;
  }
`;

// ── Fragment Shader ──────────────────────────────────────────
const fragmentShader = /* glsl */`
  uniform vec3  uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    // Lingkaran smooth — buang sudut kotak
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Soft glow — terang di tengah, fade di tepi
    float glow  = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = glow * glow * uOpacity * vAlpha;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ── Component ────────────────────────────────────────────────
export default function Particles() {
  const { meshRef, positions, sizes, count, opacity, color } = useParticles();

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uColor:      { value: new THREE.Color(color) },
    uOpacity:    { value: opacity },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), [color, opacity]);

  // Animasi loop — hanya update uTime
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      if (mat?.uniforms) mat.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>

      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}