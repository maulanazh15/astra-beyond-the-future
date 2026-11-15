import { BufferAttribute, BufferGeometry, Matrix4, Mesh } from 'three'
import type { InstancedMesh, Material, Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Draw-call reduction for rigid procedural assemblies: every plain mesh under `root` that shares a
 * material and shadow flags is baked into one mesh, in `root`'s local frame. Only meshes that are
 * visible at merge time are taken; instanced meshes and anything that is not a plain `Mesh` are
 * left alone. The caller hides the merged sources and adds the returned meshes beside them, so the
 * silhouette is unchanged while the renderer issues one draw per material instead of one per part.
 *
 * Only for subtrees whose parts never move relative to each other: a part animated through a ref
 * would keep animating its (hidden) source while the merged copy stays put.
 */
export type MergedStaticResult = { merged: Mesh[]; sources: Mesh[] }

function visibleWithin(object: Object3D, root: Object3D): boolean {
  for (let o: Object3D | null = object; o && o !== root; o = o.parent) if (!o.visible) return false
  return root.visible
}

/** Position, normal, and uv only, non-indexed, so geometries from any builder can be merged. */
function normalized(source: BufferGeometry, matrix: Matrix4): BufferGeometry | null {
  if (!source.attributes.position) return null
  const flat = source.index ? source.toNonIndexed() : source.clone()
  const out = new BufferGeometry()
  out.setAttribute('position', flat.attributes.position)
  if (!flat.attributes.normal) flat.computeVertexNormals()
  out.setAttribute('normal', flat.attributes.normal)
  const count = flat.attributes.position.count
  out.setAttribute('uv', flat.attributes.uv ?? new BufferAttribute(new Float32Array(count * 2), 2))
  out.applyMatrix4(matrix)
  flat.dispose()
  return out
}

/** `minParts`: smallest bucket worth merging (1 when every part must be baked, e.g. for instancing). */
export function mergeStaticMeshes(root: Object3D, minParts = 2): MergedStaticResult {
  root.updateWorldMatrix(true, true)
  const toRoot = root.matrixWorld.clone().invert()
  const buckets = new Map<string, { material: Material; cast: boolean; receive: boolean; meshes: Mesh[] }>()
  root.traverse((o) => {
    const mesh = o as Mesh
    // InstancedMesh also reports type 'Mesh': its geometry is a unit template, never merge it.
    if (!mesh.isMesh || mesh.type !== 'Mesh' || (o as InstancedMesh).isInstancedMesh) return
    if (Array.isArray(mesh.material) || !visibleWithin(mesh, root)) return
    // A mirrored transform flips the winding: such parts stay unmerged rather than render inside out.
    if (mesh.matrixWorld.determinant() <= 0) return
    const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}`
    const bucket = buckets.get(key) ?? { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, meshes: [] }
    bucket.meshes.push(mesh)
    buckets.set(key, bucket)
  })

  const merged: Mesh[] = []
  const sources: Mesh[] = []
  const relative = new Matrix4()
  for (const bucket of buckets.values()) {
    // A lone part gains nothing from merging.
    if (bucket.meshes.length < minParts) continue
    const parts = bucket.meshes.map((m) => normalized(m.geometry, relative.multiplyMatrices(toRoot, m.matrixWorld)))
    if (parts.some((p) => p === null)) {
      parts.forEach((p) => p?.dispose())
      continue
    }
    const geometry = mergeGeometries(parts as BufferGeometry[], false)
    parts.forEach((p) => p?.dispose())
    if (!geometry) continue
    geometry.computeBoundingSphere()
    const mesh = new Mesh(geometry, bucket.material)
    mesh.name = 'merged-static'
    mesh.castShadow = bucket.cast
    mesh.receiveShadow = bucket.receive
    merged.push(mesh)
    sources.push(...bucket.meshes)
  }
  return { merged, sources }
}
