import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Loads a GLB/GLTF file. Suspends while loading and throws on failure (caught by ModelErrorBoundary). */
export function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url)
  // Clone so the same cached file can appear several times in one scene.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  return <primitive object={scene} />
}
