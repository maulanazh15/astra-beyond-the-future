import type { ComponentCatalog, ComponentCategory, DesignEntry } from '../../types/component'

export function findComponent(catalog: ComponentCatalog, componentId: string) {
  return catalog.components.find((component) => component.id === componentId)
}

export function unitsInCategory(
  entries: DesignEntry[],
  category: ComponentCategory,
  catalog: ComponentCatalog,
): number {
  return entries.reduce(
    (sum, entry) =>
      findComponent(catalog, entry.componentId)?.category === category ? sum + entry.quantity : sum,
    0,
  )
}

export function quantityOf(entries: DesignEntry[], componentId: string): number {
  return entries.find((entry) => entry.componentId === componentId)?.quantity ?? 0
}

/** A component can be added while its category is below the per-spacecraft unit limit. */
export function canAddComponent(
  entries: DesignEntry[],
  componentId: string,
  catalog: ComponentCatalog,
): boolean {
  const component = findComponent(catalog, componentId)
  if (!component) return false
  const definition = catalog.categories.find((c) => c.id === component.category)
  const maxUnits = definition?.maxUnits ?? 0
  return unitsInCategory(entries, component.category, catalog) < maxUnits
}

/** Adds one unit. Returns the original array when the add is not allowed. */
export function addComponent(
  entries: DesignEntry[],
  componentId: string,
  catalog: ComponentCatalog,
): DesignEntry[] {
  if (!canAddComponent(entries, componentId, catalog)) return entries
  if (quantityOf(entries, componentId) === 0) return [...entries, { componentId, quantity: 1 }]
  return entries.map((entry) =>
    entry.componentId === componentId ? { ...entry, quantity: entry.quantity + 1 } : entry,
  )
}

/** Removes one unit; drops the entry when its quantity reaches zero. */
export function removeComponent(entries: DesignEntry[], componentId: string): DesignEntry[] {
  return entries
    .map((entry) =>
      entry.componentId === componentId ? { ...entry, quantity: entry.quantity - 1 } : entry,
    )
    .filter((entry) => entry.quantity > 0)
}

/** Removes every unit of a component. */
export function removeAllOf(entries: DesignEntry[], componentId: string): DesignEntry[] {
  return entries.filter((entry) => entry.componentId !== componentId)
}
