import type { AffectedSubsystem } from './validation'

export type SimPhaseId =
  | 'launch'
  | 'transit'
  | 'orbitalArrival'
  | 'landing'
  | 'construction'
  | 'operations'
  | 'completion'

export type RunStatus = 'ready' | 'running' | 'paused' | 'completed' | 'failed'

export type CommunicationStatus = 'offline' | 'standby' | 'nominal' | 'blackout'

export type InstrumentStatus = 'offline' | 'stowed' | 'standby' | 'operating' | 'degraded'

export type SimEventSeverity = 'info' | 'success' | 'warning' | 'critical'

export type SimEventId =
  | 'solarDeploymentFailure'
  | 'communicationBlackout'
  | 'batteryDegradation'
  | 'instrumentOverheating'
  | 'roboticConstructionDelay'
  | 'firstLight'
  | 'scienceTargetReached'

export type SimEventLogEntry = {
  eventId: SimEventId
  day: number
  phase: SimPhaseId
  severity: SimEventSeverity
  title: string
  detail: string
  subsystem: AffectedSubsystem
}

export type FailureReason =
  | 'launchOverCapacity'
  | 'launchVehicleIncompatible'
  | 'propellantDepleted'
  | 'electronicsFrozen'
  | 'powerDepleted'
  | 'budgetExhausted'
  | 'noConstructionCapability'

export type MissionResult = 'success' | 'partial' | 'failure'

export type DiagnosisItem = {
  title: string
  cause: string
  subsystem: AffectedSubsystem
  recommendation: string
}

export type MissionOutcome = {
  result: MissionResult
  summary: string
  failureReason?: FailureReason
  objectives: {
    constructionComplete: boolean
    operationsDaysMet: boolean
    dataReturnMet: boolean
  }
  diagnosis: DiagnosisItem[]
}

/** Effects of events that persist across steps. */
export type SimModifiers = {
  solarGenerationFactor: number
  batteryHealth: number
  instrumentHealth: number
  commBlackoutUntilDay: number
  constructionStallUntilDay: number
  /** Index of the last lunar night that degraded the battery (-1 = none). */
  lastBatteryDegradationNight: number
}

export type SimulationState = {
  runStatus: RunStatus
  phase: SimPhaseId
  /** Days elapsed since launch. */
  elapsedTime: number
  daysInPhase: number
  operationsDays: number
  isLunarNight: boolean
  remainingBudget: number
  remainingEnergy: number
  remainingPropellant: number
  dataGenerated: number
  dataStored: number
  dataTransmitted: number
  dataLost: number
  communicationStatus: CommunicationStatus
  instrumentStatus: InstrumentStatus
  /** Percent, 0–100. */
  constructionProgress: number
  /** Percent, 0–100. Higher is riskier. */
  missionRisk: number
  modifiers: SimModifiers
  firedEvents: SimEventId[]
  eventLog: SimEventLogEntry[]
  failureReason?: FailureReason
  outcome?: MissionOutcome
}

/** Units: days, MUSD, Wh, kg, gigabits, W. */
export type SimulationConfig = {
  timeStepDays: number
  launchDays: number
  orbitalArrivalDays: number
  landingDays: number
  lunarDayLengthDays: number
  propellantShareTransit: number
  propellantShareArrival: number
  propellantShareLanding: number
  opsCostMUsdPerDay: number
  solarDeploymentReliabilityThreshold: number
  solarDeploymentLossFraction: number
  commBlackoutOpsDay: number
  commBlackoutDays: number
  commBlackoutLongDays: number
  commReliabilityThreshold: number
  batteryLowChargeFraction: number
  batteryDegradationFraction: number
  overheatingHealthLoss: number
  robotReliabilityThreshold: number
  roboticDelayDay: number
  roboticDelayDays: number
}
