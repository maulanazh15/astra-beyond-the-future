import { useMemo } from 'react'
import type { Vec3 } from '../../types/scene'
import type { Strut } from '../../utilities/struts'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, CableRun, Hinge, MountBracket } from './parts'
import type { ModuleProps } from './types'

/** Side modules: local origin on the bus face at mount height, +X pointing away from the bus. */

const WINGS = {
  standard: { panels: 2, lengthM: 0.95, widthM: 0.85 },
  'high-efficiency': { panels: 3, lengthM: 1.0, widthM: 0.95 },
} as const

/** Deployable solar array wing: yoke boom, hinged panels with frames and cell faces, harness. */
export function SolarWing({ variant, materials: m }: ModuleProps) {
  const spec = variant === 'high-efficiency' ? WINGS['high-efficiency'] : WINGS.standard
  const cells = variant === 'high-efficiency' ? m.solarHi : m.solar
  const yokeEnd = 0.55
  const harness = useMemo<Vec3[]>(() => [[0.07, -0.05, 0.06], [0.3, 0.02, 0.07], [yokeEnd, 0.04, 0.06]], [])
  return (
    <group>
      <MountBracket width={0.22} height={0.22} graphite={m.graphite} metal={m.aluminium} />
      {/* Yoke: twin tubes from the root hinge to the first panel. */}
      <Hinge lengthM={0.2} position={[0.1, 0, 0]} metal={m.aluminium} dark={m.graphite} />
      {[-0.07, 0.07].map((z) => (
        <mesh key={z} position={[(0.1 + yokeEnd) / 2, 0.03, z]} rotation={[0, 0, Math.PI / 2 - 0.06]} material={m.aluminium} castShadow>
          <cylinderGeometry args={[0.018, 0.018, yokeEnd - 0.1, 8]} />
        </mesh>
      ))}
      <CableRun points={harness} material={m.black} radiusM={0.01} />
      {/* Panels tilted ~12° toward a low sun. */}
      <group position={[yokeEnd, 0.05, 0]} rotation={[0.2, 0, 0]}>
        {Array.from({ length: spec.panels }, (_, i) => {
          const x = i * (spec.lengthM + 0.04) + spec.lengthM / 2
          return (
            <group key={i}>
              <BeveledBox size={[spec.lengthM, 0.035, spec.widthM]} position={[x, 0, 0]} material={m.aluminium} bevelM={0.012} />
              <mesh position={[x, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} material={cells} receiveShadow>
                <planeGeometry args={[spec.lengthM - 0.06, spec.widthM - 0.06]} />
              </mesh>
              <mesh position={[x, -0.019, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.white}>
                <planeGeometry args={[spec.lengthM - 0.04, spec.widthM - 0.04]} />
              </mesh>
              <Hinge lengthM={spec.widthM * 0.5} radiusM={0.018} position={[i * (spec.lengthM + 0.04) - 0.02, 0, 0]} metal={m.aluminium} dark={m.graphite} />
            </group>
          )
        })}
      </group>
    </group>
  )
}

/** Radioisotope power system: finned generator on standoff struts, with a heat-source band. */
export function RpsGenerator({ materials: m }: ModuleProps) {
  const standoffs = useMemo<Strut[]>(
    () => [
      { from: [0.06, 0.08, 0.08], to: [0.3, 0.12, 0.05], radiusM: 0.018 },
      { from: [0.06, 0.08, -0.08], to: [0.3, 0.12, -0.05], radiusM: 0.018 },
      { from: [0.06, -0.08, 0.08], to: [0.3, -0.12, 0.05], radiusM: 0.018 },
      { from: [0.06, -0.08, -0.08], to: [0.3, -0.12, -0.05], radiusM: 0.018 },
    ],
    [],
  )
  return (
    <group>
      <MountBracket width={0.24} height={0.24} graphite={m.graphite} metal={m.aluminium} />
      <StrutInstances struts={standoffs} material={m.aluminium} />
      <group position={[0.46, 0.02, 0]}>
        <mesh material={m.graphite} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.62, 16]} />
        </mesh>
        {/* Eight radiator fins. */}
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
            <BeveledBox size={[0.16, 0.56, 0.018]} position={[0.2, 0, 0]} material={m.graphite} bevelM={0.006} />
          </group>
        ))}
        {[0.33, -0.33].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={m.aluminium} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0]} material={m.warm}>
          <cylinderGeometry args={[0.135, 0.135, 0.05, 16]} />
        </mesh>
      </group>
    </group>
  )
}

/** Li-ion battery pack: ribbed graphite housing with connector, harness and a status light. */
export function BatteryPack({ variant, materials: m }: ModuleProps) {
  const size: Vec3 = variant === 'high-capacity' ? [0.24, 0.32, 0.5] : [0.2, 0.26, 0.38]
  const [d, h, w] = size
  const harness = useMemo<Vec3[]>(() => [[0.08, h / 2 - 0.02, w / 2 - 0.04], [0.05, h / 2 + 0.05, w / 2 - 0.02], [0.01, h / 2 + 0.08, w / 2 - 0.1]], [h, w])
  return (
    <group>
      <MountBracket width={w * 0.8} height={h * 0.8} graphite={m.graphite} metal={m.aluminium} />
      <BeveledBox size={size} position={[0.06 + d / 2, 0, 0]} material={m.graphite} bevelM={0.025} />
      {/* Cell-row ribs on the outer face. */}
      {Array.from({ length: 4 }, (_, i) => (
        <BeveledBox key={i} size={[0.015, h * 0.8, 0.018]} position={[0.06 + d + 0.006, 0, -w * 0.3 + (i * w * 0.6) / 3]} material={m.aluminium} bevelM={0.005} />
      ))}
      <CableRun points={harness} material={m.black} radiusM={0.012} />
      <mesh position={[0.06 + d + 0.01, h / 2 - 0.05, w / 2 - 0.05]} material={m.accent}>
        <sphereGeometry args={[0.012, 8, 6]} />
      </mesh>
    </group>
  )
}

/** Regenerative fuel cell: stack housing with hydrogen and oxygen tanks and plumbing. */
export function FuelCell({ materials: m }: ModuleProps) {
  const plumbing = useMemo<Vec3[]>(() => [[0.3, 0.05, 0.2], [0.42, 0.18, 0.08], [0.3, 0.1, -0.2]], [])
  return (
    <group>
      <MountBracket width={0.5} height={0.26} graphite={m.graphite} metal={m.aluminium} />
      <BeveledBox size={[0.18, 0.2, 0.16]} position={[0.16, 0, 0]} material={m.graphite} bevelM={0.02} />
      <mesh position={[0.3, 0, 0.21]} material={m.aluminium} castShadow>
        <sphereGeometry args={[0.16, 20, 14]} />
      </mesh>
      <mesh position={[0.28, 0, -0.2]} material={m.white} castShadow>
        <sphereGeometry args={[0.12, 20, 14]} />
      </mesh>
      <CableRun points={plumbing} material={m.aluminium} radiusM={0.012} />
    </group>
  )
}
