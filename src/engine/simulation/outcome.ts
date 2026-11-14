import type { DiagnosisItem, FailureReason, MissionOutcome, SimulationState } from '../../types/simulation'
import { phaseLabels } from './setup'
import type { SimulationSetup } from './setup'

/** Immediate, mission-ending conditions checked after every step. */
export function detectFailure(state: SimulationState, setup: SimulationSetup): FailureReason | undefined {
  if (state.remainingPropellant < 0) return 'propellantDepleted'
  if (state.remainingEnergy < 0) return 'powerDepleted'
  if (state.remainingBudget < 0) return 'budgetExhausted'
  if (state.phase === 'construction' && setup.constructionPercentPerDay === 0) return 'noConstructionCapability'
  return undefined
}

const failureDiagnosis: Record<FailureReason, (state: SimulationState) => DiagnosisItem> = {
  propellantDepleted: (s) => ({
    title: 'Propellant depleted',
    cause: `The tanks ran dry during ${phaseLabels[s.phase]}, so the spacecraft could not complete its maneuvers.`,
    subsystem: 'propulsion',
    recommendation: 'Add propellant capacity, reduce dry mass, or choose a lower-propellant transfer.',
  }),
  powerDepleted: (s) => ({
    title: 'Power depleted',
    cause: s.isLunarNight
      ? 'The batteries emptied during the lunar night and the lander froze.'
      : 'Loads exceeded generation and the batteries emptied.',
    subsystem: s.isLunarNight ? 'battery' : 'power',
    recommendation: s.isLunarNight
      ? 'Add energy storage, a night-capable power source, or radioisotope heaters.'
      : 'Add generation or remove power-hungry components.',
  }),
  budgetExhausted: () => ({
    title: 'Budget exhausted',
    cause: 'Operations costs used up the remaining budget and the program was cancelled.',
    subsystem: 'mission',
    recommendation: 'Leave a larger budget reserve for mission operations.',
  }),
  noConstructionCapability: () => ({
    title: 'Observatory could not be built',
    cause: 'No robotic construction units were installed to deploy the antenna.',
    subsystem: 'robotics',
    recommendation: 'Add at least one robotic construction unit.',
  }),
}

/** Explains shortfalls and notable events so the player can redesign. */
export function diagnoseMission(state: SimulationState, setup: SimulationSetup): DiagnosisItem[] {
  const { mission } = setup
  const items: DiagnosisItem[] = []
  if (state.failureReason) items.push(failureDiagnosis[state.failureReason](state))

  if (!state.failureReason && state.constructionProgress < 100) {
    items.push({
      title: 'Construction incomplete',
      cause: `Only ${Math.round(state.constructionProgress)}% of the observatory was deployed before the mission ended.`,
      subsystem: 'robotics',
      recommendation: 'Add robotic units, or choose a faster transfer to leave more surface time.',
    })
  }
  if (!state.failureReason && state.constructionProgress >= 100 && state.operationsDays < mission.requiredOperationDays) {
    items.push({
      title: 'Not enough operations time',
      cause: `The observatory operated ${state.operationsDays} of ${mission.requiredOperationDays} required days.`,
      subsystem: 'trajectory',
      recommendation: 'Shorten the transfer or speed up construction with more robots.',
    })
  }
  if (!state.failureReason && state.dataTransmitted < mission.dataReturnTargetGb) {
    const shortGb = Math.round(mission.dataReturnTargetGb - state.dataTransmitted)
    if (state.dataLost > 0) {
      items.push({
        title: 'Science data lost',
        cause: `${Math.round(state.dataLost)} Gb overflowed onboard storage.`,
        subsystem: 'bus',
        recommendation: 'Increase data storage or downlink capacity.',
      })
    } else if (setup.downlinkGbPerDay < setup.payloadDataGbPerDay) {
      items.push({
        title: 'Downlink bottleneck',
        cause: `The relay link moves ${Math.round(setup.downlinkGbPerDay)} Gb/day but the payload makes ${setup.payloadDataGbPerDay} Gb/day.`,
        subsystem: 'communication',
        recommendation: 'Use a higher-rate communication link.',
      })
    } else {
      items.push({
        title: 'Science return below target',
        cause: `Returned ${Math.round(state.dataTransmitted)} Gb, ${shortGb} Gb short of the ${mission.dataReturnTargetGb} Gb target.`,
        subsystem: 'payload',
        recommendation: 'Add or upgrade instruments, protect them thermally, or extend operations time.',
      })
    }
  }

  for (const entry of state.eventLog) {
    if (entry.severity !== 'critical' && entry.severity !== 'warning') continue
    if (items.some((item) => item.title === entry.title)) continue
    items.push({
      title: entry.title,
      cause: entry.detail,
      subsystem: entry.subsystem,
      recommendation: eventRecommendation[entry.eventId] ?? 'Review the affected subsystem.',
    })
  }
  return items
}

const eventRecommendation: Partial<Record<string, string>> = {
  solarDeploymentFailure: 'Choose a more reliable solar array or add generation margin.',
  communicationBlackout: 'Size onboard storage to buffer outages; a more reliable link shortens them.',
  batteryDegradation: 'Add storage margin so night discharges stay shallow.',
  instrumentOverheating: 'Add radiator panels so thermal rejection exceeds payload heat.',
  roboticConstructionDelay: 'Use more reliable robots or add a second unit.',
}

export function evaluateOutcome(state: SimulationState, setup: SimulationSetup): MissionOutcome {
  const { mission } = setup
  const objectives = {
    constructionComplete: state.constructionProgress >= 100,
    operationsDaysMet: state.operationsDays >= mission.requiredOperationDays,
    dataReturnMet: state.dataTransmitted >= mission.dataReturnTargetGb,
  }
  const diagnosis = diagnoseMission(state, setup)

  if (state.failureReason) {
    return { result: 'failure', summary: diagnosis[0]?.cause ?? 'Mission lost.', failureReason: state.failureReason, objectives, diagnosis }
  }
  const met = Object.values(objectives).filter(Boolean).length
  if (met === 3) {
    return { result: 'success', summary: 'All mission objectives achieved.', objectives, diagnosis }
  }
  if (objectives.constructionComplete && state.dataTransmitted > 0) {
    return { result: 'partial', summary: `Observatory built; ${met} of 3 objectives achieved.`, objectives, diagnosis }
  }
  return { result: 'failure', summary: 'The observatory did not deliver science.', objectives, diagnosis }
}
