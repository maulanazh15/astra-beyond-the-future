import type { Terrain, Vec3 } from '../types/scene'
import { egressPathLocal } from './landerLayout'
import type { LcrtLayout } from './lcrtLayout'
import type { KeepOut } from './rockField'
import type { RouteWaypoint, RoverRoute } from './roverRoute'

/**
 * Where the LUNAR ECHO hardware stands in the scene. Positions come from this layout, never from
 * inside the models, so a different site, a GLB swap, or a new mission architecture only changes
 * the config here.
 */
export type MissionSceneConfig = {
  /** Lander rotation about +Y; the payload ramp faces the lander's +X. */
  landerHeadingRad: number
  /** How many of the nearest rim anchors the rover services on its loop. */
  roverAnchorCount: number
  /** Rover stops this far outside an anchor so its arm can reach it (m). */
  roverStandoffM: number
  /** Rover drives around the rim at this multiple of the crater radius. */
  rimPathRadiusFraction: number
  roverSpeedMps: number
  roverToolS: number
}

export const defaultMissionSceneConfig: MissionSceneConfig = {
  // Ramp faces west: seen side-on from the overview camera, with the crater ahead of the rover.
  landerHeadingRad: 3.0,
  roverAnchorCount: 3,
  roverStandoffM: 1.5,
  rimPathRadiusFraction: 1.14,
  roverSpeedMps: 1.6,
  roverToolS: 6,
}

export type MissionAssetId = 'lander' | 'telescope' | 'rover'

/** Camera framing for focusing one asset: where to look and from how far. */
export type FocusFrame = { targetM: Vec3; distanceM: number; minDistanceM: number }

export type MissionSceneLayout = {
  config: MissionSceneConfig
  lander: { positionM: Vec3; headingRad: number }
  /** Rover egress path in world coordinates (shelf → ramp → ground). */
  egressPath: Vec3[]
  route: RoverRoute
  /** Rim anchors the rover services, in visiting order. */
  roverAnchors: Vec3[]
  focus: Record<Exclude<MissionAssetId, 'rover'>, FocusFrame> & { rover: Omit<FocusFrame, 'targetM'> }
  overview: { positionM: Vec3; targetM: Vec3 }
}

/** Lander frame (x forward, z right) → world, for a lander at `origin` rotated by `heading`. */
export function landerToWorld(origin: Vec3, headingRad: number, [x, y, z]: Vec3): Vec3 {
  const c = Math.cos(headingRad)
  const s = Math.sin(headingRad)
  return [origin[0] + x * c + z * s, origin[1] + y, origin[2] - x * s + z * c]
}

export function missionSceneLayout(terrain: Terrain, lcrt: LcrtLayout, config: MissionSceneConfig = defaultMissionSceneConfig): MissionSceneLayout {
  const { pad, mainCrater: crater } = terrain.config
  const positionM: Vec3 = [pad.x, terrain.heightAt(pad.x, pad.z), pad.z]
  const headingRad = config.landerHeadingRad
  const egressPath = egressPathLocal().map((p) => landerToWorld(positionM, headingRad, p))
  const exit = egressPath[egressPath.length - 1]

  // Service the anchors nearest the lander, walking around the rim from one end to the other.
  const bearing = (p: Vec3) => Math.atan2(p[2] - crater.z, p[0] - crater.x)
  const near = [...lcrt.anchors]
    .sort((a, b) => Math.hypot(a[0] - pad.x, a[2] - pad.z) - Math.hypot(b[0] - pad.x, b[2] - pad.z))
    .slice(0, config.roverAnchorCount)
    .sort((a, b) => bearing(b) - bearing(a))
  const ground = (x: number, z: number): Vec3 => [x, terrain.heightAt(x, z), z]
  const rimR = crater.radiusM * config.rimPathRadiusFraction
  const standoff = (anchor: Vec3): Vec3 => {
    const a = bearing(anchor)
    const r = Math.hypot(anchor[0] - crater.x, anchor[2] - crater.z) + config.roverStandoffM
    return ground(crater.x + Math.cos(a) * r, crater.z + Math.sin(a) * r)
  }

  const waypoints: RouteWaypoint[] = [{ position: exit }]
  near.forEach((anchor, i) => {
    if (i > 0) {
      // Follow the rim outside the crest between anchors, in ~7.5° steps.
      const from = bearing(near[i - 1])
      const to = bearing(anchor)
      const steps = Math.max(1, Math.round(Math.abs(to - from) / (Math.PI / 24)))
      for (let k = 1; k < steps; k += 1) {
        const a = from + ((to - from) * k) / steps
        waypoints.push({ position: ground(crater.x + Math.cos(a) * rimR, crater.z + Math.sin(a) * rimR) })
      }
    }
    waypoints.push({ position: standoff(anchor), workTarget: anchor })
  })

  const rimY = lcrt.dishVertexY + lcrt.dishSagM
  return {
    config,
    lander: { positionM, headingRad },
    egressPath,
    route: { waypoints, speedMps: config.roverSpeedMps, toolS: config.roverToolS, turnRateRadPerS: 0.9 },
    roverAnchors: near,
    focus: {
      lander: { targetM: [positionM[0], positionM[1] + 1.5, positionM[2]], distanceM: 10, minDistanceM: 4 },
      telescope: { targetM: [lcrt.center.x, (rimY + lcrt.receiver[1]) / 2 - 2, lcrt.center.z], distanceM: 62, minDistanceM: 18 },
      rover: { distanceM: 5.5, minDistanceM: 2.2 },
    },
    // Lander in the foreground, the radio telescope crater behind it.
    overview: { positionM: [13, 8.5, 22], targetM: [-10, 1, -10] },
  }
}

/** Rock keep-out circles along the rover's paths so it never drives through boulders. */
export function corridorKeepOut(layout: MissionSceneLayout, radiusM = 1.8, spacingM = 2): KeepOut[] {
  const points = [...layout.egressPath, ...layout.route.waypoints.map((w) => w.position), layout.egressPath[layout.egressPath.length - 1]]
  const zones: KeepOut[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, , az] = points[i]
    const [bx, , bz] = points[i + 1]
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / spacingM))
    for (let k = 0; k <= steps; k += 1) zones.push({ x: ax + ((bx - ax) * k) / steps, z: az + ((bz - az) * k) / steps, radiusM })
  }
  return zones
}
