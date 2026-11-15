import { useLayoutEffect, useMemo, useRef } from 'react'
import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh, Material } from 'three'
import type { Strut } from '../utilities/struts'
import { strutLength } from '../utilities/struts'

const UP = new Vector3(0, 1, 0)

/** Draws many struts in one draw call. */
export function StrutInstances({ struts, material }: { struts: Strut[]; material: Material }) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new CylinderGeometry(1, 1, 1, 8, 1), [])

  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const matrix = new Matrix4()
    const quaternion = new Quaternion()
    const from = new Vector3()
    const to = new Vector3()
    struts.forEach((strut, i) => {
      from.set(...strut.from)
      to.set(...strut.to)
      quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize())
      matrix.compose(from.clone().add(to).multiplyScalar(0.5), quaternion, new Vector3(strut.radiusM, strutLength(strut), strut.radiusM))
      target.setMatrixAt(i, matrix)
    })
    target.instanceMatrix.needsUpdate = true
    target.computeBoundingSphere()
  }, [struts])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  return <instancedMesh ref={mesh} args={[geometry, material, struts.length]} castShadow receiveShadow />
}
