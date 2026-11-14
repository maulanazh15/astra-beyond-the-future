import type { ComponentCategory } from './component'

export type ValidationStatus = 'valid' | 'warning' | 'critical'

export type AffectedSubsystem = ComponentCategory | 'launchVehicle' | 'trajectory' | 'mission'

export type ValidationCheckId =
  | 'mass'
  | 'budget'
  | 'powerBalance'
  | 'energyStorage'
  | 'propellant'
  | 'launchVehicle'
  | 'orbit'
  | 'communication'
  | 'dataStorage'
  | 'missionDuration'

export type ValidationResult = {
  id: ValidationCheckId
  label: string
  status: ValidationStatus
  message: string
  subsystem: AffectedSubsystem
  /** Empty when no action is needed. */
  suggestion: string
  /** Gameplay assumptions this check relies on. */
  assumptions: readonly (keyof GameplayAssumptions)[]
}

/** Simplified gameplay assumptions. Not NASA engineering standards. */
export type GameplayAssumptions = {
  massMarginFraction: number
  budgetReserveFraction: number
  powerMarginFraction: number
  lunarNightHours: number
  survivalBusLoadFraction: number
  batteryUsableFraction: number
  energyMarginFraction: number
  propellantMarginFraction: number
  relayContactHoursPerDay: number
  commsMarginFraction: number
  relayOutageDays: number
  constructionWorkDays: number
  maxTransferFraction: number
  scheduleMarginFraction: number
}
