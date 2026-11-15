import type { ComponentCatalog, ComponentCategory, DesignEntry } from '../../../types/component'
import type { Vec3 } from '../types/scene'
import { categoryFallbackVisuals, componentVisuals } from './componentVisuals'
import type { ModuleKind, MountType, VisualPart } from './componentVisuals'

/**
 * Turns the player's design (the single source of truth) into placed 3D modules.
 * Pure and deterministic: same entries, same assembly. Units in meters; origin on the ground
 * under the spacecraft's center, +Y up, side face 0 facing +X.
 */

export type BusDims = { radiusM: number; heightM: number; baseY: number }

export type SpacecraftModule = {
  /** Stable, unique id: component, unit number, part. */
  key: string
  /** The design component this module shows; undefined only for structural connections. */
  componentId?: string
  category: ComponentCategory | 'structure'
  kind: ModuleKind
  variant: string
  /** 0-based unit number among installed units of this component. */
  unitIndex: number
  position: Vec3
  /** Rotation about Y (radians) so the module's local +X points away from the bus. */
  rotationY: number
  mount: MountType
}

export type SpacecraftAssembly = {
  /** Bus variant, or null when no bus is installed (a bare structural frame is shown). */
  busVariant: string | null
  dims: BusDims
  /** Multi-layer insulation installed: the bus is wrapped in gold foil instead of white panels. */
  insulated: boolean
  /** Landing gear variant: 'legs', 'crush', 'legs+crush', or null (shown on a ground stand). */
  gear: string | null
  modules: SpacecraftModule[]
  /** Installed components with no free mounting point (shown in the UI, not in 3D). */
  unplaced: string[]
  /** Design entries whose component id is not in the catalog. */
  unknown: string[]
}

const BUS_SIZES: Record<string, { radiusM: number; heightM: number }> = {
  compact: { radiusM: 1.0, heightM: 0.85 },
  standard: { radiusM: 1.2, heightM: 1.0 },
  cargo: { radiusM: 1.45, heightM: 1.1 },
}
/** Height of the bus floor above the ground: leg stroke plus engine clearance. */
const BASE_Y_M = 1.1
const FACE_COUNT = 8
const CATEGORY_ORDER: ComponentCategory[] = ['bus', 'thermal', 'propulsion', 'landing', 'power', 'battery', 'communication', 'payload', 'robotics']

export function faceAngle(face: number): number {
  return (face * 2 * Math.PI) / FACE_COUNT
}

export function visualPartsFor(componentId: string, category: ComponentCategory): VisualPart[] {
  return componentVisuals[componentId] ?? [categoryFallbackVisuals[category]]
}

