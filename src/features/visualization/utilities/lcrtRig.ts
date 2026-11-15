import type { TelescopeDeployment } from '../animations/missionTimeline'
import type { Vec3 } from '../types/scene'
import type { LcrtLayout } from './lcrtLayout'
import type { Strut } from './struts'

/**
 * Pure geometry of the telescope during assembly: where the reflector rim, towers, receiver, and
 * every cable are for a deployment state. The model draws exactly these.
 */

/** Smallest reflector scale: the furled mesh just showing above its canister. */
export const FURLED_SCALE = 0.05
export const CANISTER_RADIUS_M = 1.1
export const RECEIVER_STOW_OFFSET_M = 0.7
/** Cable winch on each tower footing, this far outward from the tower axis (m). */
export const WINCH_OFFSET_M = 1.6

/** Part of the anchor step (0–1) during which one anchor is drilled in. */
export type AnchorWindow = { start: number; end: number }

/** Anchors drilled one after another in index order, each taking an equal share. */
export function defaultAnchorSchedule(count: number): AnchorWindow[] {
  return Array.from({ length: count }, (_, i) => ({ start: i / count, end: (i + 1) / count }))
}

/** How far each anchor is installed (0–1) at anchor-step progress `anchors`. */
export function anchorInstallProgress(anchors: number, schedule: readonly AnchorWindow[]): number[] {
  return schedule.map(({ start, end }) => (anchors >= end ? 1 : anchors <= start ? 0 : (anchors - start) / (end - start)))
}

export const SUSPENSION_RADIUS_M = 0.045
export const TIE_DOWN_FRACTION = 0.72

export type TelescopeRig = {
  /** Reflector scale about its vertex: (s, s², s) keeps the paraboloid's shape (inner cap). */
  reflectorScale: number
  towerTops: Vec3[]
  receiver: Vec3
  cables: Strut[]
}

export function reflectorScale(reflector: number): number {
  return FURLED_SCALE + (1 - FURLED_SCALE) * Math.min(1, Math.max(0, reflector))
}

/** Point on the reflector at bearing `a` and fraction `f` of the full radius, for scale `s`. */
export function reflectorPoint(layout: LcrtLayout, s: number, a: number, f = 1): Vec3 {
  const r = layout.dishRadiusM * s * f
  return [layout.center.x + Math.cos(a) * r, layout.dishVertexY + layout.dishSagM * (s * f) ** 2, layout.center.z + Math.sin(a) * r]
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Cable slots, so instanced meshes can be sized once. */
export function cableCount(layout: LcrtLayout): number {
  return layout.anchors.length * 2 + layout.towerBases.length * 5
}

export function telescopeRig(layout: LcrtLayout, d: TelescopeDeployment): TelescopeRig {
  const s = reflectorScale(d.reflector)
  const { center, towerBases, towerHeightM, anchors, receiver: focus } = layout
  const towerTops = towerBases.map((b): Vec3 => [b[0], b[1] + towerHeightM * Math.max(0.04, d.towers), b[2]])
  const stowedReceiver: Vec3 = [center.x, layout.dishVertexY + RECEIVER_STOW_OFFSET_M, center.z]
  const receiver = lerp3(stowedReceiver, focus, d.receiver)
  const cables: Strut[] = []
  const bearing = (p: Vec3) => Math.atan2(p[2] - center.z, p[0] - center.x)

  // Main suspension: anchor → reflector rim, paid out from the anchor.
  for (const anchor of anchors) {
    if (d.cables <= 0 || d.anchors < 1) continue
    const rim = reflectorPoint(layout, s, bearing(anchor))
    cables.push({ from: anchor, to: lerp3(anchor, rim, d.cables), radiusM: SUSPENSION_RADIUS_M })
  }
  // Tie-downs: reflector underside → crater floor, keeping the mesh's shape under tension.
  for (const anchor of anchors) {
    if (d.reflector <= 0.3) continue
    const a = bearing(anchor) + Math.PI / anchors.length
    const top = reflectorPoint(layout, s, a, TIE_DOWN_FRACTION)
    cables.push({ from: top, to: [top[0], layout.floorY + (top[1] - layout.floorY) * 0.04, top[2]], radiusM: 0.02 })
  }
  towerBases.forEach((base, i) => {
    const top = towerTops[i]
    // Guy wires stay the tower against the cable loads, anchored outward on the rim.
    if (d.towers > 0) for (const g of layout.guyAnchors.slice(i * 2, i * 2 + 2)) cables.push({ from: [top[0], top[1] - 0.4, top[2]], to: g, radiusM: 0.02 })
    if (d.towers < 1 || d.cables <= 0) return
    // Receiver bridle (also the hoist line while the receiver goes up).
    cables.push({ from: top, to: lerp3(top, receiver, d.cables), radiusM: 0.035 })
    // Rim catenaries from each tower to the reflector rim on either side of its bearing.
    for (const offset of [-0.6, 0.6]) {
      cables.push({ from: top, to: lerp3(top, reflectorPoint(layout, s, bearing(base) + offset), d.cables), radiusM: 0.025 })
    }
  })
  return { reflectorScale: s, towerTops, receiver, cables }
}
