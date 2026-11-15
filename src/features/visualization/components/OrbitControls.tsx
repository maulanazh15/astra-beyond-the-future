import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Vec3 } from '../types/scene'

export type OrbitControlsProps = {
  target?: Vec3
  minDistanceM?: number
  maxDistanceM?: number
  /** Lowest camera angle above the horizon (degrees), keeps the camera out of the ground. */
  minElevationDeg?: number
  enablePan?: boolean
  /** Receives the live controls, for scripted camera moves (e.g. focusing an object). */
  controlsRef?: RefObject<ThreeOrbitControls | null>
}

/** Drag/touch to orbit, scroll/pinch to zoom. Damped for a cinematic feel. */
export function OrbitControls({ target = [0, 1, 0], minDistanceM = 2, maxDistanceM = 60, minElevationDeg = 3, enablePan = false, controlsRef }: OrbitControlsProps) {
  const { camera, gl } = useThree()
  const controls = useRef<ThreeOrbitControls | null>(null)
  const [tx, ty, tz] = target

  useEffect(() => {
    const c = new ThreeOrbitControls(camera, gl.domElement)
    c.target.set(tx, ty, tz)
    c.enableDamping = true
    c.dampingFactor = 0.08
    c.enablePan = enablePan
    c.minDistance = minDistanceM
    c.maxDistance = maxDistanceM
    c.maxPolarAngle = Math.PI / 2 - (minElevationDeg * Math.PI) / 180
    c.update()
    controls.current = c
    if (controlsRef) controlsRef.current = c
    return () => {
      c.dispose()
      controls.current = null
      if (controlsRef) controlsRef.current = null
    }
  }, [camera, gl, tx, ty, tz, minDistanceM, maxDistanceM, minElevationDeg, enablePan, controlsRef])

  useFrame(() => controls.current?.update())
  return null
}
