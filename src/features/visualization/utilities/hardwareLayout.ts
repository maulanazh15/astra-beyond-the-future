import type { Vec3 } from '../types/scene'

/** Pure layout helpers for procedural hardware detail. */

/** Bolt pattern at the corners of a rectangle on a face pointing along local +X. */
export function cornerBolts(width: number, height: number, x: number, inset = 0.04): Vec3[] {
  const w = width / 2 - inset
  const h = height / 2 - inset
  return [[x, h, w], [x, h, -w], [x, -h, w], [x, -h, -w]]
}

/** Points evenly spaced around a horizontal circle. */
export function ringPoints(radiusM: number, y: number, count: number, phase = 0): Vec3[] {
  return Array.from({ length: count }, (_, i): Vec3 => {
    const a = phase + (i / count) * Math.PI * 2
    return [Math.cos(a) * radiusM, y, Math.sin(a) * radiusM]
  })
}

/** Corners of a regular octagon (bus outline) with a vertex at angle π/8 so face 0 faces +X. */
export function octagonCorners(radiusM: number): [number, number][] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    return [Math.cos(a) * radiusM, Math.sin(a) * radiusM]
  })
}

export type LegLayout = { hip: Vec3; knee: Vec3; foot: Vec3; braces: [Vec3, Vec3] }

/**
 * Four landing legs on alternate octagon corners, scaled to the bus. Legged gear stands wider with
 * a long stroke; crushable pads sit closer in and stiffer. Feet rest on the ground (y = 0 under the pad).
 */
export function landingLegLayout(radiusM: number, baseY: number, gear: string): LegLayout[] {
  const crushOnly = gear === 'crush'
  const footR = radiusM * (crushOnly ? 1.55 : 1.85)
  const padTop = gear.includes('crush') ? 0.17 : 0.07
  return [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 2
    const at = (r: number, y: number, da = 0): Vec3 => [Math.cos(a + da) * r, y, Math.sin(a + da) * r]
    const knee = at(radiusM * 1.32, baseY * 0.45)
    return {
      hip: at(radiusM * 1.0, baseY + 0.08),
      knee,
      foot: at(footR, padTop),
      braces: [at(radiusM * 0.95, baseY + 0.02, 0.38), at(radiusM * 0.95, baseY + 0.02, -0.38)],
    }
  })
}
