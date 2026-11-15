/**
 * Reusable mechanical detail for procedural hardware: beveled housings, fasteners, hinges,
 * brackets and cable runs. Geometries are memoized per size and disposed on unmount.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, CylinderGeometry, Matrix4, Quaternion, TubeGeometry, Vector3 } from 'three'
import type { InstancedMesh, Material } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Vec3 } from '../../types/scene'
import { cornerBolts, ringPoints } from '../../utilities/hardwareLayout'

type Placement = { position?: Vec3; rotation?: Vec3 }

/** Box with rounded (beveled) edges, so housings catch highlights instead of looking like cubes. */
export function BeveledBox({ size, bevelM = 0.02, material, position, rotation }: Placement & { size: Vec3; bevelM?: number; material: Material }) {
  const [w, h, d] = size
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 2, Math.min(bevelM, w / 2, h / 2, d / 2)), [w, h, d, bevelM])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} castShadow receiveShadow />
}

const UP = new Vector3(0, 1, 0)

/** Bolt heads at given points, each pointing along `normal`. One draw call. */
export function Fasteners({ points, normal = [0, 1, 0], radiusM = 0.018, material }: { points: Vec3[]; normal?: Vec3; radiusM?: number; material: Material }) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new CylinderGeometry(1, 1, 1, 6), [])
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const q = new Quaternion().setFromUnitVectors(UP, new Vector3(...normal).normalize())
    const scale = new Vector3(radiusM, radiusM * 0.7, radiusM)
    points.forEach((p, i) => target.setMatrixAt(i, new Matrix4().compose(new Vector3(...p), q, scale)))
    target.instanceMatrix.needsUpdate = true
    target.computeBoundingSphere()
  }, [points, normal, radiusM])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return <instancedMesh ref={mesh} args={[geometry, material, points.length]} />
}

/** Evenly spaced bolt heads on a horizontal circle (flanges, interface rings). */
export function BoltRing({ radiusM, y, count, material, boltRadiusM = 0.018 }: { radiusM: number; y: number; count: number; material: Material; boltRadiusM?: number }) {
  const points = useMemo(() => ringPoints(radiusM, y, count), [radiusM, y, count])
  return <Fasteners points={points} radiusM={boltRadiusM} material={material} />
}

/** Hinge along local Z: alternating knuckles on a pin. */
export function Hinge({ lengthM, radiusM = 0.03, metal, dark, position, rotation }: Placement & { lengthM: number; radiusM?: number; metal: Material; dark: Material }) {
  const knuckles = 3
  const segment = lengthM / knuckles
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={dark}>
        <cylinderGeometry args={[radiusM * 0.45, radiusM * 0.45, lengthM * 1.1, 8]} />
      </mesh>
      {Array.from({ length: knuckles }, (_, i) => (
        <mesh key={i} position={[0, 0, -lengthM / 2 + segment * (i + 0.5)]} rotation={[Math.PI / 2, 0, 0]} material={metal} castShadow>
          <cylinderGeometry args={[radiusM, radiusM, segment * 0.86, 12]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Structural interface where a module meets a bus side face: a beveled graphite mounting plate
 * with four fasteners. The bus face is at local x = 0; the module extends along +X.
 */
export function MountBracket({ width, height, graphite, metal }: { width: number; height: number; graphite: Material; metal: Material }) {
  const bolts = useMemo(() => cornerBolts(width, height, 0.045), [width, height])
  return (
    <group>
      <BeveledBox size={[0.06, height, width]} position={[0.03, 0, 0]} material={graphite} bevelM={0.012} />
      <Fasteners points={bolts} normal={[1, 0, 0]} material={metal} />
    </group>
  )
}

/** A cable or fluid line along a smooth curve through the points. Pass a stable (memoized) array. */
export function CableRun({ points, radiusM = 0.012, material }: { points: Vec3[]; radiusM?: number; material: Material }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)))
    return new TubeGeometry(curve, Math.max(8, points.length * 8), radiusM, 6, false)
  }, [points, radiusM])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow />
}
