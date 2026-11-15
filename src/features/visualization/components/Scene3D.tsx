import { Canvas, addAfterEffect, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
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
/**
 * Calls `onFirstFrame` once the renderer has drawn a frame. Race-free: a frame drawn before this
 * component subscribed (slow devices, software rendering) is caught from the renderer's own frame
 * counter; later ones from R3F's after-render hook (after the draw, not before it).
 */
function FirstFrameSignal({ onFirstFrame }: { onFirstFrame: () => void }) {
  const gl = useThree((s) => s.gl)
  const done = useRef(false)
  const notify = useRef(onFirstFrame)
  useEffect(() => {
    notify.current = onFirstFrame
  })
  useEffect(() => {
    const check = () => {
      if (done.current || !(gl.info.render.frame > 0)) return
      done.current = true
      notify.current()
    }
    check()
    return addAfterEffect(check)
  }, [gl])
  return null
}

/** Lifecycle of the canvas, mirrored to `data-scene-state` on the container for diagnostics and QA. */
type SceneState = 'starting' | 'rendered' | 'contextLost'

export function Scene3D({ children, label, className = 'h-96', shadows = true, overlay, onPointerMissed }: Scene3DProps) {
  const container = useRef<HTMLDivElement>(null)
  const inView = useInView(container)
  const webgl = useWebGLSupport()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<SceneState>('starting')
  const retry = () => {
    setState('starting')
    setAttempt((n) => n + 1)
  }

  let content: ReactNode
  if (webgl === null) content = <LoadingFallback />
  else if (!webgl) content = <ErrorFallback message="This 3D view needs WebGL, which this browser or device does not provide. The rest of the mission works without it." />
  else if (state === 'contextLost') {
    // Surfaced, not hidden: a lost context leaves a blank canvas, so say so and offer a fresh one.
    content = <ErrorFallback message="The 3D view lost its graphics context (the GPU was reset or too many 3D views were open)." onRetry={retry} />
  } else {
    content = (
      <SceneErrorBoundary
        key={attempt}
        fallback={<ErrorFallback message="The 3D view stopped unexpectedly." onRetry={retry} />}
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
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', () => setState('contextLost'), { once: true })
          }}
        >
          <color attach="background" args={['#02040a']} />
          <FirstFrameSignal onFirstFrame={() => setState('rendered')} />
          {children}
        </Canvas>
      </SceneErrorBoundary>
    )
  }

  return (
    <div ref={container} className={`relative overflow-hidden rounded-lg border border-space-700 bg-space-950 ${className}`} role="img" aria-label={label} data-scene-state={webgl ? state : undefined}>
      {content}
      {webgl && state === 'starting' && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-500" aria-hidden>
          Preparing 3D view…
        </p>
      )}
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}
