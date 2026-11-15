import { useLayoutEffect, useRef } from 'react'
import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import type { Group, InstancedMesh } from 'three'
import { useDisposable } from '../../hooks/useDisposable'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { ROVER } from '../../utilities/roverLayout'

const GROUSERS = 18
const R = ROVER.wheelRadiusM
const W = ROVER.wheelWidthM

/** Chevron-free straight grousers around the tread, one draw call per wheel. */
function Grousers({ materials }: { materials: SpacecraftMaterials }) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useDisposable(() => new BoxGeometry(1, 1, 1), [])
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const q = new Quaternion()
    const axis = new Vector3(0, 0, 1)
    for (let i = 0; i < GROUSERS; i += 1) {
      const a = (i / GROUSERS) * Math.PI * 2
      q.setFromAxisAngle(axis, a)
      target.setMatrixAt(i, new Matrix4().compose(new Vector3(Math.cos(a) * R, Math.sin(a) * R, 0), q, new Vector3(0.022, 0.012, W)))
    }
    target.instanceMatrix.needsUpdate = true
    target.computeBoundingSphere()
  }, [])
  return <instancedMesh ref={mesh} args={[geometry, materials.graphite, GROUSERS]} castShadow />
}

/**
 * Rover wheel, axle along local Z, outer face toward +Z: grousered aluminium tread, six spokes,
 * hub cap, and the in-hub drive motor. `spin` receives the rolling group for frame updates.
 */
export function RoverWheel({ materials, side, spin }: { materials: SpacecraftMaterials; side: 1 | -1; spin: (g: Group | null) => void }) {
  return (
    <group>
      {/* In-hub drive motor housing on the inboard side (does not roll). */}
      <mesh position={[0, 0, -side * (W / 2 + 0.03)]} rotation={[Math.PI / 2, 0, 0]} material={materials.graphite} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
      </mesh>
      <group ref={spin}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.aluminium} castShadow receiveShadow>
          <cylinderGeometry args={[R - 0.008, R - 0.008, W, 28, 1, true]} />
        </mesh>
        <Grousers materials={materials} />
        {/* Spokes and hub on the outer face. */}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[0, 0, side * (W / 2 - 0.02)]} rotation={[0, 0, (i * Math.PI) / 3]} material={materials.aluminium}>
            <boxGeometry args={[R * 1.85, 0.016, 0.01]} />
          </mesh>
        ))}
        <mesh position={[0, 0, side * (W / 2 - 0.02)]} rotation={[Math.PI / 2, 0, 0]} material={materials.graphite}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.black}>
          <cylinderGeometry args={[R * 0.55, R * 0.55, W * 0.6, 16]} />
        </mesh>
      </group>
    </group>
  )
}
