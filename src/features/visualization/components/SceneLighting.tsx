import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { DirectionalLight, HemisphereLight } from 'three'
import { approach } from '../animations/curves'
import type { Vec3 } from '../types/scene'

type SceneLightingProps = {
  /** Direction the sunlight comes from (any length). Low sun = long shadows. */
  sunDirection?: Vec3
  /** Half-size of the shadowed area around the origin (m). */
  shadowExtentM?: number
  /** Sun brightness; lowered for the lunar night (starlight and, on the near side, earthshine). */
  sunIntensity?: number
}

const SUN_DISTANCE_M = 120
const DAY_SUN = 3.2

/** Regolith bounce follows the sunlight that feeds it; a faint floor remains (starlight, exposure). */
function bounceIntensity(sunIntensity: number): number {
  return 0.06 + 0.18 * Math.min(1, Math.max(0, sunIntensity / DAY_SUN))
}

/**
 * Lunar lighting: one hard white sun and almost no fill, since there is no atmosphere to scatter
 * light. A faint cool fill (earthshine and the camera's exposure) keeps shadowed sides readable.
 */
export function SceneLighting({ sunDirection = [-0.75, 0.32, 0.45], shadowExtentM = 60, sunIntensity = 3.2 }: SceneLightingProps) {
  const sun = useRef<DirectionalLight>(null)
  const bounce = useRef<HemisphereLight>(null)
  // Mount at the current light level; later changes ease in the frame loop (a prop would snap them).
  const [initialSun] = useState(sunIntensity)
  const length = Math.hypot(...sunDirection)
  const position = sunDirection.map((v) => (v / length) * SUN_DISTANCE_M) as Vec3

  useEffect(() => {
    const light = sun.current
    if (!light) return
    const cam = light.shadow.camera
    cam.left = -shadowExtentM
    cam.right = shadowExtentM
    cam.top = shadowExtentM
    cam.bottom = -shadowExtentM
    cam.near = 1
    cam.far = SUN_DISTANCE_M * 2.5
    cam.updateProjectionMatrix()
  }, [shadowExtentM])

  // Sunset and sunrise fade over a few seconds instead of switching in one frame.
  useFrame((_, dt) => {
    const light = sun.current
    if (!light) return
    light.intensity = approach(light.intensity, sunIntensity, 1.5, Math.min(dt, 0.1))
    if (bounce.current) bounce.current.intensity = bounceIntensity(light.intensity)
  })

  return (
    <>
      <directionalLight
        ref={sun}
        position={position}
        intensity={initialSun}
        color="#fff8ef"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {/* Sky: faint cool fill. Ground: sunlit regolith bouncing light into shadows (albedo ~0.12). */}
      <hemisphereLight ref={bounce} args={['#7dd3fc', '#6b655c', bounceIntensity(initialSun)]} />
      <ambientLight intensity={0.04} />
    </>
  )
}
