/**
 * AssetRegistry: the single entry point for 3D model metadata.
 * Entries live in `src/data/assets/model-assets.json`; see documentation/3d-asset-pipeline.md.
 */
import { modelAssets, modelAssetsNote } from '../../data'
import type { ModelAsset } from '../../types/modelAsset'

export { modelAssets, modelAssetsNote }
export {
  categoryFolders,
  isSupportedModelPath,
  publicAssetUrl,
  resolveModelSource,
} from './utilities/modelSource'
export type { ModelSource } from './utilities/modelSource'

export function getModelAsset(id: string | undefined): ModelAsset | undefined {
  return modelAssets.find((asset) => asset.id === id)
}

/** Models that represent a spacecraft component (e.g. a payload or rover). */
export function modelAssetsForComponent(componentId: string): ModelAsset[] {
  return modelAssets.filter((asset) => asset.componentIds?.includes(componentId))
}

/** Whole vehicles and environments never stand in for a single spacecraft module. */
const WHOLE_VEHICLE_CATEGORIES = new Set(['lander', 'spacecraft', 'environment'])

/**
 * A finished GLB that should replace the procedural model of one component's module, if any.
 * Only `available` assets of module categories (payload, rover, structure) qualify.
 */
export function moduleAssetFor(componentId: string): ModelAsset | undefined {
  return modelAssetsForComponent(componentId).find((a) => a.status === 'available' && !WHOLE_VEHICLE_CATEGORIES.has(a.category))
}
