import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Config ──────────────────────────────────────────────────
const CONFIG = {
  count:        80,      // jumlah partikel (keep low)
  spread:       3.5,     // radius sebaran
  minSize:      0.008,
  maxSize:      0.022,
  minSpeed:     0.002,
  maxSpeed:     0.006,
  opacity:      0.55,
  color:        "#c9a96e",  // gold
} as const;

// ── Types ────────────────────────────────────────────────────
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size:     number;
  phase:    number;   // offset untuk sine wave
  speed:    number;
}

// ── Helper ───────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomSpherePoint(radius: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = Math.cbrt(Math.random()) * radius;   // cube root → uniform fill
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useParticles() {
  const meshRef = useRef<THREE.Points>(null);

  // Inisialisasi partikel sekali
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: CONFIG.count }, () => ({
      position: randomSpherePoint(CONFIG.spread),
      velocity: new THREE.Vector3(
        rand(-0.001, 0.001),
        rand(CONFIG.minSpeed, CONFIG.maxSpeed),   // naik perlahan
        rand(-0.001, 0.001)
      ),
      size:  rand(CONFIG.minSize, CONFIG.maxSize),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.3, 1.0),
    }));
  }, []);

  // Buffer positions & sizes
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(CONFIG.count * 3);
    const sizes     = new Float32Array(CONFIG.count);

    particles.forEach((p, i) => {
      positions[i * 3]     = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      sizes[i]             = p.size;
    });

    return { positions, sizes };
  }, [particles]);

  // Animasi per frame
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t   = clock.getElapsedTime();
    const pos = mesh.geometry.attributes.position;

    particles.forEach((p, i) => {
      // Gerak naik + drift sinusoidal
      p.position.x += Math.sin(t * p.speed + p.phase) * 0.0008;
      p.position.y += p.velocity.y;
      p.position.z += Math.cos(t * p.speed + p.phase) * 0.0006;

      // Reset kalau keluar batas (respawn di bawah)
      if (p.position.y > CONFIG.spread) {
        p.position.y = -CONFIG.spread;
        p.position.x = rand(-CONFIG.spread * 0.6, CONFIG.spread * 0.6);
        p.position.z = rand(-CONFIG.spread * 0.6, CONFIG.spread * 0.6);
      }

      pos.setXYZ(i, p.position.x, p.position.y, p.position.z);
    });

    pos.needsUpdate = true;
  });

  return { meshRef, positions, sizes, count: CONFIG.count, opacity: CONFIG.opacity, color: CONFIG.color };
}