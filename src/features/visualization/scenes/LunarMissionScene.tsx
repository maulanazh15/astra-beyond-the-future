import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MissionVisualState } from '../animations/missionTimeline'
import { CameraFocus } from '../components/CameraFocus'
import type { CameraFocusTarget } from '../components/CameraFocus'
import { ReplaceableModel } from '../components/ReplaceableModel'
import { OrbitControls } from '../components/OrbitControls'
import { SceneCamera } from '../components/SceneCamera'
import { SceneLighting } from '../components/SceneLighting'
import { ACCENT_CYAN, createSpacecraftMaterials, disposeMaterials } from '../materials/spacecraftMaterials'
import { LunarLander } from '../models/lander/LunarLander'
import { LCRTelescope } from '../models/telescope/LCRTelescope'
import type { Vec3 } from '../types/scene'
import type { MissionAssetId } from '../utilities/missionAssets'
import { missionAssetInfo } from '../utilities/missionAssets'
import type { MissionWorld } from '../utilities/missionWorld'
import { LunarEnvironment } from './LunarEnvironment'
import { RoverController } from './RoverController'

export type LunarMissionSceneProps = {
  world: MissionWorld
  visual: MissionVisualState
  earthVisible: boolean
  animate: boolean
  hidden?: ReadonlySet<MissionAssetId>
  selected?: MissionAssetId | null
  onSelect?: (id: MissionAssetId) => void
  /** Changing this resets the camera to the overview framing. */
  resetKey?: number
}

/** Pointer cursor over selectable hardware (no-op outside a browser). */
function setCursor(cursor: string) {
  if (typeof document !== 'undefined') document.body.style.cursor = cursor
}

/** Pulsing cyan ring on the ground under the selected asset; follows moving assets. */
function SelectionMarker({ at, radiusM }: { at: () => Vec3; radiusM: number }) {
  const mesh = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const [x, y, z] = at()
    m.position.set(x, y, z)
    ;(m.material as MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(clock.elapsedTime * 3)
  })
  return (
    <mesh ref={mesh} name="selection-marker" rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <ringGeometry args={[radiusM, radiusM + Math.max(0.06, radiusM * 0.03), 96]} />
      <meshBasicMaterial color={ACCENT_CYAN} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/**
 * LUNAR ECHO surface scene: lander on its pad, the crater radio telescope, and the construction
 * rover, all driven by one `MissionVisualState`. Positions come from the world layout.
 */
export function LunarMissionScene({ world, visual, earthVisible, animate, hidden = new Set(), selected = null, onSelect, resetKey = 0 }: LunarMissionSceneProps) {
  const materials = useMemo(() => createSpacecraftMaterials(), [])
  useLayoutEffect(() => () => disposeMaterials(materials), [materials])
  const controls = useRef<ThreeOrbitControls | null>(null)
  const roverPosition = useRef<Vec3>(world.layout.egressPath[0])
  const { layout, lcrt } = world

  const select = (id: MissionAssetId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect?.(id)
  }
  const hover = onSelect
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setCursor('pointer')
        },
        onPointerOut: () => setCursor(''),
      }
    : {}
  useLayoutEffect(() => () => setCursor(''), [])

  const focus: CameraFocusTarget | null =
    selected === 'rover'
      ? { id: 'rover', target: () => roverPosition.current, ...layout.focus.rover }
      : selected
        ? { id: selected, target: () => layout.focus[selected].targetM, ...layout.focus[selected] }
        : null
  const markerAt: Record<MissionAssetId, () => Vec3> = {
    lander: () => [layout.lander.positionM[0], layout.lander.positionM[1] + 0.08, layout.lander.positionM[2]],
    telescope: () => [lcrt.center.x, lcrt.dishVertexY + lcrt.dishSagM + 0.3, lcrt.center.z],
    rover: () => [roverPosition.current[0], roverPosition.current[1] - 0.42, roverPosition.current[2]],
  }
  const markerRadius: Record<MissionAssetId, number> = { lander: 3.3, telescope: lcrt.dishRadiusM + 1.5, rover: 1.25 }

  return (
    <>
      <SceneCamera key={`cam-${resetKey}`} positionM={layout.overview.positionM} targetM={layout.overview.targetM} />
      <OrbitControls key={`orbit-${resetKey}`} controlsRef={controls} target={layout.overview.targetM} minDistanceM={3} maxDistanceM={150} minElevationDeg={4} />
      <CameraFocus controls={controls} focus={focus} defaultMinDistanceM={3} />
      {/* Night: the sun is down; a faint residual light keeps the hardware readable. */}
      <SceneLighting shadowExtentM={80} sunIntensity={visual.night ? 0.35 : 3.2} />
      <LunarEnvironment terrain={world.terrain} rocks={world.rocks} earthVisible={earthVisible} animate={animate} />

      {visual.landerVisible && (
        <group name="lander" position={layout.lander.positionM} rotation={[0, layout.lander.headingRad, 0]} visible={!hidden.has('lander')} onClick={select('lander')} {...hover}>
          <ReplaceableModel assetId={missionAssetInfo('lander', lcrt).modelAssetId}>
            <LunarLander materials={materials} landing={visual.landing} roverEgress={visual.roverEgress} animate={animate} />
          </ReplaceableModel>
        </group>
      )}
      {visual.telescopeVisible && (
        <group name="telescope" visible={!hidden.has('telescope')} onClick={select('telescope')} {...hover}>
          <ReplaceableModel assetId={missionAssetInfo('telescope', lcrt).modelAssetId}>
            <LCRTelescope layout={lcrt} materials={materials} deployment={visual.telescope} receiverActive={visual.receiverActive} animate={animate} />
          </ReplaceableModel>
        </group>
      )}
      {visual.roverPresent && visual.landerVisible && (
        <group name="rover" visible={!hidden.has('rover')} onClick={select('rover')} {...hover}>
          <RoverController layout={layout} terrain={world.terrain} visual={visual} materials={materials} animate={animate} onMove={(p) => {
              roverPosition.current = p
            }} />
        </group>
      )}
      {selected && !hidden.has(selected) && <SelectionMarker key={selected} at={markerAt[selected]} radiusM={markerRadius[selected]} />}
    </>
  )
}
