import type { DesignSummary } from '../../types/component'
import type { HazardLevel, LunarSite, ThermalProfile } from '../../types/environment'
import type { GameplayAssumptions } from '../../types/validation'

/**
 * Gameplay thermal model. Site temperatures come from the dataset; the coefficients
 * are labeled gameplay assumptions, not engineering values.
 */

/** Share (0.5–1) of rated heat rejection left at the site's daytime maximum temperature. */
export function radiatorFactor(thermal: ThermalProfile, assumptions: GameplayAssumptions): number {
  const excessK = Math.max(0, thermal.dayMaxK.value - assumptions.radiatorReferenceTempK)
  return Math.max(assumptions.minRadiatorFactor, 1 - assumptions.radiatorDeratingPerK * excessK)
}

/** Heat the spacecraft can reject during the lunar day (W): structure plus radiators, derated by site heat. */
export function effectiveHeatRejectionW(
  ratedComponentW: number,
  thermal: ThermalProfile | undefined,
  assumptions: GameplayAssumptions,
): number {
  const ratedW = assumptions.baseHeatRejectionW + ratedComponentW
  return thermal ? ratedW * radiatorFactor(thermal, assumptions) : ratedW
}

/** Heat needed to keep electronics above survival temperature through the night (W). */
export function nightHeatNeedW(
  summary: DesignSummary,
  thermal: ThermalProfile,
  assumptions: GameplayAssumptions,
): number {
  const deltaK = Math.max(0, assumptions.electronicsSurvivalTempK - thermal.nightMinK.value)
  return assumptions.thermalLossWPerK * deltaK * (1 - summary.heatLossReduction)
}

/** Night heat available (W): electrical survival load dissipates as heat, plus non-electric heaters. */
export function nightHeatSupplyW(summary: DesignSummary, nightLoadW: number): number {
  return nightLoadW + summary.survivalHeatW
}

export type NightThermalBalance = {
  /** Heat needed to hold electronics at survival temperature (W). */
  needW: number
  /** Heat available through the night (W). */
  supplyW: number
}

/**
 * The single night survival requirement shared by validation and simulation.
 * Supply below need means the electronics fall below survival temperature.
 */
export function nightThermalBalance(
  summary: DesignSummary,
  thermal: ThermalProfile,
  assumptions: GameplayAssumptions,
  nightLoadW: number,
): NightThermalBalance {
  return { needW: nightHeatNeedW(summary, thermal, assumptions), supplyW: nightHeatSupplyW(summary, nightLoadW) }
}

/** Slope the lander actually faces (degrees), after hazard avoidance picks a flatter spot. */
export function effectiveLandingSlopeDeg(
  site: LunarSite,
  summary: DesignSummary,
  assumptions: GameplayAssumptions,
): number {
  const reduction = summary.hazardAvoidance ? assumptions.hazardAvoidanceSlopeReduction : 0
  return site.landingSlopeDeg.value * (1 - reduction)
}

export const hazardLabels: Record<HazardLevel, string> = { low: 'Low', moderate: 'Moderate', high: 'High' }

export function kelvinToCelsius(k: number): number {
  return Math.round(k - 273.15)
}
