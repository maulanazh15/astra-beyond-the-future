import { useLayoutEffect, useMemo } from 'react'
import { OrbitControls } from '../components/OrbitControls'
import { SceneCamera } from '../components/SceneCamera'
import { StudioEnvironment } from '../components/StudioEnvironment'
import { ACCENT_CYAN, createSpacecraftMaterials, disposeMaterials } from '../materials/spacecraftMaterials'
import { ModularSpacecraft } from '../models/spacecraft/ModularSpacecraft'
import { hangarFraming } from '../utilities/spacecraftAssembly'
import type { SpacecraftAssembly } from '../utilities/spacecraftAssembly'

type SpacecraftHangarSceneProps = {
  assembly: SpacecraftAssembly
  hidden: ReadonlySet<string>
  selectedKey: string | null
  onSelect: (key: string) => void
  /** Changing this resets the camera to its default framing. */
  resetKey: number
}

/** Inspection bay: studio reflections, key and cyan rim light, a landing pad, the spacecraft. */
export function SpacecraftHangarScene({ assembly, hidden, selectedKey, onSelect, resetKey }: SpacecraftHangarSceneProps) {
  const materials = useMemo(() => createSpacecraftMaterials(), [])
  useLayoutEffect(() => () => disposeMaterials(materials), [materials])
  const framing = hangarFraming(assembly)

  return (
    <>
      <SceneCamera key={`cam-${resetKey}`} positionM={framing.position} targetM={framing.target} fovDeg={38} portraitFovDeg={58} />
      <OrbitControls key={`orbit-${resetKey}`} target={framing.target} minDistanceM={2.5} maxDistanceM={22} minElevationDeg={2} />
      <StudioEnvironment />
      <directionalLight position={[6, 9, 5]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[-6, 3, -7]} intensity={1.4} color={ACCENT_CYAN} />
      <ambientLight intensity={0.08} />
      {/* Landing pad: dark composite disc with a cyan guide ring. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#141a24" roughness={0.85} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[assembly.dims.radiusM * 2.25, assembly.dims.radiusM * 2.25 + 0.04, 96]} />
        <meshBasicMaterial color={ACCENT_CYAN} toneMapped={false} />
      </mesh>
      <ModularSpacecraft assembly={assembly} materials={materials} hidden={hidden} selectedKey={selectedKey} onSelect={onSelect} />
    </>
  )
}
