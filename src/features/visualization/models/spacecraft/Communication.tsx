import { useLayoutEffect, useMemo } from 'react'
import { Curve, LatheGeometry, TubeGeometry, Vector2, Vector3 } from 'three'
import type { Strut } from '../../utilities/struts'
import { StrutInstances } from '../StrutInstances'
import { BeveledBox, BoltRing, Hinge } from './parts'
import type { ModuleProps } from './types'

/** Deck modules: local origin on the deck top at the mount slot, +X pointing outward. */

class HelixCurve extends Curve<Vector3> {
  private readonly radius: number
  private readonly height: number
  private readonly turns: number
  private readonly phase: number

  constructor(radius: number, height: number, turns: number, phase: number) {
    super()
    this.radius = radius
    this.height = height
    this.turns = turns
    this.phase = phase
  }
  getPoint(t: number, target = new Vector3()) {
    const a = this.phase + t * this.turns * Math.PI * 2
    return target.set(Math.cos(a) * this.radius, t * this.height, Math.sin(a) * this.radius)
  }
}

/** S-band low-gain antenna: quadrifilar helix on a mast under a radome cap. */
export function LowGainAntenna({ materials: m }: ModuleProps) {
  const helices = useMemo(
    () => Array.from({ length: 4 }, (_, i) => new TubeGeometry(new HelixCurve(0.045, 0.2, 0.75, (i * Math.PI) / 2), 40, 0.005, 5, false)),
    [],
  )
  useLayoutEffect(() => () => helices.forEach((g) => g.dispose()), [helices])
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.04, 16]} />
      </mesh>
      <BoltRing radiusM={0.065} y={0.042} count={6} material={m.aluminium} boltRadiusM={0.008} />
      <mesh position={[0, 0.25, 0]} material={m.aluminium} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.42, 8]} />
      </mesh>
      <group position={[0, 0.46, 0]}>
        {helices.map((g, i) => (
          <mesh key={i} geometry={g} material={m.aluminium} />
        ))}
        <mesh position={[0, 0.23, 0]} material={m.white} castShadow>
          <sphereGeometry args={[0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  )
}

function dishGeometry(radiusM: number, depthM: number) {
  const points = Array.from({ length: 13 }, (_, i) => {
    const r = (i / 12) * radiusM
    return new Vector2(r, depthM * (r / radiusM) ** 2)
  })
  return new LatheGeometry(points, 40)
}

const DISH_R = 0.42
const DISH_DEPTH = 0.1

/** X-band high-gain dish on a two-axis gimbal, with a tripod-mounted feed and back ribs. */
export function HighGainDish({ materials: m }: ModuleProps) {
  const dish = useMemo(() => dishGeometry(DISH_R, DISH_DEPTH), [])
  useLayoutEffect(() => () => dish.dispose(), [dish])
  const focus = (DISH_R * DISH_R) / (4 * DISH_DEPTH)
  const tripod = useMemo<Strut[]>(
    () =>
      [0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3
        return { from: [Math.cos(a) * DISH_R * 0.92, DISH_DEPTH * 0.85, Math.sin(a) * DISH_R * 0.92], to: [0, focus - 0.03, 0], radiusM: 0.007 }
      }),
    [focus],
  )
  return (
    <group>
      {/* Azimuth turret and mast. */}
      <mesh position={[0, 0.05, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 20]} />
      </mesh>
      <BoltRing radiusM={0.105} y={0.102} count={8} material={m.aluminium} boltRadiusM={0.009} />
      <mesh position={[0, 0.32, 0]} material={m.aluminium} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.45, 10]} />
      </mesh>
      {/* Elevation yoke and hinge; dish tilted toward the relay orbiter. */}
      <group position={[0, 0.58, 0]}>
        <BeveledBox size={[0.08, 0.12, 0.22]} material={m.graphite} bevelM={0.015} />
        <group rotation={[0, 0, 0.6]}>
          <Hinge lengthM={0.24} position={[0, 0.07, 0]} metal={m.aluminium} dark={m.graphite} />
          <group position={[0, 0.1, 0]}>
            <mesh geometry={dish} material={m.white} castShadow receiveShadow />
            <mesh position={[0, DISH_DEPTH, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
              <torusGeometry args={[DISH_R, 0.008, 6, 40]} />
            </mesh>
            {/* Back ribs. */}
            {Array.from({ length: 6 }, (_, i) => (
              <group key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
                <BeveledBox size={[DISH_R * 0.9, 0.02, 0.012]} position={[DISH_R * 0.45, 0.012, 0]} rotation={[0, 0, 0.2]} material={m.graphite} bevelM={0.004} />
              </group>
            ))}
            <StrutInstances struts={tripod} material={m.aluminium} />
            <mesh position={[0, focus, 0]} material={m.graphite}>
              <cylinderGeometry args={[0.035, 0.02, 0.07, 12]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

/** Optical comms terminal: gimbaled telescope with a sunshade and a cyan laser aperture. */
export function OpticalTerminal({ materials: m }: ModuleProps) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.12, 20]} />
      </mesh>
      <BoltRing radiusM={0.115} y={0.122} count={8} material={m.aluminium} boltRadiusM={0.009} />
      {/* Gimbal fork. */}
      {[-0.13, 0.13].map((z) => (
        <BeveledBox key={z} size={[0.06, 0.24, 0.03]} position={[0, 0.24, z]} material={m.aluminium} bevelM={0.01} />
      ))}
      <group position={[0, 0.3, 0]} rotation={[0, 0, 0.75]}>
        <mesh material={m.white} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.3, 20]} />
        </mesh>
        <mesh position={[0, 0.22, 0]} material={m.black}>
          <cylinderGeometry args={[0.115, 0.1, 0.16, 20, 1, true]} />
        </mesh>
        <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.accent}>
          <circleGeometry args={[0.07, 24]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.graphite}>
          <cylinderGeometry args={[0.03, 0.03, 0.29, 10]} />
        </mesh>
      </group>
    </group>
  )
}
