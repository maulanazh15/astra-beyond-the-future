import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Group } from 'three'
import { mergeStaticMeshes } from '../utilities/mergeStatic'

/**
 * Renders `children` as authored, then bakes their rigid meshes into one mesh per material (see
 * `mergeStaticMeshes`). Wrap only parts that never move relative to each other; the wrapper itself
 * may sit inside an animated group. The procedural children stay mounted (hidden), so props,
 * picking, and GLB replacement behave exactly as before.
 */
export function MergedStatic({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null)
  useLayoutEffect(() => {
    const group = root.current
    if (!group) return
    const { merged, sources } = mergeStaticMeshes(group)
    for (const mesh of sources) mesh.visible = false
    for (const mesh of merged) group.add(mesh)
    return () => {
      for (const mesh of merged) {
        group.remove(mesh)
        mesh.geometry.dispose()
      }
      for (const mesh of sources) mesh.visible = true
    }
  }, [])
  return <group ref={root}>{children}</group>
}
