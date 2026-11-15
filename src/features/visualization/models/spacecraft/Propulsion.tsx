import { useLayoutEffect, useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import type { Vec3 } from '../../types/scene'
import { ringPoints } from '../../utilities/hardwareLayout'
import type { Strut } from '../../utilities/struts'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, BoltRing, CableRun } from './parts'
import type { ModuleProps } from './types'

/** Bell nozzle profile (Rao-style curve approximated with a power law), throat at y = 0. */
function bellGeometry(throatM: number, exitM: number, lengthM: number) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15
    return new Vector2(throatM + (exitM - throatM) * t ** 0.62, -t * lengthM)
  })
  return new LatheGeometry(points, 32)
}

const ENGINE_SPECS = {
  biprop: { throat: 0.09, exit: 0.3, length: 0.52, chamber: 0.12 },
  throttle: { throat: 0.1, exit: 0.36, length: 0.6, chamber: 0.14 },
} as const

/**
 * Main engine. Local origin at the bus floor; hardware hangs below (−Y).
 * Chemical engines: thrust plate, gimbal ring and actuators, chamber, bell nozzle.
 * Electric: gridded ion thruster with a faint cyan discharge glow.
 */
export function MainEngine({ variant, materials: m }: ModuleProps) {
  const spec = variant === 'throttle' ? ENGINE_SPECS.throttle : ENGINE_SPECS.biprop
  const bell = useMemo(() => bellGeometry(spec.throat, spec.exit, spec.length), [spec])
  useLayoutEffect(() => () => bell.dispose(), [bell])
  const actuators = useMemo<Strut[]>(
    () => [
      { from: [0.24, -0.04, 0], to: [spec.chamber + 0.02, -0.26, 0], radiusM: 0.018 },
      { from: [0, -0.04, 0.24], to: [0, -0.26, spec.chamber + 0.02], radiusM: 0.018 },
    ],
    [spec],
  )
  const feedLine = useMemo<Vec3[]>(() => [[-0.28, -0.04, 0.1], [-0.3, -0.2, 0.05], [-spec.chamber - 0.02, -0.22, 0]], [spec])

  if (variant === 'electric') {
    return (
      <group>
        <BeveledBox size={[0.5, 0.06, 0.5]} position={[0, -0.03, 0]} material={m.graphite} bevelM={0.015} />
        <mesh position={[0, -0.17, 0]} material={m.graphite} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.22, 24]} />
        </mesh>
        <BoltRing radiusM={0.21} y={-0.07} count={12} material={m.aluminium} boltRadiusM={0.012} />
        {/* Ion optics: aluminium grid ring and the cyan discharge glow behind it. */}
        <mesh position={[0, -0.285, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
          <torusGeometry args={[0.18, 0.02, 8, 32]} />
        </mesh>
        <mesh position={[0, -0.29, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
          <circleGeometry args={[0.17, 32]} />
        </mesh>
        {/* Neutralizer cathode. */}
        <mesh position={[0.24, -0.25, 0]} rotation={[0, 0, Math.PI / 6]} material={m.aluminium}>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 8]} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* Thrust plate bolted to the bus floor. */}
      <mesh position={[0, -0.03, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 24]} />
      </mesh>
      <BoltRing radiusM={0.26} y={-0.065} count={12} material={m.aluminium} boltRadiusM={0.014} />
      {/* Gimbal ring and actuators. */}
      <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium} castShadow>
        <torusGeometry args={[spec.chamber + 0.05, 0.022, 8, 32]} />
      </mesh>
      <StrutInstances struts={actuators} material={m.aluminium} />
      {/* Injector head and combustion chamber. */}
      <mesh position={[0, -0.1, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[spec.chamber * 0.8, spec.chamber, 0.08, 20]} />
      </mesh>
      <mesh position={[0, -0.2, 0]} material={m.aluminium} castShadow>
        <cylinderGeometry args={[spec.chamber, spec.throat, 0.13, 20]} />
      </mesh>
      {/* Cooling jacket band at the throat. */}
      <mesh position={[0, -0.27, 0]} material={m.warm}>
        <cylinderGeometry args={[spec.throat + 0.018, spec.throat + 0.018, 0.04, 20]} />
      </mesh>
      <mesh geometry={bell} position={[0, -0.27, 0]} material={m.nozzle} castShadow />
      <mesh position={[0, -0.27 - spec.length, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
        <torusGeometry args={[spec.exit, 0.012, 6, 40]} />
      </mesh>
      {variant === 'throttle' && (
        <>
          {/* Throttle valve body and turbopump with its feed line. */}
          <BeveledBox size={[0.14, 0.12, 0.14]} position={[-0.3, -0.1, 0.1]} material={m.graphite} bevelM={0.02} />
          <CableRun points={feedLine} radiusM={0.016} material={m.aluminium} />
        </>
      )}
    </group>
  )
}

/** A capsule-shaped tank (cylinder with hemispherical ends), axis vertical. */
function CapsuleTank({ position, radiusM, lengthM, materials: m }: { position: Vec3; radiusM: number; lengthM: number; materials: ModuleProps['materials'] }) {
  return (
    <group position={position}>
      <mesh material={m.mli} castShadow>
        <capsuleGeometry args={[radiusM, lengthM, 6, 16]} />
      </mesh>
      {[-lengthM / 3, lengthM / 3].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
          <torusGeometry args={[radiusM + 0.008, 0.012, 6, 24]} />
        </mesh>
      ))}
    </group>
  )
}

