import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import { ACCENT_CYAN } from '../../materials/spacecraftMaterials'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { useDisposable } from '../../hooks/useDisposable'
import { ringPoints } from '../../utilities/hardwareLayout'
import { feedHorn, octagonPrism } from '../geometry'
import { BeveledBox, Fasteners } from '../spacecraft/parts'

/**
 * Receiver hung at the reflector's focal point (origin at the cabin's center): an insulated
 * octagonal cabin with radiator fins on top, three bridle lugs, a downward feed-horn cluster, and
 * crossed low-frequency dipole feeds. The feed ring glows while the receiver is observing.
 */
export function ReceiverCabin({ materials, active, animate }: { materials: SpacecraftMaterials; active: boolean; animate: boolean }) {
  const cabin = useDisposable(() => octagonPrism(0.72, 1.0, 0.04), [])
  const horn = useDisposable(() => feedHorn(0.06, 0.17, 0.42), [])
  const glow = useDisposable(() => new MeshStandardMaterial({ color: new Color('#0b1528'), emissive: new Color(ACCENT_CYAN), emissiveIntensity: 0.2 }), [])
  // Gold-plated horns, open-ended, so both sides render.
  const hornMaterial = useDisposable(() => new MeshStandardMaterial({ color: new Color('#c9a35a'), metalness: 0.8, roughness: 0.3, side: DoubleSide }), [])
  const horns = useMemo(() => [[0, 0] as const, ...ringPoints(0.4, 0, 6).map(([x, , z]) => [x, z] as const)], [])
  const lugs = useMemo(() => ringPoints(0.5, 0.62, 3, Math.PI / 2), [])

  const glowMesh = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!glowMesh.current) return
    ;(glowMesh.current.material as MeshStandardMaterial).emissiveIntensity = active ? (animate ? 2 + 0.8 * Math.sin(clock.elapsedTime * 2.2) : 2.4) : 0.15
  })

  return (
    <group>
      <mesh geometry={cabin} position={[0, -0.5, 0]} material={materials.mli} castShadow />
      <BeveledBox size={[1.1, 0.06, 1.1]} position={[0, 0.53, 0]} material={materials.white} bevelM={0.02} />
      {[-0.36, -0.18, 0, 0.18, 0.36].map((x) => (
        <BeveledBox key={x} size={[0.03, 0.18, 0.9]} position={[x, 0.65, 0]} material={materials.radiator} bevelM={0.008} />
      ))}
      {lugs.map((p) => (
        <mesh key={p.join()} position={p} material={materials.aluminium} castShadow>
          <torusGeometry args={[0.07, 0.022, 8, 14]} />
        </mesh>
      ))}
      <Fasteners points={ringPoints(0.62, 0.565, 16)} material={materials.aluminium} />
      {/* Feed ring (status glow) and the downward-looking feed cluster. */}
      <mesh ref={glowMesh} position={[0, -0.52, 0]} material={glow}>
        <cylinderGeometry args={[0.7, 0.7, 0.05, 8]} />
      </mesh>
      <mesh position={[0, -0.6, 0]} material={materials.graphite}>
        <cylinderGeometry args={[0.62, 0.66, 0.08, 24]} />
      </mesh>
      {horns.map(([x, z]) => (
        <mesh key={`${x}${z}`} geometry={horn} position={[x, -0.64, z]} material={hornMaterial} castShadow />
      ))}
      {/* Crossed dipole feeds for the lowest frequencies. */}
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[0, -1.15, 0]} rotation={[0, a, Math.PI / 2]} material={materials.aluminium}>
          <cylinderGeometry args={[0.018, 0.018, 1.8, 8]} />
        </mesh>
      ))}
      <mesh position={[0, -1.0, 0]} material={materials.graphite}>
        <cylinderGeometry args={[0.03, 0.03, 0.34, 8]} />
      </mesh>
    </group>
  )
}
