import type { Terrain, Vec3 } from '../types/scene'

/**
 * Layout of a scaled-down Lunar Crater Radio Telescope (LCRT) concept: a wire-mesh
 * paraboloid suspended inside a crater by cables from towers on the rim, with the receiver
 * hanging at the dish's focal point. The Phase II concept puts a 350 m reflector in a 1.3 km
 * crater; this is a compressed, readable stand-in sized to the scene's main crater (the factors
 * are computed in `sceneScale.ts` and shown on the telescope's info card).
 */
export type LcrtLayout = {
  center: { x: number; z: number }
  /** Radius of the host crater in the scene (m). */
  craterRadiusM: number
  dishRadiusM: number
  /** Depth of the paraboloid from rim to vertex (m). */
  dishSagM: number
  /** Height of the dish's lowest point (m). */
  dishVertexY: number
  /** Focal length f = r² / (4 · sag) (m). */
  focalLengthM: number
  receiver: Vec3
  towerBases: Vec3[]
  towerHeightM: number
  /** Ground anchors on the crater rim for the reflector's suspension cables (installed by rovers). */
  anchors: Vec3[]
  /** Two guy-wire ground anchors per tower, outward from the crater (tower i → 2i, 2i+1). */
  guyAnchors: Vec3[]
  /** Crater floor under the dish center: where the stowed reflector canister is landed. */
  floorY: number
  /** Smallest gap between the dish and the crater floor beneath it (m). */
  clearanceM: number
}

const DISH_FRACTION = 0.62
const SAG_FRACTION = 0.25
const MIN_CLEARANCE_M = 0.8
const TOWER_ANGLES_DEG = [90, 210, 330]
/** Twelve rim anchors, offset from the towers so cables and towers never share a bearing. */
export const ANCHOR_BEARINGS_DEG = Array.from({ length: 12 }, (_, i) => 15 + i * 30)
const ANCHOR_RADIUS_FRACTION = 1.07

export function lcrtLayout(terrain: Terrain): LcrtLayout {
  const { mainCrater: crater } = terrain.config
  const dishRadiusM = crater.radiusM * DISH_FRACTION
  const dishSagM = dishRadiusM * SAG_FRACTION
  const dishOffset = (r: number) => dishSagM * (r / dishRadiusM) ** 2

  // Lift the dish until it clears the crater floor everywhere under it.
  let required = -Infinity
  for (let ri = 0; ri <= 12; ri += 1) {
    const r = (ri / 12) * dishRadiusM
    for (let ai = 0; ai < 24; ai += 1) {
      const a = (ai / 24) * Math.PI * 2
      const ground = terrain.heightAt(crater.x + Math.cos(a) * r, crater.z + Math.sin(a) * r)
      required = Math.max(required, ground + MIN_CLEARANCE_M - dishOffset(r))
    }
  }
  const dishVertexY = required
  const focalLengthM = (dishRadiusM * dishRadiusM) / (4 * dishSagM)

  const towerBases = TOWER_ANGLES_DEG.map((deg): Vec3 => {
    const a = (deg * Math.PI) / 180
    const x = crater.x + Math.cos(a) * crater.radiusM * 1.04
    const z = crater.z + Math.sin(a) * crater.radiusM * 1.04
    return [x, terrain.heightAt(x, z), z]
  })
  const receiverY = dishVertexY + focalLengthM
  const towerHeightM = Math.max(...towerBases.map((b) => receiverY - b[1])) + 3.5

  let clearanceM = Infinity
  for (let ri = 0; ri <= 12; ri += 1) {
    const r = (ri / 12) * dishRadiusM
    for (let ai = 0; ai < 24; ai += 1) {
      const a = (ai / 24) * Math.PI * 2
      const ground = terrain.heightAt(crater.x + Math.cos(a) * r, crater.z + Math.sin(a) * r)
      clearanceM = Math.min(clearanceM, dishVertexY + dishOffset(r) - ground)
    }
  }

  const anchors = ANCHOR_BEARINGS_DEG.map((deg): Vec3 => {
    const a = (deg * Math.PI) / 180
    const x = crater.x + Math.cos(a) * crater.radiusM * ANCHOR_RADIUS_FRACTION
    const z = crater.z + Math.sin(a) * crater.radiusM * ANCHOR_RADIUS_FRACTION
    return [x, terrain.heightAt(x, z), z]
  })

  const guyAnchors = towerBases.flatMap(([bx, , bz]) => {
    const out = Math.atan2(bz - crater.z, bx - crater.x)
    return [-0.35, 0.35].map((offset): Vec3 => {
      const x = bx + Math.cos(out + offset) * 6
      const z = bz + Math.sin(out + offset) * 6
      return [x, terrain.heightAt(x, z), z]
    })
  })

  return {
    center: { x: crater.x, z: crater.z },
    craterRadiusM: crater.radiusM,
    dishRadiusM,
    dishSagM,
    dishVertexY,
    focalLengthM,
    receiver: [crater.x, receiverY, crater.z],
    towerBases,
    towerHeightM,
    clearanceM,
    anchors,
    guyAnchors,
    floorY: terrain.heightAt(crater.x, crater.z),
  }
}