/** Spherical tank with an equatorial weld/mount ring. */
function SphereTank({ position, radiusM, material, ring }: { position: Vec3; radiusM: number; material: ModuleProps['materials']['aluminium']; ring: ModuleProps['materials']['aluminium'] }) {
  return (
    <group position={position}>
      <mesh material={material} castShadow>
        <sphereGeometry args={[radiusM, 24, 16]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={ring}>
        <torusGeometry args={[radiusM + 0.01, 0.02, 6, 32]} />
      </mesh>
    </group>
  )
}

/**
 * Propulsion module: the propellant tank set below the bus floor, strut-mounted to it.
 * biprop = fuel + oxidizer spheres and a pressurant bottle; throttle = four insulated capsules;
 * electric = composite xenon tank and power processing unit.
 */
export function PropulsionTanks({ variant, materials: m, dims, twin }: ModuleProps & { twin: boolean }) {
  const spread = (twin ? 0.42 : 0.55) * (dims.radiusM / 1.0)
  const size = twin ? 0.8 : 1
  const tanks = useMemo<{ kind: 'sphere' | 'capsule' | 'copv'; position: Vec3; radiusM: number }[]>(() => {
    if (variant === 'throttle') return ringPoints(spread, -0.42, 4, Math.PI / 4).map((position) => ({ kind: 'capsule', position, radiusM: 0.15 * size }))
    if (variant === 'electric') return [{ kind: 'copv', position: [spread, -0.36, 0], radiusM: 0.27 * size }]
    return [
      { kind: 'sphere', position: [0, -0.4, spread], radiusM: 0.29 * size },
      { kind: 'sphere', position: [0, -0.4, -spread], radiusM: 0.29 * size },
      { kind: 'copv', position: [-spread, -0.3, 0], radiusM: 0.13 * size },
    ]
  }, [variant, spread, size])
  // Each tank hangs from the floor on two struts.
  const mounts = useMemo<Strut[]>(
    () =>
      tanks.flatMap(({ position: [x, y, z], radiusM }) => [
        { from: [x * 0.8 + 0.08, 0, z * 0.8], to: [x, y + radiusM * 0.6, z], radiusM: 0.014 },
        { from: [x * 0.8 - 0.08, 0, z * 0.8], to: [x, y + radiusM * 0.6, z], radiusM: 0.014 },
      ]),
    [tanks],
  )

  return (
    <group>
      <StrutInstances struts={mounts} material={m.aluminium} />
      {tanks.map((t) =>
        t.kind === 'capsule' ? (
          <CapsuleTank key={t.position.join()} position={t.position} radiusM={t.radiusM} lengthM={0.32 * size} materials={m} />
        ) : (
          <SphereTank key={t.position.join()} position={t.position} radiusM={t.radiusM} material={t.kind === 'copv' ? m.graphite : m.aluminium} ring={m.aluminium} />
        ),
      )}
      {variant === 'electric' && (
        // Power processing unit with radiator fins.
        <group position={[-spread, -0.3, 0]}>
          <BeveledBox size={[0.34, 0.2, 0.28]} material={m.graphite} bevelM={0.02} />
          {[-0.09, -0.03, 0.03, 0.09].map((z) => (
            <BeveledBox key={z} size={[0.3, 0.012, 0.03]} position={[0, 0.11, z]} material={m.aluminium} bevelM={0.004} />
          ))}
        </group>
      )}
    </group>
  )
}
