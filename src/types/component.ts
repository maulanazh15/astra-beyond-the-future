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
  /** Heat the unit can reject (W). Thermal components only. */
  heatRejectionW?: number
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
  reliability: number
  unitsByCategory: Partial<Record<ComponentCategory, number>>
}

export type ComponentCatalog = {
  components: SpacecraftComponent[]
  categories: ComponentCategoryDefinition[]
}
