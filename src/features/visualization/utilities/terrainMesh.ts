import type { Terrain } from '../types/scene'

/**
 * Radii of the ground mesh rings: even 0.75 m spacing near the site, then geometric growth to the
 * horizon. One mesh gives fine detail up close and cheap distant hills (a built-in level of detail).
 */
export function ringRadii(outerRadiusM: number, nearRings = 120, nearSpacingM = 0.75, farRings = 80): number[] {
  const radii = [0]
  for (let i = 1; i <= nearRings; i += 1) radii.push(i * nearSpacingM)
  // Grow spacing by a constant factor so the last ring lands exactly on the outer radius.
  const start = nearRings * nearSpacingM
  let lo = 1
  let hi = 2
  for (let k = 0; k < 60; k += 1) {
    const q = (lo + hi) / 2
    const reach = start + (nearSpacingM * q * (q ** farRings - 1)) / (q - 1)
    if (reach > outerRadiusM) hi = q
    else lo = q
  }
  const q = (lo + hi) / 2
  let r = start
  for (let i = 1; i <= farRings; i += 1) {
    r += nearSpacingM * q ** i
    radii.push(r)
  }
  radii[radii.length - 1] = outerRadiusM
  return radii
}

export type MeshArrays = {
  positions: Float32Array
  colors: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

/** Regolith tint: slightly warm grey, as in Apollo-era color photographs. */
const TINT: [number, number, number] = [1, 0.97, 0.92]

/** Polar-grid ground mesh sampled from the terrain. UVs are world meters / `uvScaleM` for tiling detail maps. */
export function buildTerrainArrays(terrain: Terrain, segments = 192, uvScaleM = 6): MeshArrays {
  const radii = ringRadii(terrain.config.radiusM)
  const vertexCount = 1 + (radii.length - 1) * segments
  const positions = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)

  const write = (index: number, x: number, z: number) => {
    positions.set([x, terrain.heightAt(x, z), z], index * 3)
    const a = terrain.albedoAt(x, z)
    colors.set([a * TINT[0], a * TINT[1], a * TINT[2]], index * 3)
    uvs.set([x / uvScaleM, z / uvScaleM], index * 2)
  }

  write(0, 0, 0)
  for (let ring = 1; ring < radii.length; ring += 1) {
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2
      write(1 + (ring - 1) * segments + s, Math.cos(angle) * radii[ring], Math.sin(angle) * radii[ring])
    }
  }

  const triangles = segments + (radii.length - 2) * segments * 2
  const indices = new Uint32Array(triangles * 3)
  let t = 0
  const at = (ring: number, s: number) => 1 + (ring - 1) * segments + (s % segments)
  // Counter-clockwise when viewed from above (+Y), so faces point up.
  for (let s = 0; s < segments; s += 1) {
    indices.set([0, at(1, s + 1), at(1, s)], t)
    t += 3
  }
  for (let ring = 1; ring < radii.length - 1; ring += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = at(ring, s)
      const b = at(ring, s + 1)
      const c = at(ring + 1, s)
      const d = at(ring + 1, s + 1)
      indices.set([a, b, c, b, d, c], t)
      t += 6
    }
  }
  return { positions, colors, uvs, indices }
}
