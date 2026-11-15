import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { Group } from 'three'
import { egressPose } from '../../animations/missionTimeline'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import { LANDER, ROVER_STOW_X, rampAngleRad } from '../../utilities/landerLayout'
import type { Strut } from '../../utilities/struts'
import { BeveledBox, CableRun, Hinge } from '../spacecraft/parts'
import { StrutInstances } from '../StrutInstances'

const { topY, innerX, outerX, halfWidthM } = LANDER.shelf
const SHELF_LENGTH = outerX - innerX
const RAMP = LANDER.rampLengthM

function shelfSupports(): Strut[] {
  const struts: Strut[] = []
  for (const side of [-1, 1]) {
    const tip: Vec3 = [outerX - 0.06, topY - 0.06, side * (halfWidthM - 0.05)]
    struts.push({ from: tip, to: [innerX - 0.04, LANDER.thrustPlateY + 0.02, side * 0.36], radiusM: 0.028 })
    struts.push({ from: tip, to: [innerX - 0.02, LANDER.bayTopY - 0.04, side * 0.4], radiusM: 0.022 })
    struts.push({ from: [innerX + SHELF_LENGTH * 0.5, topY - 0.06, side * (halfWidthM - 0.05)], to: [innerX - 0.03, LANDER.thrustPlateY + 0.02, side * 0.1], radiusM: 0.018 })
  }
  return struts
}

/** Launch-lock clamp jaws at the rover's wheel stations; they swing open on release. */
const CLAMPS: Vec3[] = [
  [ROVER_STOW_X - 0.55, topY, 0.5],
  [ROVER_STOW_X - 0.55, topY, -0.5],
  [ROVER_STOW_X + 0.6, topY, 0.5],
  [ROVER_STOW_X + 0.6, topY, -0.5],
]

/**
 * Deployment connections on the +X face: the payload shelf that carries the rover, launch-lock
 * clamps, the rover umbilical, and the hinged egress ramp (stowed upright as a cover).
 */
export function PayloadShelf({ egress, materials }: { egress: RefObject<number>; materials: SpacecraftMaterials }) {
  const supports = useMemo(() => shelfSupports(), [])
  const ramp = useRef<Group>(null)
  const clamps = useRef<(Group | null)[]>([])
  const umbilical = useRef<Group>(null)
  const umbilicalPath = useMemo((): Vec3[] => [[innerX + 0.03, 1.12, 0.16], [innerX + 0.2, 1.02, 0.2], [ROVER_STOW_X - 0.62, 1.2, 0.12]], [])

  useFrame(() => {
    const e = egressPose(egress.current)
    if (ramp.current) ramp.current.rotation.z = rampAngleRad(e.ramp)
    clamps.current.forEach((c, i) => {
      if (c) c.rotation.x = e.clampsReleased ? (i % 2 === 0 ? 0.9 : -0.9) : 0
    })
    if (umbilical.current) umbilical.current.visible = !e.clampsReleased
  })

  return (
    <group>
      {/* Shelf deck: graphite plate with aluminium edge rails and tie-down points. */}
      <BeveledBox size={[SHELF_LENGTH, 0.06, halfWidthM * 2]} position={[innerX + SHELF_LENGTH / 2, topY - 0.03, 0]} material={materials.graphite} bevelM={0.012} />
      {[-1, 1].map((side) => (
        <BeveledBox key={side} size={[SHELF_LENGTH, 0.05, 0.04]} position={[innerX + SHELF_LENGTH / 2, topY + 0.005, side * (halfWidthM - 0.02)]} material={materials.aluminium} bevelM={0.01} />
      ))}
      <StrutInstances struts={supports} material={materials.aluminium} />
      {CLAMPS.map((p, i) => (
        <group key={p.join()} position={p}>
          <BeveledBox size={[0.1, 0.05, 0.08]} position={[0, 0.025, 0]} material={materials.graphite} bevelM={0.01} />
          <group
            ref={(g) => {
              clamps.current[i] = g
            }}
            position={[0, 0.05, 0]}
          >
            <BeveledBox size={[0.06, 0.12, 0.03]} position={[0, 0.06, 0]} material={materials.warm} bevelM={0.008} />
          </group>
        </group>
      ))}
      {/* Umbilical: power and data to the rover until the clamps release. */}
      <group ref={umbilical}>
        <CableRun points={umbilicalPath} radiusM={0.018} material={materials.black} />
      </group>

      {/* Egress ramp: hinged at the shelf edge, stowed upright, lowered to the ground after landing. */}
      <group position={[outerX, topY, 0]}>
        <Hinge lengthM={0.9} radiusM={0.03} metal={materials.aluminium} dark={materials.black} />
        <group ref={ramp} name="lander-ramp" rotation={[0, 0, Math.PI / 2]}>
          {[-1, 1].map((side) => (
            <BeveledBox key={side} size={[RAMP, 0.07, 0.05]} position={[RAMP / 2, 0.02, side * 0.48]} material={materials.aluminium} bevelM={0.012} />
          ))}
          <BeveledBox size={[RAMP - 0.04, 0.025, 0.9]} position={[RAMP / 2, 0, 0]} material={materials.graphite} bevelM={0.006} />
          {/* Traction slats. */}
          {Array.from({ length: 7 }, (_, i) => (
            <BeveledBox key={i} size={[0.03, 0.02, 0.86]} position={[0.12 + i * ((RAMP - 0.24) / 6), 0.02, 0]} material={materials.aluminium} bevelM={0.005} />
          ))}
          {/* Foot plate that rests on the regolith. */}
          <BeveledBox size={[0.12, 0.02, 0.98]} position={[RAMP - 0.02, -0.02, 0]} rotation={[0, 0, 0.6]} material={materials.aluminium} bevelM={0.005} />
        </group>
      </group>
    </group>
  )
}
