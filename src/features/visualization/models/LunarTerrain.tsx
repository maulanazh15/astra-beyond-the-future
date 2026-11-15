import { useLayoutEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { createRegolithMaterial } from '../materials/lunarMaterials'
import type { Terrain } from '../types/scene'
import { buildTerrainArrays } from '../utilities/terrainMesh'

/** The ground: one polar-grid mesh from the site out to the horizon (~77k triangles). */
export function LunarTerrain({ terrain }: { terrain: Terrain }) {
  const geometry = useMemo(() => {
    const arrays = buildTerrainArrays(terrain)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(arrays.positions, 3))
    g.setAttribute('color', new BufferAttribute(arrays.colors, 3))
    g.setAttribute('uv', new BufferAttribute(arrays.uvs, 2))
    g.setIndex(new BufferAttribute(arrays.indices, 1))
    g.computeVertexNormals()
    return g
  }, [terrain])
  const material = useMemo(() => createRegolithMaterial(terrain.config.seed), [terrain.config.seed])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(
    () => () => {
      material.normalMap?.dispose()
      material.dispose()
    },
    [material],
  )

  return <mesh geometry={geometry} material={material} receiveShadow />
}
