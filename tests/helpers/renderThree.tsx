/**
 * Renders react-three-fiber content without a browser or WebGL, for scene-graph tests. A stub
 * renderer stands in for WebGLRenderer; `frames()` runs the frame loop so animations apply.
 */
import { act } from 'react'
import type { ReactNode } from 'react'
import { advance, createRoot, extend, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Object3D, Scene } from 'three'

extend(THREE as unknown as Record<string, never>)
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const noop = () => {}
const listeners = { addEventListener: noop, removeEventListener: noop }

function stubCanvas() {
  return {
    ...listeners,
    width: 640,
    height: 360,
    clientWidth: 640,
    clientHeight: 360,
    style: {},
    setPointerCapture: noop,
    releasePointerCapture: noop,
    getRootNode: () => listeners,
    ownerDocument: listeners,
    getContext: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
  }
}

function stubRenderer(canvas: unknown) {
  return {
    domElement: canvas,
    xr: { enabled: false, isPresenting: false, ...listeners, setAnimationLoop: noop },
    shadowMap: { enabled: false, type: 0 },
    info: { render: {} },
    outputColorSpace: '',
    toneMapping: 0,
    setPixelRatio: noop,
    setSize: noop,
    render: noop,
    dispose: noop,
    setAnimationLoop: noop,
    getPixelRatio: () => 1,
  }
}

export type ThreeTestRoot = {
  scene: Scene
  /** Runs `count` frames of `stepS` seconds each (useFrame callbacks, easing, animation). */
  frames: (count?: number, stepS?: number) => Promise<void>
  rerender: (node: ReactNode) => Promise<void>
  find: (name: string) => Object3D | undefined
  findAll: (name: string) => Object3D[]
  unmount: () => Promise<void>
}

export async function renderThree(node: ReactNode): Promise<ThreeTestRoot> {
  const canvas = stubCanvas()
  const root = createRoot(canvas as unknown as HTMLCanvasElement)
  let scene: Scene | undefined
  function Capture() {
    scene = useThree((s) => s.scene)
    return null
  }
  await act(async () => {
    await root.configure({ gl: stubRenderer(canvas) as never, frameloop: 'never', size: { width: 640, height: 360, top: 0, left: 0 } })
  })
  const render = (n: ReactNode) =>
    act(async () => {
      root.render(
        <>
          <Capture />
          {n}
        </>,
      )
    })
  await render(node)
  let clockMs = 0
  return {
    get scene() {
      if (!scene) throw new Error('scene not captured')
      return scene
    },
    frames: async (count = 1, stepS = 1 / 60) => {
      for (let i = 0; i < count; i += 1) {
        clockMs += stepS * 1000
        await act(async () => advance(clockMs, true))
      }
    },
    rerender: render,
    find: (name) => scene?.getObjectByName(name),
    findAll: (name) => {
      const found: Object3D[] = []
      scene?.traverse((o) => o.name === name && found.push(o))
      return found
    },
    unmount: () => act(async () => root.unmount()),
  }
}

/** Number of meshes (instanced meshes count once) under an object. */
export function countMeshes(object: Object3D): number {
  let n = 0
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n += 1
  })
  return n
}
