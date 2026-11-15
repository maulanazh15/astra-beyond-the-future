import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { telescopeDeployment } from '../../animations/missionTimeline'
import { useDisposable } from '../../hooks/useDisposable'
import { useEasedValue } from '../../hooks/useEasedValue'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import type { LcrtLayout } from '../../utilities/lcrtLayout'
import { CANISTER_RADIUS_M, cableCount, reflectorScale, telescopeRig } from '../../utilities/lcrtRig'
import type { TelescopeRig } from '../../utilities/lcrtRig'
import type { Strut } from '../../utilities/struts'
import { trussTower } from '../../utilities/struts'
import { BeaconLight } from '../BeaconLight'
import { DynamicStruts } from '../DynamicStruts'
import { paraboloid } from '../geometry'
import { BeveledBox, Fasteners } from '../spacecraft/parts'
import { StrutInstances } from '../StrutInstances'
import { ReceiverCabin } from './ReceiverCabin'

const RIBS = 24
const HOOPS = [0.25, 0.5, 0.75]
const PETALS = 8

/** Radial ribs following the paraboloid, in the reflector's unit frame (vertex at the origin). */
function reflectorRibs(radiusM: number, sagM: number): Strut[] {
  const struts: Strut[] = []
  const point = (a: number, f: number): Vec3 => [Math.cos(a) * radiusM * f, sagM * f * f, Math.sin(a) * radiusM * f]
  for (let i = 0; i < RIBS; i += 1) {
    const a = (i / RIBS) * Math.PI * 2
    // Every other rib starts further out: the hub would be a solid knot otherwise.
    const start = i % 2 === 0 ? 0.05 : 0.25
    const segments = 8
    for (let k = 0; k < segments; k += 1) {
      const f0 = start + ((1 - start) * k) / segments
      const f1 = start + ((1 - start) * (k + 1)) / segments
      struts.push({ from: point(a, f0), to: point(a, f1), radiusM: 0.04 })
    }
  }
  return struts
}

export type LCRTelescopeProps = {
  layout: LcrtLayout
  materials: SpacecraftMaterials
  /** Construction progress, 0–1: anchors → towers → cables → reflector → receiver. */
  deployment?: number
  /** Receiver powered and observing (glowing feed ring, blinking tower beacons). */
  receiverActive?: boolean
  animate?: boolean
}

/**
 * Crater radio telescope inspired by the NIAC Lunar Crater Radio Telescope concept, scaled to the
 * scene crater: wire-mesh paraboloid on radial ribs, suspended from twelve rim anchors and three
 * rim towers, receiver hung at the focal point. Folds into a canister on the crater floor.
 */
