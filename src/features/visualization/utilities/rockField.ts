import type { RockInstance, Terrain } from '../types/scene'
import { hazardDensity } from './terrain'
import type { HazardLevel } from '../../../types/environment'
import { createRng, randomRange } from './seededRandom'
import type { Rng } from './seededRandom'

export const ROCK_VARIANTS = 3

/** Keep-out zones where no rock is placed (the lander pad, the radio telescope dish). */
export type KeepOut = { x: number; z: number; radiusM: number }

/** Rock sizes follow a power law: many cobbles, few boulders. Diameter in meters. */
function rockSize(rng: Rng, minM: number, maxM: number): number {
  return Math.min(maxM, minM * (1 - rng()) ** (-1 / 1.8))
}

/**
 * Scatters rocks and boulders deterministically. Roughly a third sit on the ejecta blanket
 * around the main crater, where real impacts throw out the most blocks.
 */
export function scatterRocks(terrain: Terrain, hazard: HazardLevel, keepOut: KeepOut[], seed = terrain.config.seed + 101): RockInstance[] {
  const rng = createRng(seed)
  const { mainCrater } = terrain.config
  const total = Math.round(320 * hazardDensity[hazard])
  const rocks: RockInstance[] = []
  let attempts = 0
  while (rocks.length < total && attempts < total * 20) {
    attempts += 1
    const onEjecta = rng() < 0.35
    let x: number
    let z: number
    if (onEjecta) {
      const angle = rng() * Math.PI * 2
      const dist = mainCrater.radiusM * randomRange(rng, 0.95, 1.9)
      x = mainCrater.x + Math.cos(angle) * dist
      z = mainCrater.z + Math.sin(angle) * dist
    } else {
      // sqrt for uniform density over the disc
      const angle = rng() * Math.PI * 2
      const dist = 140 * Math.sqrt(rng())
      x = Math.cos(angle) * dist
      z = Math.sin(angle) * dist
    }
    const size = rockSize(rng, 0.18, onEjecta ? 3.2 : 2.2)
    if (keepOut.some((k) => Math.hypot(x - k.x, z - k.z) < k.radiusM + size)) continue
    const sx = size * randomRange(rng, 0.8, 1.2)
    const sy = size * randomRange(rng, 0.45, 0.8)
    const sz = size * randomRange(rng, 0.8, 1.2)
    rocks.push({
      // Partly buried in the regolith.
      position: [x, terrain.heightAt(x, z) - sy * 0.25, z],
      scale: [sx / 2, sy / 2, sz / 2],
      rotation: [randomRange(rng, -0.3, 0.3), rng() * Math.PI * 2, randomRange(rng, -0.3, 0.3)],
      variant: Math.floor(rng() * ROCK_VARIANTS),
      shade: randomRange(rng, 0.8, 1.15),
    })
  }
  return rocks
}

/** Lumpy unit-radius rock surface: displaces a sphere direction by seeded noise. */
export function rockRadius(dirX: number, dirY: number, dirZ: number, variant: number): number {
  const s = variant * 17.3
  const n =
    Math.sin(dirX * 3.1 + s) * Math.cos(dirZ * 2.7 - s) * 0.18 +
    Math.sin(dirY * 5.3 + dirX * 4.1 + s * 2) * 0.08 +
    Math.cos(dirZ * 7.7 - dirY * 3.3 + s) * 0.05
  // Flatten the underside so rocks rest on the ground.
  return 1 + n - (dirY < -0.3 ? (-dirY - 0.3) * 0.5 : 0)
}
