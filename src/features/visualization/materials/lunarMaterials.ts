import { Color, MeshStandardMaterial, Vector2 } from 'three'
import { regolithNormalMap } from '../utilities/proceduralTextures'
import { toTexture } from './textures'

/**
 * Regolith: very rough and non-metallic. Albedo comes from per-vertex colors (crater floors, bright
 * ejecta); a tiling procedural normal map adds small bumps and pits.
 */
export function createRegolithMaterial(seed: number): MeshStandardMaterial {
  const normalMap = toTexture(regolithNormalMap(256, seed), { repeat: true })
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    normalMap,
    // Kept subtle: a low sun exaggerates bumps into a sand-ripple look.
    normalScale: new Vector2(0.3, 0.3),
  })
}

export function createRockMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color('#8a8781'), roughness: 0.93, metalness: 0, flatShading: true })
}
