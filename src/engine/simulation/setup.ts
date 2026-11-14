import type { ComponentCatalog, ComponentCategory, DesignEntry, SpacecraftComponent } from '../../types/component'
import type { Mission } from '../../types/mission'
import type { SimPhaseId, SimulationConfig } from '../../types/simulation'
import type { GameplayAssumptions } from '../../types/validation'
import { findComponent } from '../design/designEntries'
import { summarizeDesign } from '../resources/summarizeDesign'
import { constructionDays, dailyDownlinkGb, requiredPropellantKg } from '../validation/derivedMetrics'
import type { ValidationInput } from '../validation/derivedMetrics'

export type SimulationInput = {
  mission: Mission
  entries: DesignEntry[]
  catalog: ComponentCatalog
  launchVehicle: ValidationInput['launchVehicle']
  orbit: ValidationInput['orbit']
  assumptions: GameplayAssumptions
  config: SimulationConfig
}

/** Everything fixed at launch. Computed once so each step stays cheap and deterministic. */
export type SimulationSetup = {
  mission: Mission
  config: SimulationConfig
  assumptions: GameplayAssumptions
  phaseDays: Record<'launch' | 'transit' | 'orbitalArrival' | 'landing', number>
  /** Robot-days of work needed per day of daylight; 0 means construction impossible. */
  constructionPercentPerDay: number
  startingBudgetMUsd: number
  usableBatteryWh: number
  propellantLoadedKg: number
  propellantRequiredKg: number
  /** Per-category power demand (W). */
  demandW: Partial<Record<ComponentCategory, number>>
  solarGenerationW: number
  nightGenerationW: number
  payloadDataGbPerDay: number
  downlinkGbPerDay: number
  dataStorageGb: number
  hasCommunication: boolean
  hasPayload: boolean
  heatRejectionW: number
  /** Lowest reliability among installed units of a category (1 when none installed). */
  minReliability: Partial<Record<ComponentCategory, number>>
  /** Lowest reliability among daytime-only solar generators (1 when none). */
  solarReliability: number
  baseRiskPercent: number
}

function installed(entries: DesignEntry[], catalog: ComponentCatalog): SpacecraftComponent[] {
  return entries.flatMap((entry) => {
    const component = findComponent(catalog, entry.componentId)
    return component && entry.quantity > 0 ? Array<SpacecraftComponent>(entry.quantity).fill(component) : []
  })
}

export function prepareSimulation(input: SimulationInput): SimulationSetup {
  const { mission, entries, catalog, launchVehicle, orbit, assumptions, config } = input
  const summary = summarizeDesign(entries, catalog)
  const derivedInput: ValidationInput = { mission, summary, launchVehicle, orbit, assumptions }
  const parts = installed(entries, catalog)

  const minReliability: SimulationSetup['minReliability'] = {}
  for (const part of parts) {
    minReliability[part.category] = Math.min(minReliability[part.category] ?? 1, part.reliability)
  }
  const solarParts = parts.filter((p) => p.category === 'power' && !p.generatesDuringNight)
  const required = requiredPropellantKg(derivedInput)
  const buildDays = constructionDays(derivedInput)
  const totalReliability = summary.unitCount ? summary.reliability * (launchVehicle?.reliability ?? 0) : 0

  return {
    mission,
    config,
    assumptions,
    phaseDays: {
      launch: config.launchDays,
      transit: orbit?.transferDays ?? 0,
      orbitalArrival: config.orbitalArrivalDays,
      landing: config.landingDays,
    },
    constructionPercentPerDay: Number.isFinite(buildDays) ? 100 / buildDays : 0,
    startingBudgetMUsd: mission.budgetMUsd - summary.costMUsd - (launchVehicle?.costMUsd ?? 0),
    usableBatteryWh: summary.energyStorageWh * assumptions.batteryUsableFraction,
    propellantLoadedKg: Math.min(summary.propellantCapacityKg, required * (1 + assumptions.propellantMarginFraction)),
    propellantRequiredKg: required,
    demandW: summary.powerDemandByCategoryW,
    solarGenerationW: solarParts.reduce((sum, p) => sum + p.powerGenerationW, 0),
    nightGenerationW: summary.nightGenerationW,
    payloadDataGbPerDay: summary.dataGenerationGbPerDay,
    downlinkGbPerDay: dailyDownlinkGb(derivedInput),
    dataStorageGb: summary.dataStorageGb,
    hasCommunication: summary.dataRateMbps > 0,
    hasPayload: (summary.unitsByCategory.payload ?? 0) > 0,
    heatRejectionW: config.passiveHeatRejectionW + parts.reduce((sum, p) => sum + (p.heatRejectionW ?? 0), 0),
    minReliability,
    solarReliability: solarParts.reduce((min, p) => Math.min(min, p.reliability), 1),
    baseRiskPercent: (1 - totalReliability) * 100,
  }
}

export const phaseOrder: SimPhaseId[] = [
  'launch',
  'transit',
  'orbitalArrival',
  'landing',
  'construction',
  'operations',
  'completion',
]

export const phaseLabels: Record<SimPhaseId, string> = {
  launch: 'Launch',
  transit: 'Transit',
  orbitalArrival: 'Orbital Arrival',
  landing: 'Landing and Deployment',
  construction: 'Surface Construction',
  operations: 'Scientific Operations',
  completion: 'Mission Completion',
}
