import { useMemo } from 'react'
import type { Vec3 } from '../../types/scene'
import { BeveledBox, CableRun, Fasteners, Hinge, MountBracket } from './parts'
import type { ModuleProps } from './types'

/** Deployable radiator: hinged vertical fin with a serpentine fluid loop. */
export function RadiatorPanel({ materials: m }: ModuleProps) {
  const loop = useMemo<Vec3[]>(() => {
    const points: Vec3[] = [[0.08, -0.25, 0.022]]
    for (let i = 0; i < 5; i += 1) {
      const x = 0.15 + i * 0.16
      points.push([x, i % 2 === 0 ? -0.25 : 0.25, 0.022], [x + 0.08, i % 2 === 0 ? 0.25 : -0.25, 0.022])
    }
    return points
  }, [])
  return (
    <group>
      <MountBracket width={0.16} height={0.5} graphite={m.graphite} metal={m.aluminium} />
      <Hinge lengthM={0.5} position={[0.09, 0, 0]} rotation={[Math.PI / 2, 0, 0]} metal={m.aluminium} dark={m.graphite} />
      <BeveledBox size={[0.9, 0.62, 0.03]} position={[0.56, 0, 0]} material={m.radiator} bevelM={0.01} />
      <CableRun points={loop} material={m.aluminium} radiusM={0.008} />
    </group>
  )
}

/** Active heater system: controller box and heater patches bonded to the bus wall. */
export function HeaterSystem({ materials: m }: ModuleProps) {
  const bolts = useMemo<Vec3[]>(() => [[0.21, 0.07, 0.1], [0.21, 0.07, -0.1], [0.21, -0.07, 0.1], [0.21, -0.07, -0.1]], [])
  return (
    <group>
      <MountBracket width={0.3} height={0.2} graphite={m.graphite} metal={m.aluminium} />
      <BeveledBox size={[0.14, 0.18, 0.26]} position={[0.13, 0, 0]} material={m.white} bevelM={0.02} />
      <Fasteners points={bolts} normal={[1, 0, 0]} material={m.aluminium} />
      {/* Kapton heater patches either side of the controller. */}
      {[-0.32, 0.32].map((z) => (
        <mesh key={z} position={[0.006, 0.02, z]} rotation={[0, Math.PI / 2, 0]} material={m.warm}>
          <planeGeometry args={[0.22, 0.16]} />
        </mesh>
      ))}
      <mesh position={[0.205, 0.05, 0]} material={m.accent}>
        <sphereGeometry args={[0.012, 8, 6]} />
      </mesh>
    </group>
  )
}

/** Radioisotope heater units: three shielded canisters on a plate with a thermal strap. */
export function RhuCluster({ materials: m }: ModuleProps) {
  const strap = useMemo<Vec3[]>(() => [[0.12, -0.1, 0], [0.06, -0.14, 0.05], [0.01, -0.12, 0.12]], [])
  return (
    <group>
      <MountBracket width={0.3} height={0.2} graphite={m.graphite} metal={m.aluminium} />
      {[-0.08, 0, 0.08].map((z) => (
        <group key={z} position={[0.12, 0, z]}>
          <mesh material={m.warm} castShadow>
            <cylinderGeometry args={[0.032, 0.032, 0.14, 12]} />
          </mesh>
          {[0.075, -0.075].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={m.aluminium}>
              <cylinderGeometry args={[0.036, 0.036, 0.015, 12]} />
            </mesh>
          ))}
        </group>
      ))}
      <CableRun points={strap} material={m.mli} radiusM={0.014} />
    </group>
  )
}
