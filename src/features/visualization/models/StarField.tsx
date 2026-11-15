import { useMemo } from 'react'
import { generateStars } from '../utilities/starField'

/** Thousands of stars in a single draw call. */
export function StarField({ seed, count = 2600, radiusM = 4500 }: { seed: number; count?: number; radiusM?: number }) {
  const stars = useMemo(() => generateStars(seed, count, radiusM), [seed, count, radiusM])
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[stars.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={1.6} sizeAttenuation={false} depthWrite={false} toneMapped={false} />
    </points>
  )
}
