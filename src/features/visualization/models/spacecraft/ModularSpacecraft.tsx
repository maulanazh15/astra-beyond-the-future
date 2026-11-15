import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Box3, Box3Helper, Color } from 'three'
import type { Group, Object3D } from 'three'
import { moduleAssetFor } from '../../assetRegistry'
import { ModelViewer } from '../../components/ModelViewer'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { ACCENT_CYAN } from '../../materials/spacecraftMaterials'
import type { ModuleKind } from '../../utilities/componentVisuals'
import type { SpacecraftAssembly, SpacecraftModule } from '../../utilities/spacecraftAssembly'
import { BusModule } from './BusModule'
import { HighGainDish, LowGainAntenna, OpticalTerminal } from './Communication'
import { HazardSensor, LandingGear } from './Landing'
import { DipoleArray, MeshReflector, ReceiverSuite } from './Payload'
import { BatteryPack, FuelCell, RpsGenerator, SolarWing } from './Power'
import { MainEngine, PropulsionTanks } from './Propulsion'
import { Rover, RoboticArm, Winch } from './Robotics'
import { StructuralFrame } from './StructuralFrame'
import { HeaterSystem, RadiatorPanel, RhuCluster } from './Thermal'
import type { ModuleProps } from './types'

type RenderContext = ModuleProps & { module: SpacecraftModule; assembly: SpacecraftAssembly }

/** Procedural model for each module kind. A GLB asset can replace any of them (see moduleAssetFor). */
const renderers: Record<ModuleKind, (ctx: RenderContext) => JSX.Element> = {
  bus: (c) => <BusModule {...c} insulated={c.assembly.insulated} />,
  propulsionTanks: (c) => <PropulsionTanks {...c} twin={c.module.position[0] !== 0} />,
  mainEngine: (c) => <MainEngine {...c} />,
  solarWing: (c) => <SolarWing {...c} />,
  rpsGenerator: (c) => <RpsGenerator {...c} />,
  batteryPack: (c) => <BatteryPack {...c} />,
  fuelCell: (c) => <FuelCell {...c} />,
  lowGainAntenna: (c) => <LowGainAntenna {...c} />,
  highGainDish: (c) => <HighGainDish {...c} />,
  opticalTerminal: (c) => <OpticalTerminal {...c} />,
  dipoleArray: (c) => <DipoleArray {...c} />,
  meshReflector: (c) => <MeshReflector {...c} />,
  receiverSuite: (c) => <ReceiverSuite {...c} />,
  landingGear: (c) => <LandingGear {...c} variant={c.assembly.gear ?? c.variant} />,
  hazardSensor: (c) => <HazardSensor {...c} />,
  heaterSystem: (c) => <HeaterSystem {...c} />,
  rhuCluster: (c) => <RhuCluster {...c} />,
  radiatorPanel: (c) => <RadiatorPanel {...c} />,
  rover: (c) => <Rover {...c} />,
  winch: (c) => <Winch {...c} />,
  roboticArm: (c) => <RoboticArm {...c} />,
  structure: (c) => <StructuralFrame {...c} />,
}

type ModularSpacecraftProps = {
  assembly: SpacecraftAssembly
  materials: SpacecraftMaterials
  /** Categories hidden by the player's visibility toggles. */
  hidden?: ReadonlySet<string>
  selectedKey?: string | null
  onSelect?: (key: string) => void
}

/**
 * Draws an assembled spacecraft. Everything shown comes from `assembly`, which is derived from the
 * player's design; this component never adds hardware of its own. Place it at the scene origin
 * without transforms (the selection box is computed in world space).
 */
export function ModularSpacecraft({ assembly, materials, hidden, selectedKey, onSelect }: ModularSpacecraftProps) {
  const nodes = useRef(new Map<string, Object3D>())
  const [selectionBox, setSelectionBox] = useState<Box3 | null>(null)
  const visible = useMemo(() => assembly.modules.filter((mod) => !hidden?.has(mod.category)), [assembly, hidden])
  // Never leave a pointer cursor behind if a hovered module disappears.
  useLayoutEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  useLayoutEffect(() => {
    const node = selectedKey ? nodes.current.get(selectedKey) : undefined
    setSelectionBox(node ? new Box3().setFromObject(node).expandByScalar(0.04) : null)
  }, [selectedKey, visible])

  return (
    <group>
      {visible.map((module) => (
        <ModuleNode
          key={module.key}
          module={module}
          register={(obj) => {
            if (obj) nodes.current.set(module.key, obj)
            else nodes.current.delete(module.key)
          }}
          onSelect={onSelect}
        >
          <ModuleContent ctx={{ module, assembly, materials, dims: assembly.dims, variant: module.variant }} />
        </ModuleNode>
      ))}
      {selectionBox && <SelectionBox box={selectionBox} />}
    </group>
  )
}

function ModuleContent({ ctx }: { ctx: RenderContext }) {
  const procedural = renderers[ctx.module.kind](ctx)
  const asset = ctx.module.componentId ? moduleAssetFor(ctx.module.componentId) : undefined
  // A finished GLB replaces the procedural model; the procedural one remains the loading/error fallback.
  return asset ? <ModelViewer asset={asset} placeholder={procedural} /> : procedural
}

type ModuleNodeProps = {
  module: SpacecraftModule
  register: (obj: Group | null) => void
  onSelect?: (key: string) => void
  children: JSX.Element
}

function ModuleNode({ module, register, onSelect, children }: ModuleNodeProps) {
  const handlers = onSelect && {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect(module.key)
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      document.body.style.cursor = ''
    },
  }
  return (
    <group ref={register} position={module.position} rotation={[0, module.rotationY, 0]} {...handlers}>
      {children}
    </group>
  )
}

function SelectionBox({ box }: { box: Box3 }) {
  const helper = useMemo(() => new Box3Helper(box, new Color(ACCENT_CYAN)), [box])
  useLayoutEffect(
    () => () => {
      helper.geometry.dispose()
      if (!Array.isArray(helper.material)) helper.material.dispose()
    },
    [helper],
  )
  return <primitive object={helper} raycast={() => null} />
}
