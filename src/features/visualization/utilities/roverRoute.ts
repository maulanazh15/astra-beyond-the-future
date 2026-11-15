import type { Vec3 } from '../types/scene'

/**
 * Pure rover motion along a looped route: drive each leg, turn in place at corners, and at work
 * stops turn to face the work site and run the tool. Positions are horizontal (x, z); the scene
 * puts the rover on the terrain. Headings follow three.js: rotation about +Y, 0 = facing +X.
 */

export type RouteWaypoint = {
  position: Vec3
  /** At a work stop the rover faces `workTarget` and runs its tool. */
  workTarget?: Vec3
}

export type RoverRoute = {
  waypoints: RouteWaypoint[]
  /** Display speed (m/s); real construction rovers drive far slower. */
  speedMps: number
  /** Tool operation time at each work stop (s). */
  toolS: number
  /** Turn-in-place rate (rad/s). */
  turnRateRadPerS: number
}

export type RoverCyclePose = {
  position: Vec3
  headingRad: number
  /** Total distance driven (m), for wheel rotation. */
  odometerM: number
  mode: 'drive' | 'turn' | 'tool'
  /** Progress of the current tool operation (0–1); 0 outside tool operations. */
  tool: number
  /** Index of the waypoint the rover is driving to, at, or working at. */
  waypoint: number
}

/** Heading that points the rover's +X axis from `a` toward `b`. */
export function headingTo(a: Vec3, b: Vec3): number {
  return Math.atan2(-(b[2] - a[2]), b[0] - a[0])
}

/** Smallest signed difference between two angles (radians, −π…π). */
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export type RouteStep =
  | { kind: 'turn'; from: number; to: number; at: Vec3; waypoint: number; durationS: number }
  | { kind: 'drive'; from: Vec3; to: Vec3; heading: number; waypoint: number; durationS: number; lengthM: number }
  | { kind: 'tool'; at: Vec3; heading: number; waypoint: number; durationS: number }

/** The route unrolled into one lap of timed steps. */
export function routeSteps(route: RoverRoute): RouteStep[] {
  const { waypoints, speedMps, toolS, turnRateRadPerS } = route
  const steps: RouteStep[] = []
  const n = waypoints.length
  if (n < 2) return steps
  let heading = headingTo(waypoints[0].position, waypoints[1].position)
  for (let i = 0; i < n; i += 1) {
    const from = waypoints[i].position
    const next = waypoints[(i + 1) % n]
    const target = headingTo(from, next.position)
    const turn = Math.abs(angleDelta(heading, target))
    if (turn > 1e-3) steps.push({ kind: 'turn', from: heading, to: heading + angleDelta(heading, target), at: from, waypoint: i, durationS: turn / turnRateRadPerS })
    heading = target
    const lengthM = Math.hypot(next.position[0] - from[0], next.position[2] - from[2])
    steps.push({ kind: 'drive', from, to: next.position, heading, waypoint: (i + 1) % n, durationS: lengthM / speedMps, lengthM })
    if (next.workTarget) {
      const face = headingTo(next.position, next.workTarget)
      const faceTurn = Math.abs(angleDelta(heading, face))
      if (faceTurn > 1e-3) steps.push({ kind: 'turn', from: heading, to: heading + angleDelta(heading, face), at: next.position, waypoint: (i + 1) % n, durationS: faceTurn / turnRateRadPerS })
      heading = face
      steps.push({ kind: 'tool', at: next.position, heading, waypoint: (i + 1) % n, durationS: toolS })
    }
  }
  return steps
}

export function routeLengthM(route: RoverRoute): number {
  return routeSteps(route).reduce((sum, s) => sum + (s.kind === 'drive' ? s.lengthM : 0), 0)
}

export function routePeriodS(route: RoverRoute): number {
  return routeSteps(route).reduce((sum, s) => sum + s.durationS, 0)
}

/** Rover pose `timeS` seconds into its work cycle (loops forever). */
export function roverCyclePose(route: RoverRoute, timeS: number, steps: RouteStep[] = routeSteps(route)): RoverCyclePose {
  const first = route.waypoints[0]?.position ?? [0, 0, 0]
  const period = steps.reduce((sum, s) => sum + s.durationS, 0)
  if (steps.length === 0 || period <= 0) return { position: first, headingRad: 0, odometerM: 0, mode: 'drive', tool: 0, waypoint: 0 }
  const lapLength = steps.reduce((sum, s) => sum + (s.kind === 'drive' ? s.lengthM : 0), 0)
  const laps = Math.floor(Math.max(0, timeS) / period)
  let t = Math.max(0, timeS) - laps * period
  let odometerM = laps * lapLength
  for (const step of steps) {
    if (t <= step.durationS) {
      const f = step.durationS > 0 ? t / step.durationS : 1
      if (step.kind === 'drive') {
        const position: Vec3 = [step.from[0] + (step.to[0] - step.from[0]) * f, 0, step.from[2] + (step.to[2] - step.from[2]) * f]
        return { position, headingRad: step.heading, odometerM: odometerM + step.lengthM * f, mode: 'drive', tool: 0, waypoint: step.waypoint }
      }
      if (step.kind === 'turn') {
        return { position: [step.at[0], 0, step.at[2]], headingRad: step.from + (step.to - step.from) * f, odometerM, mode: 'turn', tool: 0, waypoint: step.waypoint }
      }
      return { position: [step.at[0], 0, step.at[2]], headingRad: step.heading, odometerM, mode: 'tool', tool: f, waypoint: step.waypoint }
    }
    t -= step.durationS
    if (step.kind === 'drive') odometerM += step.lengthM
  }
  const last = steps[steps.length - 1]
  const at = last.kind === 'drive' ? last.to : last.at
  return { position: [at[0], 0, at[2]], headingRad: last.kind === 'turn' ? last.to : last.heading, odometerM, mode: 'drive', tool: 0, waypoint: 0 }
}

/** Point and slope along a 3D polyline at a fraction 0–1 of its length (for the egress ramp). */
export function samplePolyline(points: Vec3[], fraction: number): { position: Vec3; headingRad: number; pitchRad: number } {
  if (points.length === 0) return { position: [0, 0, 0], headingRad: 0, pitchRad: 0 }
  if (points.length === 1) return { position: points[0], headingRad: 0, pitchRad: 0 }
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]))
  const total = lengths.reduce((a, b) => a + b, 0)
  let d = Math.min(1, Math.max(0, fraction)) * total
  for (let i = 0; i < lengths.length; i += 1) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const a = points[i]
      const b = points[i + 1]
      const f = lengths[i] > 0 ? Math.min(1, d / lengths[i]) : 1
      const horizontal = Math.hypot(b[0] - a[0], b[2] - a[2])
      return {
        position: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
        headingRad: headingTo(a, b),
        pitchRad: Math.atan2(b[1] - a[1], horizontal),
      }
    }
    d -= lengths[i]
  }
  return { position: points[points.length - 1], headingRad: 0, pitchRad: 0 }
}
