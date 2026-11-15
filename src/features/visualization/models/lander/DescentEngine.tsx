import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { AdditiveBlending, Color, MeshBasicMaterial } from 'three'
import type { Group, Mesh } from 'three'
import type { LanderPose } from '../../animations/missionTimeline'
import { useDisposable } from '../../hooks/useDisposable'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import { LANDER, LEG_BEARINGS_RAD } from '../../utilities/landerLayout'
import type { Strut } from '../../utilities/struts'
import { bellNozzle } from '../geometry'
import { CableRun } from '../spacecraft/parts'
import { StrutInstances } from '../StrutInstances'

const THROAT_Y = 0.68
const EXIT_Y = 0.3
const EXIT_R = 0.36

/** Thrust-frame struts from the thrust plate down to the gimbal ring. */
function thrustFrame(): Strut[] {
  return [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2
    return { from: [Math.cos(a) * 0.42, LANDER.thrustPlateY, Math.sin(a) * 0.42], to: [Math.cos(a) * 0.18, 0.8, Math.sin(a) * 0.18], radiusM: 0.022 }
  })
}

/** Throttleable descent engine: thrust frame, gimbal, chamber, bell nozzle, feed lines, and plume. */
export function DescentEngine({ pose, materials }: { pose: RefObject<LanderPose>; materials: SpacecraftMaterials }) {
  const nozzle = useDisposable(() => bellNozzle(0.085, EXIT_R, THROAT_Y - EXIT_Y), [])
  const frame = useMemo(() => thrustFrame(), [])
  const feeds = useMemo(
    () =>
      LEG_BEARINGS_RAD.map((b): Vec3[] => [
        [Math.cos(b) * (LANDER.tankRingM - 0.05), LANDER.tankY - LANDER.tankRadiusM + 0.02, Math.sin(b) * (LANDER.tankRingM - 0.05)],
        [Math.cos(b) * 0.32, LANDER.thrustPlateY + 0.12, Math.sin(b) * 0.32],
        [Math.cos(b) * 0.14, 0.86, Math.sin(b) * 0.14],
      ]),
    [],
  )
  const plumeOuter = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#ffd9a8'), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    [],
  )
  const plumeCore = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#bfe9ff'), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    [],
  )
  const outer = useRef<Group>(null)
  const core = useRef<Group>(null)
  const outerMesh = useRef<Mesh>(null)
  const coreMesh = useRef<Mesh>(null)
  const throat = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const { throttle } = pose.current
    // A faint, flickering plume: hypergolic exhaust is almost invisible in vacuum.
    const flicker = 1 + 0.06 * Math.sin(clock.elapsedTime * 47) + 0.04 * Math.sin(clock.elapsedTime * 83)
    // Materials are reached through the meshes: hook values themselves stay unmodified.
    if (outerMesh.current) (outerMesh.current.material as MeshBasicMaterial).opacity = 0.16 * throttle * flicker
    if (coreMesh.current) (coreMesh.current.material as MeshBasicMaterial).opacity = 0.45 * throttle * flicker
    for (const plume of [outer.current, core.current]) {
      if (!plume) continue
      plume.visible = throttle > 0.01
      plume.scale.set(1, 0.4 + 0.6 * throttle, 1)
    }
    if (throat.current) throat.current.visible = throttle > 0.01
  })

  return (
    <group>
      <StrutInstances struts={frame} material={materials.aluminium} />
      {/* Gimbal ring, two gimbal actuators, injector dome, combustion chamber. */}
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.graphite} castShadow>
        <torusGeometry args={[0.18, 0.022, 8, 28]} />
      </mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.3, 0.78, Math.sin(a) * 0.3]} rotation={[a === 0 ? 0 : 0.5, 0, a === 0 ? 0.5 : 0]} material={materials.aluminium} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.16, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.84, 0]} material={materials.aluminium} castShadow>
        <sphereGeometry args={[0.13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.76, 0]} material={materials.nozzle} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.16, 20]} />
      </mesh>
      {/* Thermal blanket band around the chamber. */}
      <mesh position={[0, 0.79, 0]} material={materials.ceramic}>
        <cylinderGeometry args={[0.138, 0.138, 0.06, 20]} />
      </mesh>
      <mesh geometry={nozzle} position={[0, THROAT_Y, 0]} material={materials.nozzle} castShadow />
      <mesh position={[0, EXIT_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.graphite}>
        <torusGeometry args={[EXIT_R, 0.014, 6, 32]} />
      </mesh>
      {feeds.map((points) => (
        <CableRun key={points[0].join()} points={points} radiusM={0.016} material={materials.aluminium} />
      ))}

      {/* Plume (no shadows, additive) and throat glow. */}
      <mesh ref={throat} position={[0, THROAT_Y - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color="#fff1d6" toneMapped={false} />
      </mesh>
      {/* Plume groups scale from the nozzle exit, so the plume stays attached as it grows. */}
      <group ref={outer} name="engine-plume" position={[0, EXIT_Y, 0]} visible={false}>
        <mesh ref={outerMesh} material={plumeOuter} position={[0, -1.5, 0]}>
          <cylinderGeometry args={[EXIT_R * 0.95, 1.5, 3, 24, 1, true]} />
        </mesh>
      </group>
      <group ref={core} position={[0, EXIT_Y, 0]} visible={false}>
        <mesh ref={coreMesh} material={plumeCore} position={[0, -0.55, 0]}>
          <cylinderGeometry args={[EXIT_R * 0.7, 0.08, 1.1, 20, 1, true]} />
        </mesh>
      </group>
    </group>
  )
}
