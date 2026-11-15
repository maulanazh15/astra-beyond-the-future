import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Group } from 'three'
import { MISSION_EASE, telescopeDeployment } from '../../animations/missionTimeline'
import { InstancedAssembly } from '../../components/InstancedAssembly'
import { MergedStatic } from '../../components/MergedStatic'
import { useDisposable } from '../../hooks/useDisposable'
import { useEasedValue } from '../../hooks/useEasedValue'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import type { LcrtLayout } from '../../utilities/lcrtLayout'
import { CANISTER_RADIUS_M, WINCH_OFFSET_M, anchorInstallProgress, cableCount, defaultAnchorSchedule, reflectorScale, telescopeRig } from '../../utilities/lcrtRig'
import type { AnchorWindow, TelescopeRig } from '../../utilities/lcrtRig'
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
  /**
   * When each rim anchor is drilled, as windows of the anchor step (0–1), indexed like
   * `layout.anchors`. The scene passes the rover route's timing; default: one after another.
   */
  anchorSchedule?: readonly AnchorWindow[]
}

const Y_AXIS = new Vector3(0, 1, 0)
const ONE = new Vector3(1, 1, 1)
const bearingOf = (layout: LcrtLayout, p: Vec3) => Math.atan2(p[2] - layout.center.z, p[0] - layout.center.x)

/** Anchor `i` at its rim position, facing outward, grown to `k` (0 = not yet installed). */
function anchorMatrix(layout: LcrtLayout, i: number, k: number): Matrix4 {
  const p = layout.anchors[i]
  const q = new Quaternion().setFromAxisAngle(Y_AXIS, -bearingOf(layout, p))
  return new Matrix4().compose(new Vector3(...p), q, new Vector3().setScalar(Math.max(1e-4, k)))
}

/**
 * Crater radio telescope inspired by the NIAC Lunar Crater Radio Telescope concept, scaled to the
 * scene crater: wire-mesh paraboloid on radial ribs, suspended from twelve rim anchors and three
 * rim towers, receiver hung at the focal point. Folds into a canister on the crater floor.
 */
export function LCRTelescope({ layout, materials, deployment = 1, receiverActive = false, animate = true, anchorSchedule }: LCRTelescopeProps) {
  const value = useEasedValue(deployment, animate, MISSION_EASE.telescope)
  const [initial] = useState(deployment)
  // The structure reads the eased progress through a ref, so construction ticks never re-render it.
  return <TelescopeBody layout={layout} materials={materials} value={value} initial={initial} receiverActive={receiverActive} animate={animate} anchorSchedule={anchorSchedule} />
}

type TelescopeBodyProps = Omit<LCRTelescopeProps, 'deployment'> & { value: RefObject<number>; initial: number; receiverActive: boolean; animate: boolean }

