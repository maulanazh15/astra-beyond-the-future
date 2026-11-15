import type { Vec3 } from '../types/scene'

/** A straight cylindrical member between two points (meters). Rendered with instancing. */
export type Strut = { from: Vec3; to: Vec3; radiusM: number }

export function strutLength({ from, to }: Strut): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
}

/**
 * Tapered square lattice tower: four corner posts with X-bracing on each face per level.
 * Origin at the center of the base.
 */
export function trussTower(base: Vec3, heightM: number, baseWidthM: number, topWidthM: number, levels: number): Strut[] {
  const [bx, by, bz] = base
  const corner = (level: number, i: number): Vec3 => {
    const t = level / levels
    const half = (baseWidthM + (topWidthM - baseWidthM) * t) / 2
    const sx = i === 0 || i === 3 ? -1 : 1
    const sz = i < 2 ? -1 : 1
    return [bx + sx * half, by + t * heightM, bz + sz * half]
  }
  const struts: Strut[] = []
  const post = 0.06
  const brace = 0.025
  for (let level = 0; level < levels; level += 1) {
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4
      struts.push({ from: corner(level, i), to: corner(level + 1, i), radiusM: post })
      struts.push({ from: corner(level + 1, i), to: corner(level + 1, j), radiusM: brace })
      struts.push({ from: corner(level, i), to: corner(level + 1, j), radiusM: brace })
    }
  }
  return struts
}
