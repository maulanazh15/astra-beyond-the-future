import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PerspectiveCamera } from 'three'
import type { Vec3 } from '../types/scene'

type SceneCameraProps = {
  positionM: Vec3
  targetM: Vec3
  /** Vertical field of view on landscape screens (degrees). */
  fovDeg?: number
  /** Field of view used on portrait screens (phones), so the composition still fits. */
  portraitFovDeg?: number
}

/** Places the default camera and adapts its field of view to the canvas aspect ratio. */
export function SceneCamera({ positionM, targetM, fovDeg = 42, portraitFovDeg = 62 }: SceneCameraProps) {
  // Read the camera inside effects (it is owned by the R3F store, not by this component).
  const get = useThree((s) => s.get)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const [px, py, pz] = positionM
  const [tx, ty, tz] = targetM

  useEffect(() => {
    const { camera } = get()
    camera.position.set(px, py, pz)
    camera.lookAt(tx, ty, tz)
  }, [get, px, py, pz, tx, ty, tz])

  useEffect(() => {
    const { camera } = get()
    if (!(camera instanceof PerspectiveCamera)) return
    camera.fov = aspect < 1 ? portraitFovDeg : fovDeg
    camera.updateProjectionMatrix()
  }, [get, aspect, fovDeg, portraitFovDeg])

  return null
}
