import type { Terrain, Vec3 } from '../types/scene'
import { egressPathLocal } from './landerLayout'
import type { LcrtLayout } from './lcrtLayout'
import { WINCH_OFFSET_M, defaultAnchorSchedule } from './lcrtRig'
import type { AnchorWindow } from './lcrtRig'
import type { KeepOut } from './rockField'
import { angleDelta, routeSteps, stepsDurationS } from './roverRoute'
import type { RouteStep, RouteWaypoint, RoverRoute } from './roverRoute'

/**
 * Where the LUNAR ECHO hardware stands in the scene. Positions come from this layout, never from
 * inside the models, so a different site, a GLB swap, or a new mission architecture only changes
 * the config here.
 */
export type MissionSceneConfig = {
  /** Lander rotation about +Y; the payload ramp faces the lander's +X. */
  landerHeadingRad: number
  /**
   * How many rim anchors the rover drills, starting with the one nearest the lander and working
   * around the rim. Anchors it skips are shown installed on an even schedule.
   */
  roverAnchorCount: number
  /** Rover stops this far outside an anchor so its arm can reach it (m). */
  roverStandoffM: number
  /** Rover drives around the rim at this multiple of the crater radius (clear of the tower winches). */
  rimPathRadiusFraction: number
  roverSpeedMps: number
  roverToolS: number
  /** Rover stops this far outside a tower winch to dock its arm for cable tensioning (m). */
  winchStandoffM: number
}

export const defaultMissionSceneConfig: MissionSceneConfig = {
  // Ramp faces west: seen side-on from the overview camera, with the crater ahead of the rover.
  landerHeadingRad: 3.0,
  roverAnchorCount: 12,
  roverStandoffM: 1.5,
  rimPathRadiusFraction: 1.18,
  roverSpeedMps: 1.6,
  roverToolS: 8,
  winchStandoffM: 1.6,
}

export type MissionAssetId = 'lander' | 'telescope' | 'rover'

/** Camera framing for focusing one asset: where to look and from how far. */
export type FocusFrame = { targetM: Vec3; distanceM: number; minDistanceM: number }

