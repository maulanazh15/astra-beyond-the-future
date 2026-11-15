import { createRng } from './seededRandom'

/**
 * Stars on a sky dome, above the horizon only. Brightness follows a steep power law so most stars
 * are faint. Stylized: a camera exposed for the sunlit surface would show almost no stars.
 */
export function generateStars(seed: number, count: number, radiusM: number) {
  const rng = createRng(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    // Uniform on the sphere, then keep the upper hemisphere (slightly below horizon for hills).
    const y = rng() * 1.05 - 0.05
    const theta = rng() * Math.PI * 2
    const r = Math.sqrt(1 - y * y)
    positions.set([Math.cos(theta) * r * radiusM, y * radiusM, Math.sin(theta) * r * radiusM], i * 3)
    const brightness = 0.25 + 0.75 * rng() ** 6
    const warmth = rng()
    // Mostly white, a few blue-white and pale orange stars.
    const tint = warmth < 0.15 ? [0.8, 0.88, 1] : warmth > 0.9 ? [1, 0.88, 0.75] : [1, 1, 1]
    colors.set([tint[0] * brightness, tint[1] * brightness, tint[2] * brightness], i * 3)
  }
  return { positions, colors }
}