const TelescopeBody = memo(function TelescopeBody({ layout, materials, value, initial, receiverActive, animate, anchorSchedule }: TelescopeBodyProps) {
  const dish = useDisposable(() => paraboloid(layout.dishRadiusM, layout.dishSagM, 64, 24), [layout.dishRadiusM, layout.dishSagM])
  const ribs = useMemo(() => reflectorRibs(layout.dishRadiusM, layout.dishSagM), [layout.dishRadiusM, layout.dishSagM])
  const tower = useMemo(() => trussTower([0, 0, 0], layout.towerHeightM, 1.8, 0.5, 7), [layout.towerHeightM])
  const rimNodes = useMemo(
    () => Array.from({ length: RIBS }, (_, i): Vec3 => [Math.cos((i / RIBS) * Math.PI * 2) * layout.dishRadiusM, layout.dishSagM, Math.sin((i / RIBS) * Math.PI * 2) * layout.dishRadiusM]),
    [layout.dishRadiusM, layout.dishSagM],
  )
  const canisterHeight = Math.max(0.6, layout.dishVertexY - layout.floorY)

  const rig = useRef<{ value: number; rig: TelescopeRig }>({ value: -1, rig: telescopeRig(layout, telescopeDeployment(initial)) })
  const drawn = useRef(-1)
  // First-render placement; afterwards the frame loop moves the receiver.
  const initialReceiver = useMemo(() => telescopeRig(layout, telescopeDeployment(initial)).receiver, [layout, initial])
  const reflector = useRef<Group>(null)
  const towers = useRef<(Group | null)[]>([])
  const beacons = useRef<(Group | null)[]>([])
  const anchorsDrawn = useRef(-1)
  const petalsDrawn = useRef(-1)
  const schedule = anchorSchedule ?? defaultAnchorSchedule(layout.anchors.length)
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
    if (receiver.current) receiver.current.position.set(...next.receiver)
  })

  // Each anchor grows out of the regolith while the rover drills it (see the anchor schedule).
  const anchorTransforms = (force: boolean) => {
    const a = telescopeDeployment(value.current).anchors
    if (!force && a === anchorsDrawn.current) return null
    anchorsDrawn.current = a
    return anchorInstallProgress(a, schedule).map((k, i) => anchorMatrix(layout, i, k))
  }
  // Canister petals open as the mesh unfurls, then fold flat.
  const petalTransforms = (force: boolean) => {
    const open = Math.min(1, telescopeDeployment(value.current).reflector * 3)
    if (!force && open === petalsDrawn.current) return null
    petalsDrawn.current = open
    return Array.from({ length: PETALS }, (_, i) =>
      new Matrix4()
        .makeRotationY(-(i / PETALS) * Math.PI * 2)
        .multiply(new Matrix4().makeTranslation(CANISTER_RADIUS_M * 0.95, canisterHeight, 0))
        .multiply(new Matrix4().makeRotationZ(-open * 1.9)),
    )
  }
  const towerBaseTransforms = (force: boolean) =>
    force ? layout.towerBases.map((b) => new Matrix4().compose(new Vector3(...b), new Quaternion().setFromAxisAngle(Y_AXIS, -bearingOf(layout, b)), ONE)) : null

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
        <MergedStatic>
          <mesh position={[0, canisterHeight / 2, 0]} material={materials.white} castShadow receiveShadow>
            <cylinderGeometry args={[CANISTER_RADIUS_M, CANISTER_RADIUS_M * 1.08, canisterHeight, 24]} />
          </mesh>
          {[0.15, canisterHeight - 0.12].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={materials.graphite}>
              <cylinderGeometry args={[CANISTER_RADIUS_M * 1.04, CANISTER_RADIUS_M * 1.06, 0.1, 24]} />
            </mesh>
          ))}
        </MergedStatic>
        <InstancedAssembly count={PETALS} transforms={petalTransforms} name="telescope-petals">
          <BeveledBox size={[0.85, 0.04, 0.72]} position={[-0.42, 0.02, 0]} material={materials.mli} bevelM={0.01} />
        </InstancedAssembly>
      </group>

      {/* Reflector: wire mesh on radial ribs and hoops, scaled about its vertex as it unfurls. */}
      <group ref={reflector} name="telescope-reflector" position={[center.x, layout.dishVertexY, center.z]} scale={[reflectorScale(0), reflectorScale(0) ** 2, reflectorScale(0)]}>
        <MergedStatic>
          <mesh geometry={dish} material={materials.wireMesh} castShadow receiveShadow />
          <mesh geometry={dish} material={materials.wireSheen} receiveShadow renderOrder={1} />
          <StrutInstances struts={ribs} material={materials.aluminium} />
          {HOOPS.map((f) => (
            <mesh key={f} position={[0, layout.dishSagM * f * f, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.cable}>
              <torusGeometry args={[layout.dishRadiusM * f, 0.05, 6, 96]} />
            </mesh>
          ))}
          <mesh position={[0, layout.dishSagM, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.aluminium} castShadow>
            <torusGeometry args={[layout.dishRadiusM, 0.16, 8, 128]} />
          </mesh>
          <Fasteners points={rimNodes} radiusM={0.16} material={materials.graphite} />
          {/* Central hub where the ribs converge. */}
          <mesh position={[0, 0.08, 0]} material={materials.graphite}>
            <cylinderGeometry args={[0.9, 1.1, 0.25, 16]} />
          </mesh>
        </MergedStatic>
      </group>

      {/* Rim towers: lattice masts that telescope up, with footings and cable winches. */}
      <InstancedAssembly count={layout.towerBases.length} transforms={towerBaseTransforms} name="telescope-tower-bases">
        <BeveledBox size={[2.4, 0.18, 2.4]} position={[0, 0.05, 0]} material={materials.graphite} bevelM={0.04} />
        {/* Winch drum: the robotic interface rovers dock to when tensioning cables (+X = outward). */}
        <group position={[WINCH_OFFSET_M, 0.45, 0]}>
          <BeveledBox size={[0.6, 0.5, 0.9]} position={[0, -0.1, 0]} material={materials.white} bevelM={0.04} />
          <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.cable}>
            <cylinderGeometry args={[0.22, 0.22, 0.7, 18]} />
          </mesh>
          <BeveledBox size={[0.04, 0.2, 0.3]} position={[0.32, 0, 0]} material={materials.accent} bevelM={0.01} />
        </group>
      </InstancedAssembly>
      {layout.towerBases.map((base, i) => (
        <group key={base.join()} position={base}>
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
      <InstancedAssembly count={layout.anchors.length} transforms={anchorTransforms} name="telescope-anchors">
        <BeveledBox size={[0.7, 0.1, 0.7]} position={[0, 0.03, 0]} material={materials.graphite} bevelM={0.02} />
        <mesh position={[0, 0.2, 0]} material={materials.aluminium} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.3, 12]} />
        </mesh>
        <mesh position={[-0.08, 0.4, 0]} material={materials.aluminium} castShadow>
          <torusGeometry args={[0.09, 0.025, 8, 16]} />
        </mesh>
        <BeveledBox size={[0.04, 0.16, 0.3]} position={[0.37, 0.12, 0]} material={materials.accent} bevelM={0.01} />
      </InstancedAssembly>

      <DynamicStruts count={cableCount(layout)} source={cables} material={materials.cable} radialSegments={5} />

      <group ref={receiver} name="telescope-receiver" position={initialReceiver}>
        <ReceiverCabin materials={materials} active={receiverActive} animate={animate} />
      </group>
    </group>
  )
})