export type MissionSceneLayout = {
  config: MissionSceneConfig
  lander: { positionM: Vec3; headingRad: number }
  /** Rover egress path in world coordinates (shelf → ramp → ground). */
  egressPath: Vec3[]
  /** One-way anchor tour: egress exit → every anchor's standoff, around the rim. */
  route: RoverRoute
  routeSteps: RouteStep[]
  /** Rim anchors the rover services, in visiting order. */
  roverAnchors: Vec3[]
  /** Anchor index (into `lcrt.anchors`) worked at each route waypoint, or null. */
  waypointAnchor: (number | null)[]
  /** When each anchor (indexed like `lcrt.anchors`) is drilled, as windows of the anchor step. */
  anchorSchedule: AnchorWindow[]
  /** After the anchors: along the rim to the nearest tower winch, where the rover docks its arm. */
  service: { route: RoverRoute; steps: RouteStep[]; towerIndex: number; winchM: Vec3 }
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

  // Start at the anchor nearest the lander and work around the rim (decreasing bearing).
  const bearing = (p: Vec3) => Math.atan2(p[2] - crater.z, p[0] - crater.x)
  const byBearing = [...lcrt.anchors].sort((a, b) => bearing(b) - bearing(a))
  const distance = (p: Vec3) => Math.hypot(p[0] - pad.x, p[2] - pad.z)
  const first = byBearing.reduce((best, p, i) => (distance(p) < distance(byBearing[best]) ? i : best), 0)
  const near = Array.from({ length: Math.min(config.roverAnchorCount, byBearing.length) }, (_, i) => byBearing[(first + i) % byBearing.length])
  const ground = (x: number, z: number): Vec3 => [x, terrain.heightAt(x, z), z]
  const rimR = crater.radiusM * config.rimPathRadiusFraction
  const radial = (a: number, r: number): Vec3 => ground(crater.x + Math.cos(a) * r, crater.z + Math.sin(a) * r)
  const standoff = (anchor: Vec3): Vec3 => radial(bearing(anchor), Math.hypot(anchor[0] - crater.x, anchor[2] - crater.z) + config.roverStandoffM)
  /** Waypoints along the rim, outside the crest, strictly between two bearings, in ~7.5° steps. */
  const rimArc = (from: number, to: number): RouteWaypoint[] => {
    const delta = angleDelta(from, to)
    const steps = Math.max(1, Math.round(Math.abs(delta) / (Math.PI / 24)))
    return Array.from({ length: steps - 1 }, (_, k) => ({ position: radial(from + (delta * (k + 1)) / steps, rimR) }))
  }

  const waypoints: RouteWaypoint[] = [{ position: exit }]
  near.forEach((anchor, i) => {
    if (i > 0) waypoints.push(...rimArc(bearing(near[i - 1]), bearing(anchor)))
    waypoints.push({ position: standoff(anchor), workTarget: anchor })
  })
  const route: RoverRoute = { waypoints, speedMps: config.roverSpeedMps, toolS: config.roverToolS, turnRateRadPerS: 0.9 }
  const steps = routeSteps(route, false)

  // Each anchor appears while the rover's drill runs on it; skipped anchors install evenly.
  const periodS = stepsDurationS(steps)
  const anchorSchedule = defaultAnchorSchedule(lcrt.anchors.length)
  let elapsed = 0
  const waypointAnchor = waypoints.map((w) => (w.workTarget ? lcrt.anchors.indexOf(w.workTarget) : null))
  for (const step of steps) {
    const index = step.kind === 'tool' ? (waypointAnchor[step.waypoint] ?? -1) : -1
    if (index >= 0 && periodS > 0) anchorSchedule[index] = { start: elapsed / periodS, end: (elapsed + step.durationS) / periodS }
    elapsed += step.durationS
  }

  // Then to the nearest tower's cable winch, to tension the suspension cables.
  const last = near[near.length - 1] ?? exit
  const towerIndex = lcrt.towerBases.reduce((best, b, i) => (Math.abs(angleDelta(bearing(last), bearing(b))) < Math.abs(angleDelta(bearing(last), bearing(lcrt.towerBases[best]))) ? i : best), 0)
  const tower = lcrt.towerBases[towerIndex]
  const towerBearing = bearing(tower)
  const towerR = Math.hypot(tower[0] - crater.x, tower[2] - crater.z)
  const winchM = radial(towerBearing, towerR + WINCH_OFFSET_M)
  const serviceRoute: RoverRoute = {
    waypoints: [
      { position: waypoints[waypoints.length - 1].position },
      ...rimArc(bearing(last), towerBearing),
      { position: radial(towerBearing, towerR + WINCH_OFFSET_M + config.winchStandoffM), workTarget: winchM },
    ],
    speedMps: config.roverSpeedMps,
    toolS: 0,
    turnRateRadPerS: 0.9,
  }

  const rimY = lcrt.dishVertexY + lcrt.dishSagM
  return {
    config,
    lander: { positionM, headingRad },
    egressPath,
    route,
    routeSteps: steps,
    roverAnchors: near,
    waypointAnchor,
    anchorSchedule,
    service: { route: serviceRoute, steps: routeSteps(serviceRoute, false), towerIndex, winchM },
    focus: {
      lander: { targetM: [positionM[0], positionM[1] + 1.5, positionM[2]], distanceM: 10, minDistanceM: 4 },
      telescope: { targetM: [lcrt.center.x, (rimY + lcrt.receiver[1]) / 2 - 2, lcrt.center.z], distanceM: 62, minDistanceM: 18 },
      rover: { distanceM: 5.5, minDistanceM: 2.2 },
    },
    // Lander in the foreground, the radio telescope crater behind it. High enough to see over the
    // near rim into the bowl, where the reflector hangs 4–8 m below the surrounding ground.
    overview: { positionM: [18, 14.5, 29], targetM: [-13, -4, -13] },
  }
}

/** Rock keep-out circles along the rover's paths so it never drives through boulders. */
export function corridorKeepOut(layout: MissionSceneLayout, radiusM = 1.8, spacingM = 2): KeepOut[] {
  const points = [...layout.egressPath, ...layout.route.waypoints.map((w) => w.position), ...layout.service.route.waypoints.map((w) => w.position)]
  const zones: KeepOut[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, , az] = points[i]
    const [bx, , bz] = points[i + 1]
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / spacingM))
    for (let k = 0; k <= steps; k += 1) zones.push({ x: ax + ((bx - ax) * k) / steps, z: az + ((bz - az) * k) / steps, radiusM })
  }
  return zones
}
