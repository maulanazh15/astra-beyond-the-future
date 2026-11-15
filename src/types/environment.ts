import type { SourcedValue } from './nasaSource'

export type HazardLevel = 'low' | 'moderate' | 'high'

/** Representative surface temperature extremes for a latitude band. */
export type ThermalProfile = {
  id: string
  name: string
  latitudeBand: string
  /** Daytime maximum surface temperature (K). */
  dayMaxK: SourcedValue
  /** Pre-dawn minimum surface temperature (K). */
  nightMinK: SourcedValue
  summary: string
}

/** A selectable landing site. Sites are representative, not specific named craters. */
export type LunarSite = {
  id: string
  name: string
  region: string
  description: string
  /** True when the Moon blocks radio noise from Earth (far side). */
  radioQuiet: boolean
  thermalProfileId: string
  craterDiameterKm: SourcedValue | null
  /** Typical slope in the landing zone (degrees). */
  landingSlopeDeg: SourcedValue
  hazardLevel: SourcedValue<HazardLevel>
}
