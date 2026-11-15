import { egressPose, landerPose, ramp, telescopeDeployment, TELESCOPE_STEPS } from '../animations/missionTimeline'
import type { Vec3 } from '../types/scene'
import { LANDER, ROVER_STOW_X } from './landerLayout'
import { landerToWorld } from './missionSceneLayout'
import type { MissionSceneLayout } from './missionSceneLayout'
import { routePoseAt, samplePolyline, stepsDurationS } from './roverRoute'

/**
 * Where the construction rover is for a point in the mission, as a pure function of mission
 * progress: the same progress always gives the same pose, so playback, scrubbing, pausing, and
 * replays all agree, and a stalled or failed mission leaves the rover exactly where it stopped.
 *
 * Sequence: clamped on the lander's shelf through descent → down the ramp (egress) → around the
 * rim drilling every anchor (the anchor step) → to the nearest tower winch → arm docked to the
 * winch while the cables are tensioned and the reflector unfurls → arm stowed, parked.
 */
export type RoverMissionPhase = 'shelf' | 'egress' | 'anchors' | 'service' | 'docked' | 'parked'

export type RoverMissionInput = {
  /** Landing sequence, 0–1 (the rover rides the lander until touchdown). */
  landing: number
  /** Rover egress, 0–1. */
  egress: number
  /** Construction progress, 0–1. */
  telescope: number
}

export type RoverMissionPose = {
  phase: RoverMissionPhase
  /** World position. On the ground phases y is the route's ground height; the scene re-samples the terrain. */
  positionM: Vec3
  /** True once the rover is off the ramp and should follow the terrain. */
  onGround: boolean
  headingRad: number
  /** Nose-up pitch on the ramp (radians). */
  pitchRad: number
  /** Total distance driven since leaving the shelf (m): drives the wheel rotation. */
  odometerM: number
  /** Arm cycle parameter for `armPoseForTool` (0 = stowed; 0.25 = reaching; 0.25–0.8 drilling). */
  armTool: number
  /** Index into `lcrt.anchors` of the anchor being drilled, if any. */
  drillingAnchor: number | null
  /** Paying out suspension cable from the rear spool (driving between anchors). */
  layingCable: boolean
}

/** Construction progress at which the service drive ends and the arm docks to the winch. */
const DOCK_AT = TELESCOPE_STEPS.cables[0]
/** Construction progress over which the arm releases the winch and stows, after the reflector is out. */
const UNDOCK = [TELESCOPE_STEPS.reflector[1], TELESCOPE_STEPS.reflector[1] + 0.04] as const

/** Length of the egress path (m): the odometer reading when the rover reaches the regolith. */
export function egressLengthM(path: Vec3[]): number {
  return path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]), 0)
}

export function roverMissionPose(layout: MissionSceneLayout, input: RoverMissionInput): RoverMissionPose {
  const { lander, egressPath, route, routeSteps, service } = layout
  const e = egressPose(input.egress)
  const egressM = egressLengthM(egressPath)
  const base = { pitchRad: 0, armTool: 0, drillingAnchor: null, layingCable: false }

  if (input.egress < 1e-3 || e.drive <= 0) {
    // Clamped on the shelf; rides the lander through its descent.
    const altitude = landerPose(input.landing).altitudeM
    const positionM = landerToWorld(lander.positionM, lander.headingRad, [ROVER_STOW_X, LANDER.shelf.topY + altitude, 0])
    return { ...base, phase: 'shelf', positionM, onGround: false, headingRad: lander.headingRad, odometerM: 0 }
  }
  if (e.drive < 1 || input.telescope <= 0) {
    const s = sampleEgress(egressPath, e.drive)
    return { ...base, phase: 'egress', positionM: s.position, onGround: s.onGround, headingRad: s.headingRad, pitchRad: s.pitchRad, odometerM: egressM * e.drive }
  }

  const p = input.telescope
  const routeM = routeSteps.reduce((sum, s) => sum + (s.kind === 'drive' ? s.lengthM : 0), 0)
  const anchors = telescopeDeployment(p).anchors
  if (anchors < 1) {
    const pose = routePoseAt(route, anchors * stepsDurationS(routeSteps), routeSteps)
    const drillingAnchor = pose.mode === 'tool' ? layout.waypointAnchor[pose.waypoint] : null
    return {
      ...base,
      phase: 'anchors',
      positionM: pose.position,
      onGround: true,
      headingRad: pose.headingRad,
      odometerM: egressM + pose.odometerM,
      armTool: pose.mode === 'tool' ? pose.tool : 0,
      drillingAnchor,
      // Cable runs from the first anchor onward.
      layingCable: pose.mode === 'drive' && pose.waypoint > 1,
    }
  }

  const drive = ramp(p, TELESCOPE_STEPS.anchors[1], DOCK_AT)
  const pose = routePoseAt(service.route, drive * stepsDurationS(service.steps), service.steps)
  const common = { ...base, positionM: pose.position, onGround: true, headingRad: pose.headingRad, odometerM: egressM + routeM + pose.odometerM }
  // The arm reaches out over the last part of the drive, holds the winch, then stows.
  if (drive < 1) return { ...common, phase: 'service', armTool: 0.25 * ramp(drive, 0.8, 1) }
  if (p < UNDOCK[0]) return { ...common, phase: 'docked', armTool: 0.25 }
  const release = ramp(p, UNDOCK[0], UNDOCK[1])
  return { ...common, phase: release < 1 ? 'docked' : 'parked', armTool: release < 1 ? 0.8 + 0.2 * release : 0 }
}

/** Egress path sample, flagging when the rover is past the ramp foot and on the regolith. */
function sampleEgress(path: Vec3[], fraction: number) {
  const s = samplePolyline(path, fraction)
  const total = egressLengthM(path)
  const [a, b] = [path[path.length - 2], path[path.length - 1]]
  // The last segment runs from the ramp foot across the pad.
  const lastM = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  return { ...s, onGround: Math.min(1, Math.max(0, fraction)) * total >= total - lastM }
}
