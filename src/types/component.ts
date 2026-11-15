export type ComponentCategory =
  | 'bus'
  | 'propulsion'
  | 'power'
  | 'battery'
  | 'communication'
  | 'payload'
  | 'landing'
  | 'thermal'
  | 'robotics'

export type ComponentCategoryDefinition = {
  id: ComponentCategory
  label: string
  description: string
  /** Maximum total units of this category on one spacecraft. */
  maxUnits: number
}

/** All numeric values are fictional gameplay values, not official specifications. */
export type SpacecraftComponent = {
  id: string
  name: string
  category: ComponentCategory
  massKg: number
  costMUsd: number
  powerDemandW: number
  powerGenerationW: number
  /** Probability (0–1) the unit works for the full mission. */
  reliability: number
  description: string
  /** Battery capacity (Wh). */
  energyStorageWh?: number
  /** Propellant tank capacity (kg). */
  propellantCapacityKg?: number
  /** Relay downlink rate (Mbps). */
  dataRateMbps?: number
  /** Onboard data recorder capacity (gigabits). */
  dataStorageGb?: number
  /** Science data produced per day (gigabits). */
  dataGenerationGbPerDay?: number
  /** True when generation continues through the lunar night. */
  generatesDuringNight?: boolean
  /** Heat the unit can reject (W) in the reference environment. Thermal components only. */
  heatRejectionW?: number
  /** Steepest landing-zone slope the gear tolerates (degrees). Landing gear only. */
  maxLandingSlopeDeg?: number
  /** Steers the descent away from slopes and boulders. */
  hazardAvoidance?: boolean
  /** Fraction (0–1) of night heat loss that insulation prevents. */
  heatLossReduction?: number
  /** Heat produced without electrical power (W), e.g. radioisotope heaters. */
  survivalHeatW?: number
}

export type DataDisclaimer = {
  classification: 'fictional-gameplay-values'
  note: string
}

/** One line on the spacecraft build: a component and how many units. */
export type DesignEntry = {
  componentId: string
  quantity: number
}

/** Everything the player chooses in the designer for one mission. */
export type DesignSelection = {
  entries: DesignEntry[]
  launchVehicleId: string
  orbitId: string
  siteId: string
}

export type DesignSummary = {
  unitCount: number
  massKg: number
  costMUsd: number
  powerGenerationW: number
  powerDemandW: number
  netPowerW: number
  energyStorageWh: number
  propellantCapacityKg: number
  dataRateMbps: number
  dataStorageGb: number
  dataGenerationGbPerDay: number
  /** Generation from sources that keep working at night (W). */
  nightGenerationW: number
  powerDemandByCategoryW: Partial<Record<ComponentCategory, number>>
  /** Best slope tolerance among installed landing gear (degrees); 0 without gear. */
  maxLandingSlopeDeg: number
  hazardAvoidance: boolean
  /** Best insulation installed (0–1). */
  heatLossReduction: number
  survivalHeatW: number
  /** Rated heat rejection of installed thermal parts (W), excluding the structure. */
  heatRejectionW: number
  reliability: number
  unitsByCategory: Partial<Record<ComponentCategory, number>>
}

export type ComponentCatalog = {
  components: SpacecraftComponent[]
  categories: ComponentCategoryDefinition[]
}
