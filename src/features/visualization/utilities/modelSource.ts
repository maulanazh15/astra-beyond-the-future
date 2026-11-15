import type { ModelAsset, ModelAssetCategory, Vec3 } from '../../../types/modelAsset'

/** Folder under `public/assets/3d/` that holds each category's models. */
export const categoryFolders: Record<ModelAssetCategory, string> = {
  environment: 'environments',
  spacecraft: 'spacecraft',
  lander: 'landers',
  payload: 'payloads',
  rover: 'rovers',
  structure: 'structures',
}

export function isSupportedModelPath(path: string): boolean {
  return /\.(glb|gltf)$/i.test(path)
}

/** Public URL of a file under `public/`, respecting Vite's base path. */
export function publicAssetUrl(path: string, baseUrl: string = import.meta.env.BASE_URL): string {
  return `${baseUrl.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`
}

export type ModelSource =
  | { kind: 'model'; url: string }
  | { kind: 'placeholder'; reason: 'unregistered' | 'planned' | 'unsupportedFormat' }

/** Decides whether to load a model file or show development placeholder geometry. Never throws. */
export function resolveModelSource(asset: ModelAsset | undefined, baseUrl?: string): ModelSource {
  if (!asset) return { kind: 'placeholder', reason: 'unregistered' }
  if (asset.status !== 'available') return { kind: 'placeholder', reason: 'planned' }
  if (!isSupportedModelPath(asset.modelPath)) return { kind: 'placeholder', reason: 'unsupportedFormat' }
  return { kind: 'model', url: publicAssetUrl(asset.modelPath, baseUrl) }
}

export function degreesToRadians([x, y, z]: Vec3): Vec3 {
  const k = Math.PI / 180
  return [x * k, y * k, z * k]
}
