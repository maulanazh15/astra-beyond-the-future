/** Deterministic pseudo-random numbers so the same seed always builds the same scene. */
export type Rng = () => number

/** Mulberry32: small, fast, good enough for scattering geometry. Returns values in [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a hash of a string, for turning ids (e.g. a site id) into seeds. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function randomRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}
