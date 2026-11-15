import type { Vec3 } from '../types/scene'

/**
 * Camera position for focusing `target` from `distanceM` away, keeping the current viewing
 * direction (so focusing never spins the view around) but never below `minElevationDeg`.
 */
export function focusCameraPosition(camera: Vec3, currentTarget: Vec3, target: Vec3, distanceM: number, minElevationDeg = 12): Vec3 {
  let dx = camera[0] - currentTarget[0]
  let dy = camera[1] - currentTarget[1]
  let dz = camera[2] - currentTarget[2]
  const len = Math.hypot(dx, dy, dz) || 1
  dx /= len
  dy /= len
  dz /= len
  const minSin = Math.sin((minElevationDeg * Math.PI) / 180)
  if (dy < minSin) {
    const horizontal = Math.hypot(dx, dz) || 1
    const h = Math.sqrt(1 - minSin * minSin)
    dx = (dx / horizontal) * h
    dz = (dz / horizontal) * h
    dy = minSin
  }
  return [target[0] + dx * distanceM, target[1] + dy * distanceM, target[2] + dz * distanceM]
}
