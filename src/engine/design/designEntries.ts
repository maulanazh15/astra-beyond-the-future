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

/** A way a (typically saved) design no longer fits the current component data. */
export type DesignIssue =
  | { kind: 'unknownComponent'; componentId: string; quantity: number }
  | {
      kind: 'categoryOverLimit'
      category: ComponentCategory
      unitCount: number
      maxUnits: number
      /** Installed entries of this category, in design order. */
      entries: DesignEntry[]
    }

/** Lists components missing from the catalog and categories above their unit limit. Pure. */
export function findDesignIssues(entries: DesignEntry[], catalog: ComponentCatalog): DesignIssue[] {
  const issues: DesignIssue[] = []
  for (const entry of entries) {
    if (!findComponent(catalog, entry.componentId)) {
      issues.push({ kind: 'unknownComponent', componentId: entry.componentId, quantity: entry.quantity })
    }
  }
  for (const definition of catalog.categories) {
    const inCategory = entries.filter((e) => findComponent(catalog, e.componentId)?.category === definition.id)
    const unitCount = inCategory.reduce((sum, e) => sum + e.quantity, 0)
    if (unitCount > definition.maxUnits) {
      issues.push({ kind: 'categoryOverLimit', category: definition.id, unitCount, maxUnits: definition.maxUnits, entries: inCategory })
    }
  }
  return issues
}

/**
 * Makes a design fit the current data: drops unknown components and removes units from
 * over-limit categories, starting with the most recently added entry. Valid designs are returned unchanged.
 */
export function repairDesign(entries: DesignEntry[], catalog: ComponentCatalog): DesignEntry[] {
  const issues = findDesignIssues(entries, catalog)
  if (issues.length === 0) return entries
  const overflow = new Map<ComponentCategory, number>()
  for (const issue of issues) {
    if (issue.kind === 'categoryOverLimit') overflow.set(issue.category, issue.unitCount - issue.maxUnits)
  }
  // Walk from the end so the earliest-added parts are kept.
  const kept: DesignEntry[] = []
  for (const entry of [...entries].reverse()) {
    const component = findComponent(catalog, entry.componentId)
    if (!component) continue
    const drop = Math.min(entry.quantity, overflow.get(component.category) ?? 0)
    if (drop > 0) overflow.set(component.category, (overflow.get(component.category) ?? 0) - drop)
    if (entry.quantity > drop) kept.unshift(drop > 0 ? { ...entry, quantity: entry.quantity - drop } : entry)
  }
  return kept
}
