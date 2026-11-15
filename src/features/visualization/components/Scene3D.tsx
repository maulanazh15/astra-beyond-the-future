import { Canvas } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useInView } from '../hooks/useInView'
import { useWebGLSupport } from '../hooks/useWebGLSupport'
import { ErrorFallback } from './ErrorFallback'
import { LoadingFallback } from './LoadingFallback'
import { SceneErrorBoundary } from './SceneErrorBoundary'

type Scene3DProps = {
  children: ReactNode
  /** Accessible description of what the scene shows. */
  label: string
  /** Size the container with Tailwind classes; the canvas fills it and follows resizes. */
  className?: string
  shadows?: boolean
  /** Shown over the canvas (e.g. captions); pointer events pass through to the scene. */
  overlay?: ReactNode
  /** Called when a click hits no 3D object (e.g. to clear a selection). */
  onPointerMissed?: () => void
}

/**
 * Responsive 3D canvas. Handles: no WebGL (message), renderer crashes (message + retry),
 * and pauses rendering while scrolled off screen. Put SceneCamera, SceneLighting, OrbitControls
 * and scene content inside.
 */
export function Scene3D({ children, label, className = 'h-96', shadows = true, overlay, onPointerMissed }: Scene3DProps) {
  const container = useRef<HTMLDivElement>(null)
  const inView = useInView(container)
  const webgl = useWebGLSupport()
  const [attempt, setAttempt] = useState(0)

  let content: ReactNode
  if (webgl === null) content = <LoadingFallback />
  else if (!webgl) content = <ErrorFallback message="This 3D view needs WebGL, which this browser or device does not provide. The rest of the mission works without it." />
  else {
    content = (
      <SceneErrorBoundary
        key={attempt}
        fallback={<ErrorFallback message="The 3D view stopped unexpectedly." onRetry={() => setAttempt((n) => n + 1)} />}
      >
        <Canvas
          // PCF filtering: three r186 removed the soft variant R3F requests by default.
          shadows={shadows ? 'percentage' : false}
          dpr={[1, 1.75]}
          // Off screen: render only on demand (never 'never', which would skip even the first frame).
          frameloop={inView ? 'always' : 'demand'}
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
          camera={{ fov: 42, near: 0.1, far: 6000, position: [12, 6, 18] }}
          onPointerMissed={onPointerMissed}
        >
          <color attach="background" args={['#02040a']} />
          {children}
        </Canvas>
      </SceneErrorBoundary>
    )
  }

  return (
    <div ref={container} className={`relative overflow-hidden rounded-lg border border-space-700 bg-space-950 ${className}`} role="img" aria-label={label}>
      {content}
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}
