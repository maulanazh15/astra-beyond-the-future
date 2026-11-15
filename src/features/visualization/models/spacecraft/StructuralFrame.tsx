import { useMemo } from 'react'
import type { Strut } from '../../utilities/struts'
import type { Vec3 } from '../../types/scene'
import { octagonCorners } from '../../utilities/hardwareLayout'
import { StrutInstances } from '../StrutInstances'
import { BoltRing } from './parts'
import type { ModuleProps } from './types'

/**
 * Structural connections (local origin on the ground): the lower thrust ring with gussets that
 * carries engine and tank loads into the bus corners. Without landing gear, a ground support
 * stand holds the spacecraft for display.
 */
export function StructuralFrame({ variant, materials: m, dims }: ModuleProps) {
  const { radiusM: r, baseY } = dims
  const ringY = baseY - 0.07
  const { ring, gussets, stand } = useMemo(() => {
    const corners = octagonCorners(r * 0.9).map(([x, z]): Vec3 => [x, ringY, z])
    const ringList: Strut[] = corners.map((c, i) => ({ from: c, to: corners[(i + 1) % 8], radiusM: 0.028 }))
    const gussetList: Strut[] = octagonCorners(r * 0.99).map(([x, z], i) => ({ from: [x, baseY + 0.01, z], to: corners[(i + 1) % 8], radiusM: 0.018 }))
    const standList: Strut[] = variant.includes('stand')
      ? [0, 1, 2, 3].map((i) => {
          const a = Math.PI / 4 + (i * Math.PI) / 2
          return { from: [Math.cos(a) * r * 0.8, 0.05, Math.sin(a) * r * 0.8], to: [Math.cos(a) * r * 0.85, ringY, Math.sin(a) * r * 0.85], radiusM: 0.05 }
        })
      : []
    return { ring: ringList, gussets: gussetList, stand: standList }
  }, [r, baseY, ringY, variant])

  return (
    <group>
      <StrutInstances struts={ring} material={m.graphite} />
      <StrutInstances struts={gussets} material={m.aluminium} />
      {stand.length > 0 && (
        <>
          <StrutInstances struts={stand} material={m.graphite} />
          <mesh position={[0, 0.025, 0]} material={m.graphite} receiveShadow castShadow>
            <cylinderGeometry args={[r * 1.0, r * 1.05, 0.05, 32]} />
          </mesh>
          <BoltRing radiusM={r * 0.95} y={0.052} count={16} material={m.aluminium} />
        </>
      )}
    </group>
  )
}
