import { useMemo } from 'react'
import type { Strut } from '../../utilities/struts'
import type { Vec3 } from '../../types/scene'
import { landingLegLayout } from '../../utilities/hardwareLayout'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, MountBracket } from './parts'
import type { ModuleProps } from './types'

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/**
 * Landing gear (local origin on the ground under the spacecraft). `legs`: telescoping
 * shock-absorber legs with footpads. `crush`: short stiff legs on crushable honeycomb pads.
 * `legs+crush`: shock-absorber legs fitted with crushable pads.
 */
export function LandingGear({ variant, materials: m, dims }: ModuleProps) {
  const legs = useMemo(() => landingLegLayout(dims.radiusM, dims.baseY, variant), [dims, variant])
  const telescoping = variant !== 'crush'
  const crushPads = variant.includes('crush')
  const { pistons, sleeves, braces } = useMemo(() => {
    const pistonList: Strut[] = []
    const sleeveList: Strut[] = []
    const braceList: Strut[] = []
    for (const leg of legs) {
      pistonList.push({ from: leg.hip, to: leg.foot, radiusM: telescoping ? 0.03 : 0.045 })
      if (telescoping) sleeveList.push({ from: leg.hip, to: lerp(leg.hip, leg.foot, 0.55), radiusM: 0.05 })
      for (const brace of leg.braces) braceList.push({ from: brace, to: leg.knee, radiusM: 0.022 })
    }
    return { pistons: pistonList, sleeves: sleeveList, braces: braceList }
  }, [legs, telescoping])

  return (
    <group>
      <StrutInstances struts={pistons} material={m.aluminium} />
      {sleeves.length > 0 && <StrutInstances struts={sleeves} material={m.graphite} />}
      <StrutInstances struts={braces} material={m.aluminium} />
      {legs.map((leg) => (
        <group key={leg.foot.join()}>
          {/* Hip clevis and knee joint. */}
          <BeveledBox size={[0.12, 0.1, 0.12]} position={leg.hip} material={m.graphite} bevelM={0.015} />
          <mesh position={leg.knee} material={m.aluminium}>
            <sphereGeometry args={[0.04, 12, 8]} />
          </mesh>
          {/* Ball joint and pad. */}
          <mesh position={leg.foot} material={m.aluminium}>
            <sphereGeometry args={[0.045, 12, 8]} />
          </mesh>
          {crushPads ? (
            <group position={[leg.foot[0], 0, leg.foot[2]]}>
              <mesh position={[0, 0.07, 0]} material={m.graphite} castShadow receiveShadow>
                <cylinderGeometry args={[0.24, 0.27, 0.14, 6]} />
              </mesh>
              <mesh position={[0, 0.15, 0]} material={m.mli} castShadow>
                <cylinderGeometry args={[0.2, 0.24, 0.03, 6]} />
              </mesh>
            </group>
          ) : (
            <mesh position={[leg.foot[0], 0.035, leg.foot[2]]} material={m.aluminium} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.25, 0.07, 20]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Hazard detection and avoidance: downward-looking lidar and stereo cameras in one pod. */
export function HazardSensor({ materials: m }: ModuleProps) {
  return (
    <group>
      <MountBracket width={0.22} height={0.18} graphite={m.graphite} metal={m.aluminium} />
      <group position={[0.16, 0, 0]} rotation={[0, 0, -0.55]}>
        <BeveledBox size={[0.18, 0.16, 0.3]} material={m.graphite} bevelM={0.025} />
        {/* Lidar window and two camera lenses facing the ground. */}
        <mesh position={[0.091, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.black}>
          <sphereGeometry args={[0.055, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {[-0.1, 0.1].map((z) => (
          <group key={z} position={[0.095, 0.03, z]} rotation={[0, 0, -Math.PI / 2]}>
            <mesh material={m.aluminium}>
              <cylinderGeometry args={[0.028, 0.028, 0.03, 16]} />
            </mesh>
            <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.accent}>
              <circleGeometry args={[0.016, 16]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
