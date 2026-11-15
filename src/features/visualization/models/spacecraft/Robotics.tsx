import { useMemo } from 'react'
import type { Vec3 } from '../../types/scene'
import type { Strut } from '../../utilities/struts'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, CableRun, Hinge, MountBracket } from './parts'
import type { ModuleProps } from './types'

/** Deployment rover stowed on a side shelf: chassis, solar deck, mast camera, four wheels. */
export function Rover({ materials: m }: ModuleProps) {
  const shelf = useMemo<Strut[]>(
    () => [
      { from: [0.06, -0.12, 0.25], to: [0.6, -0.2, 0.25], radiusM: 0.016 },
      { from: [0.06, -0.12, -0.25], to: [0.6, -0.2, -0.25], radiusM: 0.016 },
      { from: [0.06, 0.12, 0.25], to: [0.6, -0.2, 0.25], radiusM: 0.012 },
      { from: [0.06, 0.12, -0.25], to: [0.6, -0.2, -0.25], radiusM: 0.012 },
    ],
    [],
  )
  return (
    <group>
      <MountBracket width={0.56} height={0.3} graphite={m.graphite} metal={m.aluminium} />
      <StrutInstances struts={shelf} material={m.aluminium} />
      <BeveledBox size={[0.58, 0.03, 0.56]} position={[0.34, -0.215, 0]} material={m.graphite} bevelM={0.01} />
      <group position={[0.34, -0.2, 0]}>
        <BeveledBox size={[0.5, 0.16, 0.34]} position={[0, 0.17, 0]} material={m.white} bevelM={0.03} />
        <mesh position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.solar}>
          <planeGeometry args={[0.44, 0.3]} />
        </mesh>
        {/* Mast with stereo camera head. */}
        <mesh position={[0.17, 0.36, 0.1]} material={m.aluminium}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
        </mesh>
        <BeveledBox size={[0.05, 0.05, 0.12]} position={[0.18, 0.47, 0.1]} material={m.graphite} bevelM={0.01} />
        {[-0.2, 0.2].flatMap((x) =>
          [-0.21, 0.21].map((z) => (
            <group key={`${x}${z}`} position={[x, 0.09, z]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh material={m.black} castShadow>
                <cylinderGeometry args={[0.085, 0.085, 0.07, 16]} />
              </mesh>
              <mesh material={m.aluminium}>
                <cylinderGeometry args={[0.04, 0.04, 0.075, 12]} />
              </mesh>
            </group>
          )),
        )}
      </group>
    </group>
  )
}

/** Tethered anchor winch: cable drum with flanges, drive motor and a tether paying out. */
export function Winch({ materials: m, dims }: ModuleProps) {
  const groundY = -(dims.baseY + dims.heightM * 0.3) + 0.02
  const tether = useMemo<Vec3[]>(() => [[0.3, -0.06, 0], [0.42, -0.4, 0.05], [0.55, groundY * 0.7, 0.12], [0.75, groundY, 0.2]], [groundY])
  return (
    <group>
      <MountBracket width={0.34} height={0.24} graphite={m.graphite} metal={m.aluminium} />
      <group position={[0.2, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.aluminium} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 20]} />
        </mesh>
        {[-0.12, 0.12].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={m.graphite} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 20]} />
          </mesh>
        ))}
      </group>
      <BeveledBox size={[0.12, 0.1, 0.1]} position={[0.14, 0.02, 0.2]} material={m.graphite} bevelM={0.015} />
      <CableRun points={tether} material={m.white} radiusM={0.006} />
    </group>
  )
}

/** Robotic manipulator arm folded on the deck: turret, shoulder, upper arm, elbow, forearm, gripper. */
export function RoboticArm({ materials: m }: ModuleProps) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.1, 20]} />
      </mesh>
      <group position={[0, 0.14, 0]} rotation={[0, 0, 0.5]}>
        <Hinge lengthM={0.16} radiusM={0.045} metal={m.aluminium} dark={m.graphite} />
        <BeveledBox size={[0.07, 0.46, 0.07]} position={[0, 0.23, 0]} material={m.white} bevelM={0.02} />
        <group position={[0, 0.46, 0]} rotation={[0, 0, -2.3]}>
          <Hinge lengthM={0.13} radiusM={0.04} metal={m.aluminium} dark={m.graphite} />
          <BeveledBox size={[0.06, 0.4, 0.06]} position={[0, 0.2, 0]} material={m.white} bevelM={0.018} />
          <group position={[0, 0.41, 0]}>
            <mesh material={m.aluminium}>
              <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
            </mesh>
            {[-0.025, 0.025].map((z) => (
              <BeveledBox key={z} size={[0.015, 0.08, 0.012]} position={[0, 0.06, z]} material={m.graphite} bevelM={0.004} />
            ))}
            <mesh position={[0.04, 0, 0]} material={m.accent}>
              <sphereGeometry args={[0.01, 8, 6]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
