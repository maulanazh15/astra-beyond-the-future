import { useLayoutEffect, useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import type { Strut } from '../../utilities/struts'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, BoltRing } from './parts'
import type { ModuleProps } from './types'

/** Low-frequency dipole array: central electronics hub with four deployable booms and wire canisters. */
export function DipoleArray({ materials: m }: ModuleProps) {
  const booms = useMemo<Strut[]>(
    () =>
      [0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2
        return { from: [Math.cos(a) * 0.14, 0.2, Math.sin(a) * 0.14], to: [Math.cos(a) * 1.7, 0.32, Math.sin(a) * 1.7], radiusM: 0.012 }
      }),
    [],
  )
  return (
    <group>
      <BeveledBox size={[0.3, 0.18, 0.3]} position={[0, 0.09, 0]} material={m.white} bevelM={0.025} />
      <BoltRing radiusM={0.17} y={0.005} count={8} material={m.aluminium} boltRadiusM={0.01} />
      <StrutInstances struts={booms} material={m.aluminium} />
      {/* Stowed wire canisters at each boom root, tip masses at the ends. */}
      {booms.map(({ from, to }) => (
        <group key={to.join()}>
          <mesh position={[from[0] * 1.6, 0.2, from[2] * 1.6]} rotation={[0, 0, Math.PI / 2]} material={m.graphite} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
          </mesh>
          <mesh position={to} material={m.accent}>
            <sphereGeometry args={[0.022, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const MESH_R = 0.85
const MESH_DEPTH = 0.22

/** Wire-mesh reflector demonstrator: ribbed umbrella dish on a mast, feed at the focus. */
export function MeshReflector({ materials: m }: ModuleProps) {
  const surface = useMemo(
    () =>
      new LatheGeometry(
        Array.from({ length: 13 }, (_, i) => {
          const r = 0.06 + (i / 12) * (MESH_R - 0.06)
          return new Vector2(r, MESH_DEPTH * (r / MESH_R) ** 2)
        }),
        48,
      ),
    [],
  )
  useLayoutEffect(() => () => surface.dispose(), [surface])
  const focus = (MESH_R * MESH_R) / (4 * MESH_DEPTH)
  const ribs = useMemo<Strut[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6
        return { from: [Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06], to: [Math.cos(a) * MESH_R, MESH_DEPTH, Math.sin(a) * MESH_R], radiusM: 0.009 }
      }),
    [],
  )
  const feedStruts = useMemo<Strut[]>(
    () =>
      [0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3 + 0.3
        return { from: [Math.cos(a) * MESH_R * 0.5, MESH_DEPTH * 0.25, Math.sin(a) * MESH_R * 0.5], to: [0, focus - 0.04, 0], radiusM: 0.006 }
      }),
    [focus],
  )
  return (
    <group>
      <mesh position={[0, 0.03, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.06, 20]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={m.aluminium} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.5, 10]} />
      </mesh>
      <group position={[0, 0.55, 0]}>
        <mesh material={m.graphite}>
          <cylinderGeometry args={[0.07, 0.05, 0.06, 16]} />
        </mesh>
        <mesh geometry={surface} material={m.wireMesh} castShadow />
        <StrutInstances struts={ribs} material={m.aluminium} />
        <mesh position={[0, MESH_DEPTH, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
          <torusGeometry args={[MESH_R, 0.01, 6, 64]} />
        </mesh>
        <StrutInstances struts={feedStruts} material={m.aluminium} />
        <mesh position={[0, focus, 0]} material={m.mli}>
          <cylinderGeometry args={[0.05, 0.03, 0.08, 12]} />
        </mesh>
      </group>
    </group>
  )
}

/** Low-frequency receiver suite: finned electronics box with a sense horn and status lights. */
export function ReceiverSuite({ materials: m }: ModuleProps) {
  return (
    <group>
      <BeveledBox size={[0.34, 0.2, 0.26]} position={[0, 0.1, 0]} material={m.white} bevelM={0.025} />
      {Array.from({ length: 6 }, (_, i) => (
        <BeveledBox key={i} size={[0.3, 0.05, 0.01]} position={[0, 0.225, -0.1 + i * 0.04]} material={m.aluminium} bevelM={0.003} />
      ))}
      <mesh position={[0.2, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.aluminium} castShadow>
        <cylinderGeometry args={[0.06, 0.025, 0.1, 4, 1, true]} />
      </mesh>
      {[-0.06, -0.03].map((z) => (
        <mesh key={z} position={[0.172, 0.06, z]} material={m.accent}>
          <sphereGeometry args={[0.01, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
}
