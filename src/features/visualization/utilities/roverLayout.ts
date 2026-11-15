import type { Vec3 } from '../types/scene'

/**
 * Construction rover dimensions (meters). Origin on the ground under the chassis center, +X forward.
 * Six-wheel rocker-bogie suspension: each side has a rocker (rear wheel + bogie pivot) and a bogie
 * (middle and front wheels), so all six wheels stay on uneven ground.
 */
export const ROVER = {
  lengthM: 1.5,
  trackM: 1.0,
  wheelRadiusM: 0.16,
  wheelWidthM: 0.12,
  /** Wheel hub x positions: rear, middle, front. */
  wheelX: [-0.55, 0.08, 0.6] as const,
  body: { size: [1.0, 0.3, 0.66] as Vec3, center: [0.02, 0.52, 0] as Vec3 },
  rockerPivot: [-0.05, 0.47, 0.42] as Vec3,
  bogiePivot: [0.34, 0.3, 0.5] as Vec3,
  deckTopY: 0.67,
  mast: { x: 0.36, z: 0.22, heightM: 0.45 },
  arm: { base: [0.42, 0.67, -0.16] as Vec3, shoulderHeightM: 0.11, upperM: 0.42, foreM: 0.38, toolM: 0.18, drillStrokeM: 0.15 },
  spool: { center: [-0.36, 0.8, 0] as Vec3, radiusM: 0.12, widthM: 0.4 },
} as const

export type ArmPose = {
  /** Turret yaw (rad). */
  yaw: number
  /** Shoulder, elbow, wrist pitch (rad); shoulder measured from the forward horizontal. */
  shoulder: number
  elbow: number
  wrist: number
  /** Drill extension, 0–1. */
  drill: number
  /** Drill spin angle (rad). */
  spin: number
}

const deg = (d: number) => (d * Math.PI) / 180

export const STOWED_ARM: ArmPose = { yaw: 0, shoulder: deg(160), elbow: deg(-165), wrist: deg(-60), drill: 0, spin: 0 }

/** Shoulder pivot in the rover frame. */
export function shoulderPoint(): Vec3 {
  const { base, shoulderHeightM } = ROVER.arm
  return [base[0], base[1] + shoulderHeightM, base[2]]
}

/**
 * Planar two-link inverse kinematics (elbow up) for the wrist to reach (dx, dy) from the shoulder.
 * Returns undefined when out of reach.
 */
export function solveTwoLink(dx: number, dy: number, upperM: number, foreM: number): { shoulder: number; elbow: number } | undefined {
  const d2 = dx * dx + dy * dy
  const cos = (d2 - upperM * upperM - foreM * foreM) / (2 * upperM * foreM)
  if (cos < -1 || cos > 1) return undefined
  const elbow = -Math.acos(cos)
  const shoulder = Math.atan2(dy, dx) - Math.atan2(foreM * Math.sin(elbow), upperM + foreM * Math.cos(elbow))
  return { shoulder, elbow }
}

/** Ground point in front of the rover where the anchor drill works (rover frame). */
export const DRILL_SITE_X = 1.05

/** Arm pose that holds the drill vertically over the drill site, wrist just high enough for the stroke. */
export function reachArmPose(): ArmPose {
  const { upperM, foreM, toolM, drillStrokeM } = ROVER.arm
  const [sx, sy] = shoulderPoint()
  const wristY = 0.02 + toolM + drillStrokeM
  const solution = solveTwoLink(DRILL_SITE_X - sx, wristY - sy, upperM, foreM)
  if (!solution) return STOWED_ARM
  return { yaw: 0, shoulder: solution.shoulder, elbow: solution.elbow, wrist: -Math.PI / 2 - solution.shoulder - solution.elbow, drill: 0, spin: 0 }
}

const REACH = reachArmPose()

function mix(a: ArmPose, b: ArmPose, t: number): ArmPose {
  const k = t * t * (3 - 2 * t)
  const l = (x: number, y: number) => x + (y - x) * k
  return { yaw: l(a.yaw, b.yaw), shoulder: l(a.shoulder, b.shoulder), elbow: l(a.elbow, b.elbow), wrist: l(a.wrist, b.wrist), drill: 0, spin: 0 }
}

/**
 * Arm motion through one anchor installation (tool = 0…1): unfold, drill the anchor in while
 * spinning, withdraw, fold back. Outside a tool operation the arm stays stowed.
 */
export function armPoseForTool(tool: number): ArmPose {
  const t = Math.min(1, Math.max(0, tool))
  if (t <= 0 || t >= 1) return STOWED_ARM
  if (t < 0.25) return mix(STOWED_ARM, REACH, t / 0.25)
  if (t > 0.8) return mix(REACH, STOWED_ARM, (t - 0.8) / 0.2)
  const d = (t - 0.25) / 0.55
  // Drill down, hold, and withdraw within the working window.
  const drill = d < 0.4 ? d / 0.4 : d < 0.75 ? 1 : 1 - (d - 0.75) / 0.25
  return { ...REACH, drill, spin: d * 40 }
}

/** Drill tip in the rover frame (for tests and dust effects). */
export function drillTip(pose: ArmPose): Vec3 {
  const { upperM, foreM, toolM, drillStrokeM } = ROVER.arm
  const [sx, sy, sz] = shoulderPoint()
  const a1 = pose.shoulder
  const a2 = a1 + pose.elbow
  const a3 = a2 + pose.wrist
  const reach = toolM + drillStrokeM * pose.drill
  const x = upperM * Math.cos(a1) + foreM * Math.cos(a2) + reach * Math.cos(a3)
  const y = upperM * Math.sin(a1) + foreM * Math.sin(a2) + reach * Math.sin(a3)
  // Turret yaw swings the arm plane about the vertical axis through the base.
  return [sx + x * Math.cos(pose.yaw), sy + y, sz - x * Math.sin(pose.yaw)]
}
