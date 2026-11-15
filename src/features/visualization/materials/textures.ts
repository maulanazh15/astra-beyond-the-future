import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three'
import type { Pixels } from '../utilities/proceduralTextures'

/** Wraps generated pixels as a GPU texture. `color: true` for albedo maps, false for data (normals, alpha). */
export function toTexture(pixels: Pixels, options: { color?: boolean; repeat?: boolean } = {}): DataTexture {
  const texture = new DataTexture(pixels.data, pixels.width, pixels.height, RGBAFormat)
  if (options.color) texture.colorSpace = SRGBColorSpace
  if (options.repeat) texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}
