import { useState } from 'react'

function detect(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** true/false in the browser; null during server rendering (tests), where nothing is known yet. */
export function useWebGLSupport(): boolean | null {
  const [supported] = useState(() => (typeof document === 'undefined' ? null : detect()))
  return supported
}
