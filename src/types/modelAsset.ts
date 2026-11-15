/** Folder under `public/assets/3d/` for each category. */
export type ModelAssetCategory = 'environment' | 'spacecraft' | 'lander' | 'payload' | 'rover' | 'structure'

/**
 * `planned`: no model file yet; viewers show development placeholder geometry and never request the file.
 * `available`: the GLB/GLTF exists under `public/` and is loaded (falling back to the placeholder on error).
 */
export type ModelAssetStatus = 'planned' | 'available'

export type Vec3 = [number, number, number]

export type ModelAsset = {
  id: string
  name: string
  category: ModelAssetCategory
  status: ModelAssetStatus
  /** Path relative to `public/`, e.g. `assets/3d/landers/lander.glb`. `.glb` or `.gltf`. */
  modelPath: string
  /** Path relative to `public/`, under `assets/thumbnails/`. */
  thumbnailPath?: string
  /** Uniform scale applied after import. Blender exports in meters, so this is normally 1. */
  scale: number
  /** Extra rotation applied after import, in degrees (X, Y, Z). glTF is already +Y up. */
  rotationDeg: Vec3
  /**
   * Spacecraft component ids (components.json) this model represents. Payload, rover and structure
   * assets replace that component's procedural module in the spacecraft viewer; the assembly decides
   * where it mounts.
   */
  componentIds?: string[]
  notes?: string
}
