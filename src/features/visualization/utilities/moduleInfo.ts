import type { ComponentCatalog, DesignEntry } from '../../../types/component'
import type { SpacecraftModule } from './spacecraftAssembly'

export type ModuleInfo = {
  title: string
  categoryLabel: string
  /** Which visual part of the component this is (propulsion units have two). */
  partLabel?: string
  description: string
  unitsInstalled: number
  stats: { label: string; value: string }[]
}

const PART_LABELS: Partial<Record<SpacecraftModule['kind'], string>> = {
  propulsionTanks: 'Propulsion module (tanks)',
  mainEngine: 'Main engine',
  landingGear: 'Landing gear',
}

/** Player-facing description of a selected module, built only from catalog and design data. */
export function describeModule(module: SpacecraftModule, catalog: ComponentCatalog, entries: DesignEntry[]): ModuleInfo {
  if (!module.componentId) {
    return {
      title: 'Structural connections',
      categoryLabel: 'Structure',
      description: 'Thrust ring, gussets, brackets and fasteners that carry loads from every module into the bus.',
      unitsInstalled: 1,
      stats: [],
    }
  }
  const component = catalog.components.find((c) => c.id === module.componentId)
  const category = catalog.categories.find((c) => c.id === component?.category)
  const units = entries.filter((e) => e.componentId === module.componentId).reduce((sum, e) => sum + e.quantity, 0)
  if (!component) {
    return { title: module.componentId, categoryLabel: 'Unknown', description: 'Not in the component library.', unitsInstalled: units, stats: [] }
  }
  const stats = [
    { label: 'Mass', value: `${component.massKg} kg` },
    { label: 'Cost', value: `$${component.costMUsd}M` },
    ...(component.powerGenerationW > 0 ? [{ label: 'Generates', value: `${component.powerGenerationW} W` }] : []),
    ...(component.powerDemandW > 0 ? [{ label: 'Draws', value: `${component.powerDemandW} W` }] : []),
    { label: 'Reliability', value: `${(component.reliability * 100).toFixed(1)}%` },
  ]
  return {
    title: component.name,
    categoryLabel: category?.label ?? component.category,
    partLabel: PART_LABELS[module.kind],
    description: component.description,
    unitsInstalled: units,
    stats,
  }
}
