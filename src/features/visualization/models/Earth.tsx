import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BackSide } from 'three'
import type { Group } from 'three'
import { EARTH_SPIN_RAD_PER_S } from '../animations/curves'
import { toTexture } from '../materials/textures'
import type { Vec3 } from '../types/scene'
import { earthClouds, earthSurface } from '../utilities/proceduralTextures'

type EarthProps = {
  positionM: Vec3
  radiusM: number
  seed: number
  animate?: boolean
}

/**
 * Earth as seen from the Moon: procedural oceans, continents, ice and clouds, lit by the scene's
 * sun so its phase matches the lighting. Not a geographic map.
 */
export function Earth({ positionM, radiusM, seed, animate = true }: EarthProps) {
  const spin = useRef<Group>(null)
  const surface = useMemo(() => toTexture(earthSurface(512, 256, seed), { color: true }), [seed])
  const clouds = useMemo(() => toTexture(earthClouds(512, 256, seed), { color: true }), [seed])
  useLayoutEffect(
    () => () => {
      surface.dispose()
      clouds.dispose()
    },
    [surface, clouds],
  )
  useFrame((_, delta) => {
    if (animate && spin.current) spin.current.rotation.y += EARTH_SPIN_RAD_PER_S * Math.min(delta, 0.1)
  })

  return (
    <group position={positionM} rotation={[0.41, 0, 0]}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[radiusM, 48, 32]} />
          <meshStandardMaterial map={surface} roughness={0.75} metalness={0} />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[radiusM, 48, 32]} />
          <meshStandardMaterial map={clouds} transparent depthWrite={false} roughness={1} />
        </mesh>
      </group>
      {/* Thin blue atmosphere glow on the limb. */}
      <mesh scale={1.06}>
        <sphereGeometry args={[radiusM, 32, 24]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.16} side={BackSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