export function assembleSpacecraft(entries: DesignEntry[], catalog: ComponentCatalog): SpacecraftAssembly {
  // Expand the design into individual units, in a fixed category order for stable slotting.
  const unknown: string[] = []
  const units: { componentId: string; category: ComponentCategory; unitIndex: number }[] = []
  for (const entry of entries) {
    const component = catalog.components.find((c) => c.id === entry.componentId)
    if (!component) {
      unknown.push(entry.componentId)
      continue
    }
    for (let i = 0; i < entry.quantity; i += 1) units.push({ componentId: component.id, category: component.category, unitIndex: i })
  }
  units.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

  const busUnit = units.find((u) => u.category === 'bus')
  const busVariant = busUnit ? visualPartsFor(busUnit.componentId, 'bus')[0].variant : null
  const size = BUS_SIZES[busVariant ?? 'compact'] ?? BUS_SIZES.compact
  const dims: BusDims = { ...size, baseY: BASE_Y_M }
  const apothem = dims.radiusM * Math.cos(Math.PI / FACE_COUNT)

  const ids = new Set(units.map((u) => u.componentId))
  const gear = ids.has('lnd-legs') && ids.has('lnd-crush') ? 'legs+crush' : ids.has('lnd-legs') ? 'legs' : ids.has('lnd-crush') ? 'crush' : null
  const insulated = units.some((u) => visualPartsFor(u.componentId, u.category).some((p) => p.mount === 'skin'))

  const used = { 'side-upper': new Set<number>(), 'side-lower': new Set<number>(), deck: new Set<number>() }
  const propulsionUnits = units.filter((u) => u.category === 'propulsion').length
  let propulsionIndex = 0
  const modules: SpacecraftModule[] = []
  const unplaced: string[] = []

  const deckPosition = (slot: number): Vec3 => {
    const top = dims.baseY + dims.heightM
    if (slot === 0) return [0, top, 0]
    const a = ((slot - 1) * Math.PI) / 3 + Math.PI / 6
    const r = dims.radiusM * 0.58
    return [Math.cos(a) * r, top, Math.sin(a) * r]
  }
  const sidePosition = (face: number, tier: 'side-upper' | 'side-lower'): Vec3 => {
    const a = faceAngle(face)
    const y = dims.baseY + dims.heightM * (tier === 'side-upper' ? 0.7 : 0.3)
    return [Math.cos(a) * apothem, y, Math.sin(a) * apothem]
  }

  for (const unit of units) {
    const parts = visualPartsFor(unit.componentId, unit.category)
    const isPropulsion = unit.category === 'propulsion'
    for (const part of parts) {
      const key = `${unit.componentId}#${unit.unitIndex}:${part.kind}`
      const base = { key, componentId: unit.componentId, category: unit.category, kind: part.kind, variant: part.variant, unitIndex: unit.unitIndex, mount: part.mount }
      if (part.mount === 'core') {
        if (unit === busUnit) modules.push({ ...base, position: [0, dims.baseY, 0], rotationY: 0 })
      } else if (part.mount === 'skin') {
        // Insulation changes the bus surface; no separate module.
      } else if (part.mount === 'gear') {
        // One gear assembly; a second gear component modifies it (see `gear`).
        if (!modules.some((m) => m.kind === 'landingGear')) modules.push({ ...base, position: [0, 0, 0], rotationY: 0 })
      } else if (part.mount === 'under') {
        // Twin propulsion units sit side by side under the bus.
        const offset = propulsionUnits > 1 ? (propulsionIndex === 0 ? -1 : 1) * dims.radiusM * 0.36 : 0
        modules.push({ ...base, position: [offset, dims.baseY, 0], rotationY: propulsionUnits > 1 && propulsionIndex > 0 ? Math.PI / 4 : 0 })
      } else if (part.mount === 'deck') {
        const slot = (part.deckSlots ?? [1, 2, 3, 4, 5, 6, 0]).find((s) => !used.deck.has(s))
        if (slot !== undefined) {
          used.deck.add(slot)
          const position = deckPosition(slot)
          // Face outward from the deck center (ring slots) or along +X (center).
          const rotationY = slot === 0 ? 0 : -Math.atan2(position[2], position[0])
          modules.push({ ...base, position, rotationY })
        } else unplaced.push(unit.componentId)
      } else {
        const tiers: ('side-upper' | 'side-lower')[] = part.mount === 'side-upper' ? ['side-upper', 'side-lower'] : ['side-lower', 'side-upper']
        const preferred = part.faces ?? [0, 1, 2, 3, 4, 5, 6, 7]
        let placed = false
        for (const tier of tiers) {
          const face = [...preferred, 0, 1, 2, 3, 4, 5, 6, 7].find((f) => !used[tier].has(f))
          if (face === undefined) continue
          used[tier].add(face)
          modules.push({ ...base, mount: tier, position: sidePosition(face, tier), rotationY: -faceAngle(face) })
          placed = true
          break
        }
        if (!placed) unplaced.push(unit.componentId)
      }
    }
    if (isPropulsion) propulsionIndex += 1
  }

  // Structural connections are always present: they tie the modules to the bus.
  modules.push({ key: 'structure:frame', category: 'structure', kind: 'structure', variant: gear ? 'frame' : 'frame+stand', unitIndex: 0, position: [0, 0, 0], rotationY: 0, mount: 'core' })

  return { busVariant, dims, insulated, gear, modules, unplaced, unknown }
}

/** Camera framing that scales with the bus so every configuration fits the view. */
export function hangarFraming(assembly: SpacecraftAssembly): { position: Vec3; target: Vec3 } {
  const { radiusM, heightM, baseY } = assembly.dims
  const targetY = baseY + heightM * 0.25
  // Wide enough for deployed solar wings (~3 panel lengths beyond the bus).
  const distance = radiusM * 4.2 + 4.2
  return { position: [distance * 0.78, targetY + distance * 0.42, distance * 0.62], target: [0, targetY, 0] }
}
