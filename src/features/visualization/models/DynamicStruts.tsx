import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh, Material } from 'three'
import type { Strut } from '../utilities/struts'

const UP = new Vector3(0, 1, 0)
const matrix = new Matrix4()
const quaternion = new Quaternion()
const from = new Vector3()
const to = new Vector3()
const mid = new Vector3()
const scale = new Vector3()

/**
 * Struts or cables whose ends move (deploying legs, paying-out cables). One draw call. `source`
 * runs every frame and returns new struts, or null when nothing changed since the last frame.
 */
export function DynamicStruts({ count, source, material, castShadow = true, radialSegments = 8 }: {
  count: number
  source: () => Strut[] | null
  material: Material
  castShadow?: boolean
  radialSegments?: number
}) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new CylinderGeometry(1, 1, 1, radialSegments, 1), [radialSegments])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const target = mesh.current
    const struts = source()
    if (!target || !struts) return
    for (let i = 0; i < count; i += 1) {
      const strut = struts[i]
      from.set(...(strut?.from ?? [0, 0, 0]))
      to.set(...(strut?.to ?? [0, 0, 0]))
      const length = from.distanceTo(to)
      // Unused or zero-length slots collapse to nothing.
      if (!strut || length < 1e-4) {
        matrix.makeScale(0, 0, 0)
      } else {
        quaternion.setFromUnitVectors(UP, mid.subVectors(to, from).normalize())
        matrix.compose(mid.addVectors(from, to).multiplyScalar(0.5), quaternion, scale.set(strut.radiusM, length, strut.radiusM))
      }
      target.setMatrixAt(i, matrix)
    }
    target.instanceMatrix.needsUpdate = true
    target.computeBoundingSphere()
  })

  return <instancedMesh ref={mesh} args={[geometry, material, count]} castShadow={castShadow} receiveShadow frustumCulled={false} />
}
