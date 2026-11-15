import type { HazardLevel } from '../../../types/environment'
import type { Vec3 } from '../../../types/modelAsset'

export type { Vec3 }

/** A simple-crater bowl with a raised rim (meters, scene coordinates: x east, z south, y up). */
export type Crater = {
  x: number
  z: number
  radiusM: number
  depthM: number
  /** Young craters have bright ejecta halos. */
  fresh: boolean
}

/** Everything needed to rebuild the same terrain: a seed plus the placed features. */
export type TerrainConfig = {
  seed: number
  /** Outer radius of the ground mesh; the horizon (m). */
  radiusM: number
  mainCrater: Crater
  craters: Crater[]
  /** Flattened landing pad for the lander. */
  pad: { x: number; z: number; radiusM: number }
  /** Amplitude of rolling ground near the site (m). */
  undulationM: number
}

export type Terrain = {
  config: TerrainConfig
  /** Surface height (m) at a horizontal position. Deterministic. */
  heightAt: (x: number, z: number) => number
  /** Regolith brightness 0–1 at a horizontal position (vertex color). */
  albedoAt: (x: number, z: number) => number
}

export type RockInstance = {
  position: Vec3
  scale: Vec3
  rotation: Vec3
  /** Which base rock shape to use. */
  variant: number
  /** Brightness multiplier for slight color variety. */
  shade: number
}

/** Site properties that change the scene. Derived from the game's landing-site data. */
export type SceneSite = {
  id: string
  name: string
  hazardLevel: HazardLevel
  /** Near-side sites face Earth; far-side (radio-quiet) sites never see it. */
  earthVisible: boolean
}
