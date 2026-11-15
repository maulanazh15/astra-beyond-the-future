import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { RefObject } from 'react'
import type { Group } from 'three'
import type { LanderPose } from '../../animations/missionTimeline'
import { useDisposable } from '../../hooks/useDisposable'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { LANDER, PRIMARY_STRUT_LENGTH_M, legAngleRad } from '../../utilities/landerLayout'
import { footpad } from '../geometry'
import { BeveledBox, Hinge } from '../spacecraft/parts'

const L = PRIMARY_STRUT_LENGTH_M
const KNEE = L * LANDER.kneeFraction
const ALONG_X: [number, number, number] = [0, 0, -Math.PI / 2]

/**
 * One landing leg: hinge bracket at the hip, a telescoping shock-absorbing primary strut, a knee
 * fitting for the secondary struts, a ball-jointed ankle, and a footpad that stays level.
 * Swings about its hip hinge between the folded launch position and locked down.
 */
export function LanderLeg({ bearingRad, pose, materials }: { bearingRad: number; pose: RefObject<LanderPose>; materials: SpacecraftMaterials }) {
  const swing = useRef<Group>(null)
  const pad = useRef<Group>(null)
  const piston = useRef<Group>(null)
  const padGeometry = useDisposable(() => footpad(0.3, 0.09), [])

  useFrame(() => {
    const { legDeploy, legCompression } = pose.current
    const angle = legAngleRad(legDeploy)
    if (swing.current) swing.current.rotation.z = angle
    // Keep the pad level whatever the strut angle.
    if (pad.current) pad.current.rotation.z = -angle
    // Shock absorber stroke: the piston slides a few centimeters into the cylinder at touchdown.
    if (piston.current) piston.current.position.x = -0.05 * legCompression
  })

  return (
    <group position={[Math.cos(bearingRad) * LANDER.hipRadiusM, LANDER.hipY, Math.sin(bearingRad) * LANDER.hipRadiusM]} rotation={[0, -bearingRad, 0]}>
      {/* Hip: clevis bracket bolted to the bay, hinge pin along the leg's tangent. */}
      <BeveledBox size={[0.1, 0.16, 0.26]} position={[-0.06, 0, 0]} material={materials.graphite} bevelM={0.02} />
      <Hinge lengthM={0.22} radiusM={0.035} metal={materials.aluminium} dark={materials.black} />
      <group ref={swing} name="lander-leg-swing">
        {/* Upper cylinder (painted), collar, polished piston. */}
        <mesh position={[0.08 + (KNEE - 0.08) / 2, 0, 0]} rotation={ALONG_X} material={materials.white} castShadow>
          <cylinderGeometry args={[0.062, 0.062, KNEE - 0.08, 16]} />
        </mesh>
        <mesh position={[0.08, 0, 0]} rotation={ALONG_X} material={materials.graphite} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.07, 16]} />
        </mesh>
        {/* Knee fitting where the two secondary struts attach. */}
        <mesh position={[KNEE, 0, 0]} rotation={ALONG_X} material={materials.graphite} castShadow>
          <cylinderGeometry args={[0.078, 0.078, 0.1, 16]} />
        </mesh>
        <mesh position={[KNEE, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.aluminium}>
          <cylinderGeometry args={[0.022, 0.022, 0.24, 10]} />
        </mesh>
        <group ref={piston}>
          <mesh position={[KNEE + (L - KNEE) / 2, 0, 0]} rotation={ALONG_X} material={materials.aluminium} castShadow>
            <cylinderGeometry args={[0.04, 0.04, L - KNEE, 14]} />
          </mesh>
          {/* Dust boot and ankle ball joint. */}
          <mesh position={[KNEE + 0.1, 0, 0]} rotation={ALONG_X} material={materials.black}>
            <cylinderGeometry args={[0.055, 0.05, 0.12, 14]} />
          </mesh>
          <mesh position={[L, 0, 0]} material={materials.graphite} castShadow>
            <sphereGeometry args={[0.055, 14, 10]} />
          </mesh>
          <group ref={pad} position={[L, 0, 0]}>
            <mesh position={[0, -0.035, 0]} material={materials.aluminium}>
              <cylinderGeometry args={[0.035, 0.05, 0.06, 12]} />
            </mesh>
            <mesh geometry={padGeometry} position={[0, -LANDER.footY + 0.09, 0]} material={materials.aluminium} castShadow receiveShadow />
          </group>
        </group>
      </group>
    </group>
  )
}
