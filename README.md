# NOIR — Eau de Parfum

> *"Some fragrances whisper. NOIR does not."*

A dark luxury perfume landing page built with Astro, React Three Fiber, and Tailwind v4. Features a real-time 3D perfume bottle with glass material, liquid simulation, volumetric fog, and aroma particles.

---

## Preview

![NOIR  Landing Page Preview](/public/landing-page.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build) |
| 3D Engine | [Three.js](https://threejs.org) + [React Three Fiber](https://r3f.docs.pmnd.rs) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + Custom CSS |
| Language | TypeScript |
| Build Tool | Vite (via Astro) |

---

## Project Structure

```
noir-perfume/
├── public/
│   ├── noir-bottle.png         ← gambar referensi (1 file)
│   └── perfume-bottle.obj      ← 3D model botol
│
├── src/
│   ├── components/
│   │   ├── PerfumeScene.tsx    ← Canvas R3F + lighting + semua 3D
│   │   ├── Particles.tsx       ← partikel aroma melayang
│   │   └── Header.astro        ← navbar + mobile drawer
│   │
│   ├── hooks/
│   │   ├── useParticles.ts     ← logic posisi & gerak partikel
│   │   ├── useLiquid.ts        ← shader simulasi cairan
│   │   └── useFog.ts           ← volumetric fog 3 layer
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro    ← HTML shell + SEO meta + cursor
│   │
│   ├── pages/
│   │   └── index.astro         ← halaman utama (semua section)
│   │
│   └── styles/
│       └── global.css          ← Tailwind v4 + CSS variables
│
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js `>= 18.0.0`
- npm `>= 9.0.0`
- Git

### Clone Repository

```bash
# Clone project
git clone https://github.com/jojohyperbackend-hub/black-noir.git

# Masuk ke folder
cd black-noir
```

### Install Dependencies

```bash
npm install
```

### Jalankan Dev Server

```bash
npm run dev
```

Buka browser di `http://localhost:4321`

### Build Production

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

---

## Setup Manual (tanpa Git)

Kalau mau setup dari nol:

```bash
# 1. Buat project Astro
npm create astro@latest noir-perfume
cd noir-perfume

# 2. Install dependencies
npm install

# 3. Tambah React
npx astro add react

# 4. Install Tailwind v4
npm install @tailwindcss/vite

# 5. Install Three.js
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing @types/three

# 6. Buat folder & file
mkdir -p src/components src/hooks src/layouts src/styles

touch src/components/PerfumeScene.tsx
touch src/components/Particles.tsx
touch src/components/Header.astro
touch src/hooks/useParticles.ts
touch src/hooks/useLiquid.ts
touch src/hooks/useFog.ts
touch src/layouts/BaseLayout.astro
touch src/styles/global.css

# 7. Jalankan
npm run dev
```

---

## Konfigurasi

### `astro.config.mjs`

```js
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### `tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

---

## Asset yang Dibutuhkan

Taruh file berikut di folder `public/`:

| File | Keterangan |
|---|---|
| `noir-bottle.png` | Foto produk untuk editorial & collection section |
| `perfume-bottle.obj` | 3D model botol parfum (format Wavefront OBJ) |
| `favicon.svg` | Icon tab browser |

> **Catatan:** Semua file di `public/` diakses langsung dari root URL, bukan `/public/`.
> Contoh: `public/noir-bottle.png` → diakses via `/noir-bottle.png`

---

## Sections

| Section | ID | Deskripsi |
|---|---|---|
| Hero | `#hero` | 3D scene fullscreen + judul NOIR + CTA |
| Quote | `#quote` | Tagline utama brand |
| Notes | `#notes` | 3 bahan: Cambodian Oud, Black Rose, Vetiver |
| Story | `#story` | Editorial full bleed image |
| Collection | `#collection` | 3 produk: NOIR, BLANC, ROUGE |
| Acquire | `#acquire` | CTA "Enter the Darkness" |

---

## 3D Scene

### Efek yang dipakai

- **Glass material** — `MeshPhysicalMaterial` dengan `transmission`, `ior`, `thickness`
- **Liquid simulation** — custom GLSL shader dengan wave surface + internal swirl noise
- **Aroma particles** — `THREE.Points` dengan 80 partikel drift sinusoidal
- **Volumetric fog** — 3 layer plane geometry dengan FBM noise shader
- **Lighting rig** — ambient + key spot (gold) + rim kiri (blue) + rim kanan (warm) + under light

### Performa

- Pixel ratio di-cap di `1.5` untuk mobile
- Particle count: 80 (low intentionally)
- Fog FBM: 2 oktaf saja
- Shadow map: 512×512

---

## Scripts

```bash
npm run dev      # development server
npm run build    # production build ke /dist
npm run preview  # preview production build
npm run check    # type check Astro + TypeScript
```

---

## License

MIT © 2024 Nocturne Maison de Parfum
