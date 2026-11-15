import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import type { BufferGeometry, InstancedMesh } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRockMaterial } from '../materials/lunarMaterials'
import type { RockInstance } from '../types/scene'
import { ROCK_VARIANTS, rockRadius } from '../utilities/rockField'

/** A lumpy unit rock: icosphere with seeded radial displacement (~80 triangles). */
function createRockGeometry(variant: number): BufferGeometry {
  const geometry = mergeVertices(new IcosahedronGeometry(1, 1))
  const position = geometry.getAttribute('position')
  const v = new Vector3()
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i).normalize()
    v.multiplyScalar(rockRadius(v.x, v.y, v.z, variant))
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function RockVariant({ rocks, geometry, material }: { rocks: RockInstance[]; geometry: BufferGeometry; material: ReturnType<typeof createRockMaterial> }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const matrix = new Matrix4()
    const color = new Color()
    rocks.forEach((rock, i) => {
      matrix.compose(new Vector3(...rock.position), new Quaternion().setFromEuler(new Euler(...rock.rotation)), new Vector3(...rock.scale))
      target.setMatrixAt(i, matrix)
      target.setColorAt(i, color.setScalar(rock.shade))
    })
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
    target.computeBoundingSphere()
  }, [rocks])
  return <instancedMesh ref={mesh} args={[geometry, material, rocks.length]} castShadow receiveShadow />
}

/** All rocks and boulders in three instanced draw calls (one per rock shape). */
export function RockField({ rocks }: { rocks: RockInstance[] }) {
  const geometries = useMemo(() => Array.from({ length: ROCK_VARIANTS }, (_, i) => createRockGeometry(i)), [])
  const material = useMemo(() => createRockMaterial(), [])
  const byVariant = useMemo(() => geometries.map((_, i) => rocks.filter((r) => r.variant === i)), [geometries, rocks])

  useLayoutEffect(
    () => () => {
      geometries.forEach((g) => g.dispose())
      material.dispose()
    },
    [geometries, material],
  )

  return (
    <>
      {byVariant.map((group, i) =>
        group.length > 0 ? <RockVariant key={`${i}-${group.length}`} rocks={group} geometry={geometries[i]} material={material} /> : null,
      )}
    </>
  )
}
