import type { ComponentCatalog, DesignEntry, DesignSummary } from '../../types/component'
import { findComponent } from '../design/designEntries'

/** Aggregates design entries into resource totals. Unknown component ids are ignored. */
export function summarizeDesign(entries: DesignEntry[], catalog: ComponentCatalog): DesignSummary {
  const summary: DesignSummary = {
    unitCount: 0,
    massKg: 0,
    costMUsd: 0,
    powerGenerationW: 0,
    powerDemandW: 0,
    netPowerW: 0,
    energyStorageWh: 0,
    propellantCapacityKg: 0,
    dataRateMbps: 0,
    dataStorageGb: 0,
    dataGenerationGbPerDay: 0,
    nightGenerationW: 0,
    powerDemandByCategoryW: {},
    reliability: 1,
    unitsByCategory: {},
  }

  for (const entry of entries) {
    const component = findComponent(catalog, entry.componentId)
    if (!component || entry.quantity <= 0) continue
    const qty = entry.quantity
    const category = component.category
    summary.unitCount += qty
    summary.massKg += component.massKg * qty
    summary.costMUsd += component.costMUsd * qty
    summary.powerGenerationW += component.powerGenerationW * qty
    summary.powerDemandW += component.powerDemandW * qty
    summary.energyStorageWh += (component.energyStorageWh ?? 0) * qty
    summary.propellantCapacityKg += (component.propellantCapacityKg ?? 0) * qty
    summary.dataRateMbps += (component.dataRateMbps ?? 0) * qty
    summary.dataStorageGb += (component.dataStorageGb ?? 0) * qty
    summary.dataGenerationGbPerDay += (component.dataGenerationGbPerDay ?? 0) * qty
    if (component.generatesDuringNight) summary.nightGenerationW += component.powerGenerationW * qty
    summary.powerDemandByCategoryW[category] =
      (summary.powerDemandByCategoryW[category] ?? 0) + component.powerDemandW * qty
    summary.reliability *= component.reliability ** qty
    summary.unitsByCategory[category] = (summary.unitsByCategory[category] ?? 0) + qty
  }

  summary.netPowerW = summary.powerGenerationW - summary.powerDemandW
  if (summary.unitCount === 0) summary.reliability = 0
  return summary
}
