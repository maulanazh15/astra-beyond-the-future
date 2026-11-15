import { useState } from 'react'

function detect(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    // Release the probe at once: browsers cap live contexts and drop the oldest (a visible scene) first.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

/** true/false in the browser; null during server rendering (tests), where nothing is known yet. */
export function useWebGLSupport(): boolean | null {
  const [supported] = useState(() => (typeof document === 'undefined' ? null : detect()))
  return supported
}
