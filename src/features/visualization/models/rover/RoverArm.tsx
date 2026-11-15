import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { ArmPose } from '../../utilities/roverLayout'
import { ROVER } from '../../utilities/roverLayout'
import { BeveledBox } from '../spacecraft/parts'

const { upperM, foreM, toolM, drillStrokeM, shoulderHeightM } = ROVER.arm

/** Joint actuator: a short drum along local Z with machined end caps. */
function Joint({ radiusM, materials }: { radiusM: number; materials: SpacecraftMaterials }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={materials.graphite} castShadow>
        <cylinderGeometry args={[radiusM, radiusM, radiusM * 1.9, 16]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, s * radiusM, 0]} material={materials.aluminium}>
          <cylinderGeometry args={[radiusM * 0.7, radiusM * 0.7, 0.012, 16]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Four-joint arm (turret yaw, shoulder, elbow, wrist pitch) ending in an anchor drill. Origin at
 * the turret base; links extend along +X. `pose` is read every frame.
 */
export function RoverArm({ pose, materials }: { pose: () => ArmPose; materials: SpacecraftMaterials }) {
  const turret = useRef<Group>(null)
  const shoulder = useRef<Group>(null)
  const elbow = useRef<Group>(null)
  const wrist = useRef<Group>(null)
  const bit = useRef<Group>(null)

  useFrame(() => {
    const p = pose()
    if (turret.current) turret.current.rotation.y = p.yaw
    if (shoulder.current) shoulder.current.rotation.z = p.shoulder
    if (elbow.current) elbow.current.rotation.z = p.elbow
    if (wrist.current) wrist.current.rotation.z = p.wrist
    if (bit.current) {
      bit.current.position.x = toolM * 0.55 + drillStrokeM * p.drill
      bit.current.rotation.x = p.spin
    }
  })

  return (
    <group ref={turret}>
      <mesh position={[0, 0.03, 0]} material={materials.graphite} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.06, 18]} />
      </mesh>
      <BeveledBox size={[0.08, shoulderHeightM, 0.1]} position={[0, shoulderHeightM / 2, 0]} material={materials.white} bevelM={0.015} />
      <group ref={shoulder} name="rover-arm-shoulder" position={[0, shoulderHeightM, 0]}>
        <Joint radiusM={0.045} materials={materials} />
        <BeveledBox size={[upperM, 0.055, 0.06]} position={[upperM / 2, 0, 0]} material={materials.white} bevelM={0.015} />
        <group ref={elbow} position={[upperM, 0, 0]}>
          <Joint radiusM={0.038} materials={materials} />
          <BeveledBox size={[foreM, 0.045, 0.05]} position={[foreM / 2, 0, 0]} material={materials.white} bevelM={0.012} />
          <group ref={wrist} position={[foreM, 0, 0]}>
            <Joint radiusM={0.03} materials={materials} />
            {/* Drill housing, chuck, and the spinning helical anchor bit. */}
            <BeveledBox size={[toolM * 0.55, 0.07, 0.07]} position={[toolM * 0.28, 0, 0]} material={materials.graphite} bevelM={0.012} />
            <group ref={bit} name="rover-drill-bit" position={[toolM * 0.55, 0, 0]}>
              <mesh position={[0.02, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.aluminium}>
                <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
              </mesh>
              <mesh position={[toolM * 0.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={materials.warm} castShadow>
                <coneGeometry args={[0.02, toolM * 0.45, 10]} />
              </mesh>
              {[0.06, 0.1, 0.14].map((x) => (
                <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.aluminium}>
                  <torusGeometry args={[0.024, 0.006, 4, 12]} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
