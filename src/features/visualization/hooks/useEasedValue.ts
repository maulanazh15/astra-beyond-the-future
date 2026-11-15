import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { RefObject } from 'react'
import { approach } from '../animations/curves'

/**
 * A number that eases toward `target` every frame (read `.current` inside useFrame). Starts at the
 * target, so mounting never animates; `animate: false` snaps (reduced motion, static renders).
 * Runs at priority −1, before the frame callbacks that read it.
 */
export function useEasedValue(target: number, animate: boolean, rate = 2.2): RefObject<number> {
  const value = useRef(target)
  useFrame((_, dt) => {
    // Cap the step so a long pause (tab hidden) does not skip the animation.
    value.current = animate ? approach(value.current, target, rate, Math.min(dt, 0.1)) : target
  }, -1)
  return value
}
