import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial } from 'three'
import type { Group } from 'three'
import { useDisposable } from '../hooks/useDisposable'
import { ACCENT_CYAN } from '../materials/spacecraftMaterials'
import type { Terrain } from '../types/scene'
import type { MissionSceneLayout } from '../utilities/missionSceneLayout'
import { egressLengthM } from '../utilities/roverMission'
import { routeGuidePoints } from '../utilities/routeGuide'
import type { RoverMissionPose } from '../utilities/roverMission'

/**
 * Wide-shot readability for the rover: its route around the crater rim drawn on the ground, the
 * driven part brighter than the part ahead. Shown only while the rover is touring the rim; it reads
 * the same progress-driven pose as the rover, so it never runs ahead of it.
 */
export function RoverRouteGuide({ layout, terrain, pose }: { layout: MissionSceneLayout; terrain: Terrain; pose: RefObject<RoverMissionPose | null> }) {
  const { positions, distancesM } = useMemo(() => routeGuidePoints(layout, terrain), [layout, terrain])
  const startM = useMemo(() => egressLengthM(layout.egressPath), [layout.egressPath])
  const makeGeometry = () => new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3))
  const aheadGeometry = useDisposable(makeGeometry, [positions.length, layout.route.waypoints.length])
  const drivenGeometry = useDisposable(makeGeometry, [positions.length, layout.route.waypoints.length, 'driven'])
  const aheadMaterial = useDisposable(() => new LineBasicMaterial({ color: ACCENT_CYAN, transparent: true, opacity: 0.28, toneMapped: false }), [])
  const drivenMaterial = useDisposable(() => new LineBasicMaterial({ color: ACCENT_CYAN, transparent: true, opacity: 0.85, toneMapped: false }), [])
  const ahead = useMemo(() => new Line(aheadGeometry, aheadMaterial), [aheadGeometry, aheadMaterial])
  const driven = useMemo(() => new Line(drivenGeometry, drivenMaterial), [drivenGeometry, drivenMaterial])
  const group = useRef<Group>(null)
  const lastIndex = useRef(-1)

  useFrame(() => {
    const g = group.current
    const p = pose.current
    if (!g) return
    g.visible = p !== null && (p.phase === 'anchors' || p.phase === 'service')
    if (!p || !g.visible) return
    const travelled = p.odometerM - startM
    // Last sample at or behind the rover (distances are sorted).
    let lo = 0
    let hi = distancesM.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (distancesM[mid] <= travelled) lo = mid
      else hi = mid - 1
    }
    if (lo === lastIndex.current) return
    lastIndex.current = lo
    driven.geometry.setDrawRange(0, lo + 1)
    ahead.geometry.setDrawRange(lo, distancesM.length - lo)
  })

  return (
    <group ref={group} name="rover-route-guide" visible={false}>
      <primitive object={ahead} />
      <primitive object={driven} />
    </group>
  )
}
