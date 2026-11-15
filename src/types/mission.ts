import type { ComponentCategory } from './component'

export type MissionStatus = 'available' | 'locked'

export type Difficulty = 'Introductory' | 'Intermediate' | 'Advanced'

export type MissionObjective = {
  id: string
  label: string
  metric: string
}

/** Machine-checkable design requirements. Each kind maps to one design check. */
export type MissionRequirement =
  | { id: string; kind: 'withinBudget'; label: string }
  | { id: string; kind: 'withinLaunchCapacity'; label: string }
  | { id: string; kind: 'minNetPowerW'; label: string; target: number }
  | { id: string; kind: 'minEnergyStorageWh'; label: string; target: number }
  | { id: string; kind: 'requiredCategories'; label: string; categories: ComponentCategory[] }
  | { id: string; kind: 'radioQuietSite'; label: string }

export type Mission = {
  id: string
  name: string
  subtitle: string
  destination: string
  description: string
  background: string
  status: MissionStatus
  difficulty: Difficulty
  budgetMUsd: number
  durationDays: number
  /** Science operations days needed after arrival and construction. */
  requiredOperationDays: number
  /** Science data that must reach Earth for full success (gigabits). */
  dataReturnTargetGb: number
  objectives: MissionObjective[]
  requirements: MissionRequirement[]
  constraints: string[]
  successCriteria: string[]
  site: {
    /** Site must be shielded from Earth radio noise (far side). */
    requiresRadioQuiet: boolean
    defaultSiteId: string
  }
  /** Ids in `data/nasa-sources`. */
  sourceIds: string[]
}

export type LaunchVehicle = {
  id: string
  name: string
  payloadCapacityKg: number
  costMUsd: number
  reliability: number
  compatibleOrbitIds: string[]
}

export type OrbitProfile = {
  id: string
  name: string
  transferDays: number
  /** Gameplay value: propellant needed per 1,000 kg of dry mass (kg), incl. descent. */
  propellantKgPerTonneDry: number
  compatibleMissionIds: string[]
  description: string
}
