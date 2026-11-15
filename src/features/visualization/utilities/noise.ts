/** Seeded 2D value noise and fractal sums. Pure; optional period makes it tile seamlessly. */

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const wrap = (i: number, period: number) => ((i % period) + period) % period

/** Value noise in [0, 1). With `period`, the pattern repeats every `period` units. */
export function valueNoise(x: number, y: number, seed: number, period?: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const ix0 = period ? wrap(x0, period) : x0
  const iy0 = period ? wrap(y0, period) : y0
  const ix1 = period ? wrap(x0 + 1, period) : x0 + 1
  const iy1 = period ? wrap(y0 + 1, period) : y0 + 1
  const a = hash2(ix0, iy0, seed)
  const b = hash2(ix1, iy0, seed)
  const c = hash2(ix0, iy1, seed)
  const d = hash2(ix1, iy1, seed)
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}

/** Fractal (fBm) value noise in roughly [-1, 1]. Each octave doubles frequency and halves amplitude. */
export function fbm(x: number, y: number, seed: number, octaves: number, period?: number): number {
  let sum = 0
  let amplitude = 1
  let frequency = 1
  let norm = 0
  for (let o = 0; o < octaves; o += 1) {
    const p = period ? period * frequency : undefined
    sum += amplitude * (valueNoise(x * frequency, y * frequency, seed + o * 1013, p) * 2 - 1)
    norm += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return sum / norm
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
