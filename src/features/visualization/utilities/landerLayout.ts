import type { Vec3 } from '../types/scene'

/**
 * Dimensions of the LUNAR ECHO lander (meters). Origin on the ground under the center, +X toward
 * the payload shelf and rover ramp, +Y up. About 4.7 m across the footpads and 2.4 m to the deck,
 * in the class of current commercial robotic landers.
 */
export const LANDER = {
  /** Bottom of the propulsion bay (thrust plate). */
  thrustPlateY: 0.85,
  /** Top of the open propulsion bay, where the closed avionics body starts. */
  bayTopY: 1.45,
  bodyTopY: 2.35,
  deckTopY: 2.41,
  /** Circumradius of the octagonal body. */
  bodyRadiusM: 1.15,
  deckRadiusM: 1.22,
  tankRadiusM: 0.3,
  /** Distance of the four propellant tanks from the axis. */
  tankRingM: 0.62,
  tankY: 1.15,
  /** Leg hinge (hip) and footpad positions, in the leg's radial plane. */
  hipRadiusM: 1.0,
  hipY: 1.32,
  footRadiusM: 2.35,
  footY: 0.1,
  /** Fraction along the primary strut where the secondary struts attach. */
  kneeFraction: 0.55,
  /** Secondary strut anchors on the bay: radius, height, and angular offset from the leg (rad). */
  braceAnchor: { radiusM: 1.0, y: 0.9, offsetRad: 0.5 },
  /** Folded leg angle above horizontal (degrees): legs ride up along the body for launch. */
  stowedLegAngleDeg: 70,
  /** Payload shelf on the +X face: carries the rover during flight. */
  shelf: { topY: 0.97, innerX: 1.06, outerX: 2.6, halfWidthM: 0.6 },
  rampLengthM: 1.5,
} as const

/** Legs sit on the diagonals, between the payload shelf and the side radiators. */
export const LEG_BEARINGS_RAD = [1, 3, 5, 7].map((k) => (k * Math.PI) / 4)

const PRIMARY = { dr: LANDER.footRadiusM - LANDER.hipRadiusM, dy: LANDER.footY - LANDER.hipY }

/** Length of the primary leg strut, hip to ankle (m). */
export const PRIMARY_STRUT_LENGTH_M = Math.hypot(PRIMARY.dr, PRIMARY.dy)

/** Primary strut angle above horizontal when deployed (radians, negative = pointing down). */
export const DEPLOYED_LEG_ANGLE_RAD = Math.atan2(PRIMARY.dy, PRIMARY.dr)
export const STOWED_LEG_ANGLE_RAD = (LANDER.stowedLegAngleDeg * Math.PI) / 180

/** Strut angle for a deployment fraction (0 = folded, 1 = locked down). */
export function legAngleRad(deploy: number): number {
  const d = Math.min(1, Math.max(0, deploy))
  return STOWED_LEG_ANGLE_RAD + (DEPLOYED_LEG_ANGLE_RAD - STOWED_LEG_ANGLE_RAD) * d
}

/** Point at `along` meters down the primary strut of the leg at `bearing`, for a strut angle. */
export function legPoint(bearingRad: number, angleRad: number, along: number): Vec3 {
  const r = LANDER.hipRadiusM + Math.cos(angleRad) * along
  return [Math.cos(bearingRad) * r, LANDER.hipY + Math.sin(angleRad) * along, Math.sin(bearingRad) * r]
}

/** The two secondary-strut anchors on the bay for a leg. */
export function braceAnchors(bearingRad: number): [Vec3, Vec3] {
  const { radiusM, y, offsetRad } = LANDER.braceAnchor
  const at = (a: number): Vec3 => [Math.cos(a) * radiusM, y, Math.sin(a) * radiusM]
  return [at(bearingRad + offsetRad), at(bearingRad - offsetRad)]
}

/** Footpad centers when the legs are deployed (y = pad top). */
export function deployedFeet(): Vec3[] {
  return LEG_BEARINGS_RAD.map((b) => legPoint(b, DEPLOYED_LEG_ANGLE_RAD, PRIMARY_STRUT_LENGTH_M))
}

/** Ramp angle about its hinge (radians from horizontal): stowed upright, deployed down to the ground. */
export function rampAngleRad(deploy: number): number {
  const down = -Math.asin(LANDER.shelf.topY / LANDER.rampLengthM)
  const d = Math.min(1, Math.max(0, deploy))
  return Math.PI / 2 + (down - Math.PI / 2) * d
}

/** Where the deployed ramp meets the ground (lander frame). */
export function rampFoot(): Vec3 {
  const a = rampAngleRad(1)
  return [LANDER.shelf.outerX + Math.cos(a) * LANDER.rampLengthM, 0, 0]
}

/** Rover egress path in the lander frame: shelf → ramp top → ramp foot → clear of the lander. */
export function egressPathLocal(): Vec3[] {
  const { topY, outerX } = LANDER.shelf
  const foot = rampFoot()
  return [
    [ROVER_STOW_X, topY, 0],
    [outerX, topY, 0],
    foot,
    [foot[0] + 1.6, 0, 0],
  ]
}

/** Rover center on the shelf (lander frame). */
export const ROVER_STOW_X = 1.83