export function LCRTelescope({ layout, materials, deployment = 1, receiverActive = false, animate = true }: LCRTelescopeProps) {
  const value = useEasedValue(deployment, animate, 1.1)
  const dish = useDisposable(() => paraboloid(layout.dishRadiusM, layout.dishSagM, 64, 24), [layout.dishRadiusM, layout.dishSagM])
  const ribs = useMemo(() => reflectorRibs(layout.dishRadiusM, layout.dishSagM), [layout.dishRadiusM, layout.dishSagM])
  const tower = useMemo(() => trussTower([0, 0, 0], layout.towerHeightM, 1.8, 0.5, 7), [layout.towerHeightM])
  const rimNodes = useMemo(
    () => Array.from({ length: RIBS }, (_, i): Vec3 => [Math.cos((i / RIBS) * Math.PI * 2) * layout.dishRadiusM, layout.dishSagM, Math.sin((i / RIBS) * Math.PI * 2) * layout.dishRadiusM]),
    [layout.dishRadiusM, layout.dishSagM],
  )
  const canisterHeight = Math.max(0.6, layout.dishVertexY - layout.floorY)

  const rig = useRef<{ value: number; rig: TelescopeRig }>({ value: -1, rig: telescopeRig(layout, telescopeDeployment(deployment)) })
  const drawn = useRef(-1)
  // First-render placement; afterwards the frame loop moves the receiver.
  const initialReceiver = useMemo(() => telescopeRig(layout, telescopeDeployment(deployment)).receiver, [layout, deployment])
  const reflector = useRef<Group>(null)
  const towers = useRef<(Group | null)[]>([])
  const beacons = useRef<(Group | null)[]>([])
  const anchors = useRef<(Group | null)[]>([])
  const petals = useRef<(Group | null)[]>([])
  const receiver = useRef<Group>(null)

  useFrame(() => {
    const v = value.current
    if (v === rig.current.value) return
    const d = telescopeDeployment(v)
    const next = telescopeRig(layout, d)
    rig.current = { value: v, rig: next }
    const s = next.reflectorScale
    if (reflector.current) reflector.current.scale.set(s, s * s, s)
    towers.current.forEach((t) => t?.scale.set(1, Math.max(0.04, d.towers), 1))
    beacons.current.forEach((b, i) => {
      if (!b) return
      b.position.y = next.towerTops[i][1] - layout.towerBases[i][1] + 0.15
      b.visible = d.towers > 0.98
    })
    anchors.current.forEach((a, i) => {
      if (!a) return
      // The rover installs anchors one after another.
      const k = Math.min(1, Math.max(0, d.anchors * layout.anchors.length - i))
      a.visible = k > 0
      a.scale.setScalar(Math.max(0.001, k))
    })
    // Canister petals open as the mesh unfurls, then fold flat.
    petals.current.forEach((p) => p && (p.rotation.z = -Math.min(1, d.reflector * 3) * 1.9))
    if (receiver.current) receiver.current.position.set(...next.receiver)
  })

  const cables = () => {
    if (drawn.current === rig.current.value) return null
    drawn.current = rig.current.value
    return rig.current.rig.cables
  }

  const { center } = layout
  return (
    <group>
      {/* Stowed reflector canister on the crater floor, with petal doors. */}
      <group position={[center.x, layout.floorY, center.z]}>
        <mesh position={[0, canisterHeight / 2, 0]} material={materials.white} castShadow receiveShadow>
          <cylinderGeometry args={[CANISTER_RADIUS_M, CANISTER_RADIUS_M * 1.08, canisterHeight, 24]} />
        </mesh>
        {[0.15, canisterHeight - 0.12].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={materials.graphite}>
            <cylinderGeometry args={[CANISTER_RADIUS_M * 1.04, CANISTER_RADIUS_M * 1.06, 0.1, 24]} />
          </mesh>
        ))}
        {Array.from({ length: PETALS }, (_, i) => {
          const a = (i / PETALS) * Math.PI * 2
          return (
            <group key={i} rotation={[0, -a, 0]}>
              <group
                ref={(g) => {
                  petals.current[i] = g
                }}
                position={[CANISTER_RADIUS_M * 0.95, canisterHeight, 0]}
              >
                <BeveledBox size={[0.85, 0.04, 0.72]} position={[-0.42, 0.02, 0]} material={materials.mli} bevelM={0.01} />
              </group>
            </group>
          )
        })}
      </group>

      {/* Reflector: wire mesh on radial ribs and hoops, scaled about its vertex as it unfurls. */}
      <group ref={reflector} name="telescope-reflector" position={[center.x, layout.dishVertexY, center.z]} scale={[reflectorScale(0), reflectorScale(0) ** 2, reflectorScale(0)]}>
        <mesh geometry={dish} material={materials.wireMesh} castShadow receiveShadow />
        <StrutInstances struts={ribs} material={materials.aluminium} />
        {HOOPS.map((f) => (
          <mesh key={f} position={[0, layout.dishSagM * f * f, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.cable}>
            <torusGeometry args={[layout.dishRadiusM * f, 0.035, 6, 96]} />
          </mesh>
        ))}
        <mesh position={[0, layout.dishSagM, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.aluminium} castShadow>
          <torusGeometry args={[layout.dishRadiusM, 0.1, 8, 128]} />
        </mesh>
        <Fasteners points={rimNodes} radiusM={0.16} material={materials.graphite} />
        {/* Central hub where the ribs converge. */}
        <mesh position={[0, 0.08, 0]} material={materials.graphite}>
          <cylinderGeometry args={[0.9, 1.1, 0.25, 16]} />
        </mesh>
      </group>

      {/* Rim towers: lattice masts that telescope up, with footings and cable winches. */}
      {layout.towerBases.map((base, i) => (
        <group key={base.join()} position={base}>
          <BeveledBox size={[2.4, 0.18, 2.4]} position={[0, 0.05, 0]} material={materials.graphite} bevelM={0.04} />
          <group rotation={[0, -Math.atan2(base[2] - center.z, base[0] - center.x), 0]}>
            {/* Winch drum: the robotic interface rovers dock to when tensioning cables. */}
            <group position={[1.6, 0.45, 0]}>
              <BeveledBox size={[0.6, 0.5, 0.9]} position={[0, -0.1, 0]} material={materials.white} bevelM={0.04} />
              <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.cable}>
                <cylinderGeometry args={[0.22, 0.22, 0.7, 18]} />
              </mesh>
              <BeveledBox size={[0.04, 0.2, 0.3]} position={[0.32, 0, 0]} material={materials.accent} bevelM={0.01} />
            </group>
          </group>
          <group
            ref={(g) => {
              towers.current[i] = g
            }}
          >
            <StrutInstances struts={tower} material={materials.aluminium} />
          </group>
          <group
            ref={(g) => {
              beacons.current[i] = g
            }}
            position={[0, layout.towerHeightM + 0.15, 0]}
          >
            <BeaconLight positionM={[0, 0, 0]} radiusM={0.22} animate={animate} timing={{ periodS: receiverActive ? 1.6 : 3.2 }} />
          </group>
        </group>
      ))}

      {/* Rim anchors: base plate, drilled anchor head, cable eye, and a cyan docking target for the rover. */}
      {layout.anchors.map((p, i) => {
        const outward = Math.atan2(p[2] - center.z, p[0] - center.x)
        return (
          <group
            key={p.join()}
            ref={(g) => {
              anchors.current[i] = g
            }}
            position={p}
            rotation={[0, -outward, 0]}
          >
            <BeveledBox size={[0.7, 0.1, 0.7]} position={[0, 0.03, 0]} material={materials.graphite} bevelM={0.02} />
            <mesh position={[0, 0.2, 0]} material={materials.aluminium} castShadow>
              <cylinderGeometry args={[0.12, 0.16, 0.3, 12]} />
            </mesh>
            <mesh position={[-0.08, 0.4, 0]} material={materials.aluminium} castShadow>
              <torusGeometry args={[0.09, 0.025, 8, 16]} />
            </mesh>
            <BeveledBox size={[0.04, 0.16, 0.3]} position={[0.37, 0.12, 0]} material={materials.accent} bevelM={0.01} />
          </group>
        )
      })}

      <DynamicStruts count={cableCount(layout)} source={cables} material={materials.cable} radialSegments={5} />

      <group ref={receiver} name="telescope-receiver" position={initialReceiver}>
        <ReceiverCabin materials={materials} active={receiverActive} animate={animate} />
      </group>
    </group>
  )
}
