import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Neutral studio reflections for inspecting hardware (PBR metals need something to reflect).
 * For viewer scenes only: the lunar surface scene stays lit by the sun alone.
 */
export function StudioEnvironment({ intensity = 0.55 }: { intensity?: number }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const { gl, scene } = get()
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = pmrem.fromScene(room, 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      target.dispose()
      room.dispose()
      pmrem.dispose()
    }
  }, [get, intensity])
  return null
}
