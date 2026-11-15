import type { ReactNode } from 'react'
import { getModelAsset } from '../assetRegistry'
import { ModelViewer } from './ModelViewer'

/**
 * Shows the procedural `children` until the registry marks a finished GLB for `assetId` as
 * available; then loads the GLB (falling back to the procedural model while loading or on error).
 */
export function ReplaceableModel({ assetId, children }: { assetId: string; children: ReactNode }) {
  const asset = getModelAsset(assetId)
  return asset?.status === 'available' ? <ModelViewer asset={asset} placeholder={children} /> : children
}
