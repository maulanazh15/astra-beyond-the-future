import { useEffect, useRef } from 'react'
import type { DirectionalLight } from 'three'
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

/**
 * Lunar lighting: one hard white sun and almost no fill, since there is no atmosphere to scatter
 * light. A faint cool fill (earthshine and the camera's exposure) keeps shadowed sides readable.
 */
export function SceneLighting({ sunDirection = [-0.75, 0.32, 0.45], shadowExtentM = 60, sunIntensity = 3.2 }: SceneLightingProps) {
  const sun = useRef<DirectionalLight>(null)
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

  return (
    <>
      <directionalLight
        ref={sun}
        position={position}
        intensity={sunIntensity}
        color="#fff8ef"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <hemisphereLight args={['#7dd3fc', '#1c1917', 0.12]} />
      <ambientLight intensity={0.04} />
    </>
  )
}
