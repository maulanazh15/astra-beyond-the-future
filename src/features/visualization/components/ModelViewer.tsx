import { Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { getModelAsset, resolveModelSource } from '../assetRegistry'
import type { ModelAsset, Vec3 } from '../../../types/modelAsset'
import { GltfModel } from './GltfModel'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { degreesToRadians } from '../utilities/modelSource'
import { PlaceholderModel } from '../models/placeholders/PlaceholderModel'

export type ModelStatus = 'placeholder' | 'loading' | 'loaded' | 'error'

type ModelViewerProps = {
  /** Registry id, or an asset object (e.g. for previews). */
  asset: string | ModelAsset
  positionM?: Vec3
  /** Shown instead of the category placeholder when no model is available. */
  placeholder?: ReactNode
  onStatusChange?: (status: ModelStatus) => void
}

function Reported({ status, onStatusChange, children }: { status: ModelStatus; onStatusChange?: (s: ModelStatus) => void; children: ReactNode }) {
  useEffect(() => onStatusChange?.(status), [status, onStatusChange])
  return children
}

/**
 * One registered model inside a Scene3D. Loads the GLB/GLTF when the asset is available;
 * otherwise, while loading, or on error, shows development placeholder geometry.
 */
export function ModelViewer({ asset: assetOrId, positionM = [0, 0, 0], placeholder, onStatusChange }: ModelViewerProps) {
  const asset = typeof assetOrId === 'string' ? getModelAsset(assetOrId) : assetOrId
  const source = resolveModelSource(asset)
  const fallback = placeholder ?? (asset ? <PlaceholderModel category={asset.category} /> : null)
  const report = (status: ModelStatus) => (
    <Reported status={status} onStatusChange={onStatusChange}>
      {fallback}
    </Reported>
  )

  return (
    <group position={positionM}>
      {source.kind === 'placeholder' || !asset ? (
        report('placeholder')
      ) : (
        <group scale={asset.scale} rotation={degreesToRadians(asset.rotationDeg)}>
          <SceneErrorBoundary key={source.url} fallback={report('error')}>
            <Suspense fallback={report('loading')}>
              {/* Inside Suspense, so 'loaded' is only reported once the file has actually loaded. */}
              <Reported status="loaded" onStatusChange={onStatusChange}>
                <GltfModel url={source.url} />
              </Reported>
            </Suspense>
          </SceneErrorBoundary>
        </group>
      )}
    </group>
  )
}
