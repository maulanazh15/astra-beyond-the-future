import type { HazardLevel } from '../../../types/environment'
import type { Crater, Terrain, TerrainConfig } from '../types/scene'
import { fbm, smoothstep } from './noise'
import { createRng, randomRange } from './seededRandom'

/**
 * Procedural lunar terrain. A gameplay visualization, not a topographic model:
 * - Simple craters use a parabolic bowl with a raised rim (depth ≈ diameter / 5–8) and
 *   ejecta that falls off with distance, a common simplified crater profile.
 * - Rolling ground and distant horizon hills come from seeded fractal noise.
 */

const RIM_HEIGHT_FRACTION = 0.28
const EJECTA_EXTENT = 3 // crater radii

/** Height offset (m) of one crater at distance `r` from its center. 0 beyond 3 radii. */
export function craterProfile(r: number, radiusM: number, depthM: number): number {
  const x = r / radiusM
  const rim = depthM * RIM_HEIGHT_FRACTION
  if (x < 1) return -depthM + (depthM + rim) * x * x
  if (x >= EJECTA_EXTENT) return 0
  const floor = EJECTA_EXTENT ** -4
  return (rim * (x ** -4 - floor)) / (1 - floor)
}

/** Small-crater density by site hazard: rougher sites have more craters and boulders. */
export const hazardDensity: Record<HazardLevel, number> = { low: 0.7, moderate: 1, high: 1.5 }

const MAIN_CRATER: Crater = { x: -34, z: -30, radiusM: 26, depthM: 9.5, fresh: false }
const PAD = { x: 6, z: 6, radiusM: 4.5 }

/** Places the scene's craters deterministically from a seed. */
export function createTerrainConfig(seed: number, hazard: HazardLevel = 'moderate'): TerrainConfig {
  const rng = createRng(seed)
  const craters: Crater[] = []
  const count = Math.round(26 * hazardDensity[hazard])
  let attempts = 0
  while (craters.length < count && attempts < count * 40) {
    attempts += 1
    // Power-law sizes: many small craters, few large ones.
    const radiusM = Math.min(11, 1.2 * (1 - rng()) ** -0.6)
    const angle = rng() * Math.PI * 2
    const dist = randomRange(rng, 8, 130)
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    const clearOf = (c: { x: number; z: number }, gap: number) => Math.hypot(x - c.x, z - c.z) > gap
    if (!clearOf(PAD, PAD.radiusM + radiusM * 1.6 + 3)) continue
    if (!clearOf(MAIN_CRATER, MAIN_CRATER.radiusM * 1.25 + radiusM)) continue
    if (craters.some((c) => !clearOf(c, (c.radiusM + radiusM) * 0.9))) continue
    craters.push({ x, z, radiusM, depthM: radiusM * randomRange(rng, 0.18, 0.26), fresh: rng() < 0.3 })
  }
  return { seed, radiusM: 1800, mainCrater: MAIN_CRATER, craters, pad: PAD, undulationM: hazard === 'high' ? 1.6 : 1 }
}

export function createTerrain(config: TerrainConfig): Terrain {
  const { seed, mainCrater, craters, pad, undulationM } = config
  const all = [mainCrater, ...craters]

  const naturalHeight = (x: number, z: number) => {
    const r = Math.hypot(x, z)
    // Distant hills grow with distance to form an irregular horizon silhouette. Ridged noise
    // (1 − |n|) gives rounded highland massifs rather than smooth swells.
    const ridge = 1 - Math.abs(fbm(x / 380, z / 380, seed + 7, 5))
    const horizon = smoothstep(120, 1100, r) * 95 * ridge * ridge
    const rolling = undulationM * fbm(x / 60, z / 60, seed + 11, 4)
    // Fine roughness only near the site, where the mesh is dense enough to show it.
    const rough = 0.18 * fbm(x / 7, z / 7, seed + 23, 3) * (1 - smoothstep(60, 160, r))
    let h = horizon + rolling + rough
    for (const c of all) {
      const d = Math.hypot(x - c.x, z - c.z)
      if (d < c.radiusM * EJECTA_EXTENT) h += craterProfile(d, c.radiusM, c.depthM)
    }
    return h
  }

  const padHeight = naturalHeight(pad.x, pad.z)
  const heightAt = (x: number, z: number) => {
    const h = naturalHeight(x, z)
    const d = Math.hypot(x - pad.x, z - pad.z)
    // Blend to a level pad so the lander's feet sit on the ground.
    const blend = 1 - smoothstep(pad.radiusM, pad.radiusM * 2, d)
    return h + (padHeight - h) * blend
  }

  const albedoAt = (x: number, z: number) => {
    let a = 0.5 + 0.07 * fbm(x / 35, z / 35, seed + 31, 3) + 0.03 * fbm(x / 4, z / 4, seed + 37, 2)
    for (const c of all) {
      const rel = Math.hypot(x - c.x, z - c.z) / c.radiusM
      if (rel > 2.5) continue
      if (rel < 0.9) a -= 0.05 * (1 - rel) // shadowed, older crater floors read slightly darker
      if (c.fresh) a += 0.16 * Math.exp(-(((rel - 1.15) / 0.45) ** 2)) // bright ejecta halo
    }
    return Math.min(0.85, Math.max(0.25, a))
  }

  return { config, heightAt, albedoAt }
}
