import { fbm, valueNoise } from './noise'

/** Pure RGBA pixel generators for procedural textures. Wrapped as three.js DataTextures in materials/. */

export type Pixels = { width: number; height: number; data: Uint8Array }

/** Tileable normal map of fine regolith bumps and pits. */
export function regolithNormalMap(size: number, seed: number): Pixels {
  const period = 8
  const height = (x: number, y: number) =>
    fbm((x / size) * period, (y / size) * period, seed, 4, period) * 0.7 +
    Math.max(0, 0.75 - valueNoise((x / size) * 24, (y / size) * 24, seed + 9, 24)) * -0.9 // small pits
  const data = new Uint8Array(size * size * 4)
  const strength = 2.2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (height((x + 1) % size, y) - height((x - 1 + size) % size, y)) * strength
      const dy = (height(x, (y + 1) % size) - height(x, (y - 1 + size) % size)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  return { width: size, height: size, data }
}

/** Square grid of thin opaque lines on a transparent background (wire mesh, solar cell gaps). */
export function gridAlphaMap(size: number, cells: number, lineFraction: number): Pixels {
  const data = new Uint8Array(size * size * 4)
  const cellPx = size / cells
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const onLine = x % cellPx < cellPx * lineFraction || y % cellPx < cellPx * lineFraction
      const v = onLine ? 255 : 0
      data.set([v, v, v, 255], (y * size + x) * 4)
    }
  }
  return { width: size, height: size, data }
}

/** Equirectangular Earth: oceans, continents, polar ice. Seeded, not a geographic map. */
export function earthSurface(width: number, height: number, seed: number): Pixels {
  const data = new Uint8Array(width * height * 4)
  const period = 6
  for (let y = 0; y < height; y += 1) {
    const lat = (0.5 - y / height) * Math.PI
    for (let x = 0; x < width; x += 1) {
      const u = (x / width) * period
      const v = (y / height) * period * 0.5
      const land = fbm(u, v, seed, 5, period)
      const ice = Math.abs(lat) > 1.15 + 0.08 * fbm(u * 2, v * 2, seed + 3, 2, period * 2)
      let rgb: [number, number, number]
      if (ice) rgb = [235, 240, 245]
      else if (land > 0.12) {
        const dry = fbm(u * 2, v * 2, seed + 5, 3, period * 2) * 0.5 + 0.5
        // Deserts near the subtropics, vegetation elsewhere.
        const desert = Math.max(0, 1 - Math.abs(Math.abs(lat) - 0.45) * 3) * dry
        rgb = [Math.round(70 + 120 * desert), Math.round(95 + 60 * desert), Math.round(55 + 40 * desert)]
      } else {
        const depth = Math.min(1, (0.12 - land) * 2.5)
        rgb = [Math.round(12 + 10 * (1 - depth)), Math.round(45 + 30 * (1 - depth)), Math.round(110 + 40 * (1 - depth))]
      }
      data.set([...rgb, 255], (y * width + x) * 4)
    }
  }
  return { width, height, data }
}

/** Equirectangular cloud cover as white with alpha. */
export function earthClouds(width: number, height: number, seed: number): Pixels {
  const data = new Uint8Array(width * height * 4)
  const period = 8
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const c = fbm((x / width) * period, (y / height) * period * 0.5, seed + 77, 5, period)
      const alpha = Math.max(0, Math.min(1, (c - 0.05) * 2.2))
      data.set([255, 255, 255, Math.round(alpha * 230)], (y * width + x) * 4)
    }
  }
  return { width, height, data }
}

/** Tileable normal map of recessed panel seams: a grid of grooves with small rivet dimples. */
export function panelSeamNormalMap(size: number, cells: number): Pixels {
  const cellPx = size / cells
  const groove = Math.max(1, Math.round(cellPx * 0.03))
  const height = (x: number, y: number) => {
    const gx = x % cellPx
    const gy = y % cellPx
    const inGroove = gx < groove || gy < groove
    const rivet = Math.hypot(gx - cellPx * 0.12, gy - cellPx * 0.12) < cellPx * 0.025
    return inGroove ? -1 : rivet ? 0.6 : 0
  }
  return heightToNormal(size, height, 1.6)
}

/** Tileable crinkled-foil normal map for multi-layer insulation blankets. */
export function foilCrinkleNormalMap(size: number, seed: number): Pixels {
  const period = 6
  return heightToNormal(size, (x, y) => fbm((x / size) * period, (y / size) * period, seed, 5, period), 3.5)
}

function heightToNormal(size: number, height: (x: number, y: number) => number, strength: number): Pixels {
  const data = new Uint8Array(size * size * 4)
  const h = (x: number, y: number) => height((x + size) % size, (y + size) % size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      data.set([Math.round(((-dx / len) * 0.5 + 0.5) * 255), Math.round(((-dy / len) * 0.5 + 0.5) * 255), Math.round(((1 / len) * 0.5 + 0.5) * 255), 255], (y * size + x) * 4)
    }
  }
  return { width: size, height: size, data }
}

/** Soft round puff: opaque center fading to transparent at the edge (dust clouds, plume glow). */
export function radialFalloffMap(size: number, seed = 5): Pixels {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size - 0.5
      const dy = (y + 0.5) / size - 0.5
      const r = Math.hypot(dx, dy) * 2
      // Billowy edge: noise breaks up the perfect circle.
      const edge = 1 - 0.25 * valueNoise(Math.atan2(dy, dx) * 2 + 7, r * 3, seed)
      const a = Math.max(0, 1 - r / edge) ** 1.6
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4)
    }
  }
  return { width: size, height: size, data }
}
