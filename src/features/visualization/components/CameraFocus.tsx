import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { easeInOut } from '../animations/missionTimeline'
import { focusCameraPosition } from '../animations/cameraFocus'
import type { Vec3 } from '../types/scene'

export type CameraFocusTarget = {
  /** Stable id: a new id starts a new camera move. */
  id: string
  /** Current point to look at; read every frame so moving objects can be followed. */
  target: () => Vec3
  distanceM: number
  minDistanceM: number
}

const MOVE_S = 1.3

/**
 * Glides the orbit camera to a focused object, then keeps following it if it moves. The player can
 * still orbit and zoom around the focused object at any time.
 */
export function CameraFocus({ controls, focus, defaultMinDistanceM }: { controls: RefObject<ThreeOrbitControls | null>; focus: CameraFocusTarget | null; defaultMinDistanceM: number }) {
  const get = useThree((s) => s.get)
  const move = useRef<{ fromCam: Vector3; toCam: Vector3; fromTarget: Vector3; t: number } | null>(null)
  const last = useRef(new Vector3())
  const id = focus?.id ?? null

  useEffect(() => {
    const c = controls.current
    if (!c) return
    c.minDistance = focus?.minDistanceM ?? defaultMinDistanceM
    if (!focus) return
    const { camera } = get()
    const target = focus.target()
    const cam = focusCameraPosition(camera.position.toArray() as Vec3, c.target.toArray() as Vec3, target, focus.distanceM)
    move.current = { fromCam: camera.position.clone(), toCam: new Vector3(...cam), fromTarget: c.target.clone(), t: 0 }
    last.current.set(...target)
    // Only a new focus id starts a move; `focus` itself is recreated on every render.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [id, controls, get, defaultMinDistanceM])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c || !focus) return
    const { camera } = get()
    const now = new Vector3(...focus.target())
    const m = move.current
    if (m) {
      m.t = Math.min(1, m.t + dt / MOVE_S)
      const k = easeInOut(m.t)
      // Follow the target's motion during the move as well.
      const drift = now.clone().sub(last.current)
      m.toCam.add(drift)
      camera.position.lerpVectors(m.fromCam, m.toCam, k)
      c.target.lerpVectors(m.fromTarget, now, k)
      if (m.t >= 1) move.current = null
    } else {
      const drift = now.clone().sub(last.current)
      if (drift.lengthSq() > 0) {
        camera.position.add(drift)
        c.target.add(drift)
      }
    }
    last.current.copy(now)
  })

  return null
}
