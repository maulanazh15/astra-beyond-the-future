import type { Terrain } from '../types/scene'
import type { MissionSceneLayout } from './missionSceneLayout'

const SAMPLE_M = 1
const LIFT_M = 0.08

/** The rover's anchor tour and winch drive as a terrain-hugging polyline, with distance along it. */
export function routeGuidePoints(layout: MissionSceneLayout, terrain: Terrain): { positions: number[]; distancesM: number[] } {
  const corners = [...layout.route.waypoints, ...layout.service.route.waypoints.slice(1)].map((w) => w.position)
  const positions: number[] = []
  const distancesM: number[] = []
  let travelled = 0
  corners.forEach((p, i) => {
    if (i === 0) {
      positions.push(p[0], terrain.heightAt(p[0], p[2]) + LIFT_M, p[2])
      distancesM.push(0)
      return
    }
    const a = corners[i - 1]
    const length = Math.hypot(p[0] - a[0], p[2] - a[2])
    const n = Math.max(1, Math.ceil(length / SAMPLE_M))
    for (let k = 1; k <= n; k += 1) {
      const x = a[0] + ((p[0] - a[0]) * k) / n
      const z = a[2] + ((p[2] - a[2]) * k) / n
      positions.push(x, terrain.heightAt(x, z) + LIFT_M, z)
      distancesM.push(travelled + (length * k) / n)
    }
    travelled += length
  })
  return { positions, distancesM }
}
