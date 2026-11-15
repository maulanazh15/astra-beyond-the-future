import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { InstancedMesh } from 'three'
import type { Group, Matrix4 } from 'three'
import { mergeStaticMeshes } from '../utilities/mergeStatic'

/**
 * Draws `count` copies of a rigid assembly with one instanced mesh per material. `children` is the
 * template (one copy, authored at the origin); it is baked once and hidden. `transforms` is polled
 * every frame and returns new per-copy matrices only when they changed (`null` otherwise); `force`
 * is true for the first call.
 */
export function InstancedAssembly({ count, transforms, children, name }: { count: number; transforms: (force: boolean) => readonly Matrix4[] | null; children: ReactNode; name?: string }) {
  const template = useRef<Group>(null)
  const holder = useRef<Group>(null)
  const meshes = useRef<InstancedMesh[]>([])
  const source = useRef(transforms)
  useLayoutEffect(() => {
    source.current = transforms
  })

  const apply = (matrices: readonly Matrix4[]) => {
    for (const mesh of meshes.current) {
      matrices.forEach((m, i) => i < count && mesh.setMatrixAt(i, m))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }

  useLayoutEffect(() => {
    const t = template.current
    const h = holder.current
    if (!t || !h) return
    t.visible = true
    const { merged } = mergeStaticMeshes(t, 1)
    t.visible = false
    meshes.current = merged.map((m) => {
      const mesh = new InstancedMesh(m.geometry, m.material, count)
      mesh.castShadow = m.castShadow
      mesh.receiveShadow = m.receiveShadow
      mesh.name = name ?? 'instanced-assembly'
      h.add(mesh)
      return mesh
    })
    const first = source.current(true)
    if (first) apply(first)
    return () => {
      for (const mesh of meshes.current) {
        h.remove(mesh)
        mesh.geometry.dispose()
        mesh.dispose()
      }
      meshes.current = []
    }
    // `apply` only reads refs; the assembly is rebuilt when the copy count changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [count, name])

  useFrame(() => {
    const next = source.current(false)
    if (next) apply(next)
  })

  return (
    <>
      <group ref={template}>{children}</group>
      <group ref={holder} />
    </>
  )
}
