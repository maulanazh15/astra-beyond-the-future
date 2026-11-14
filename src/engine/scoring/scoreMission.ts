import type { MissionRating, MissionScore, ScoreCategory } from '../../types/scoring'
import type { SimulationState } from '../../types/simulation'
import type { SimulationSetup } from '../simulation/setup'

/** Gameplay scoring weights. Not an official evaluation method. */
export const scoreWeights = {
  objectives: 0.3,
  engineering: 0.2,
  science: 0.25,
  efficiency: 0.1,
  risk: 0.15,
} as const

const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)))
const ratio = (value: number, target: number) => (target > 0 ? Math.min(1, value / target) : 1)

export function ratingFor(total: number): MissionRating {
  if (total >= 90) return 'S'
  if (total >= 80) return 'A'
  if (total >= 70) return 'B'
  if (total >= 60) return 'C'
  if (total >= 45) return 'D'
  return 'F'
}

/** Scores a finished (or failed) mission. Deterministic and UI-independent. */
export function scoreMission(state: SimulationState, setup: SimulationSetup): MissionScore {
  const { mission } = setup
  const failed = state.runStatus === 'failed'

  // Objectives: partial credit for each of the three objectives.
  const objectiveRatios = [
    state.constructionProgress / 100,
    ratio(state.operationsDays, mission.requiredOperationDays),
    ratio(state.dataTransmitted, mission.dataReturnTargetGb),
  ]
  const objectives = clamp((objectiveRatios.reduce((a, b) => a + b, 0) / 3) * 100)
  const objectivesMet = objectiveRatios.filter((r) => r >= 1).length

  // Engineering: penalties for anomalies and loss of the spacecraft.
  const criticalCount = state.eventLog.filter((e) => e.severity === 'critical').length
  const warningCount = state.eventLog.filter((e) => e.severity === 'warning').length
  const engineering = clamp(100 - criticalCount * 25 - warningCount * 10 - (failed ? 40 : 0))

  // Science: return versus target, small bonus for exceeding it, penalty for lost data.
  const dataRatio = mission.dataReturnTargetGb > 0 ? state.dataTransmitted / mission.dataReturnTargetGb : 0
  const bonus = Math.min(20, Math.max(0, (dataRatio - 1) * 40))
  const lostPenalty = mission.dataReturnTargetGb > 0 ? Math.min(20, (state.dataLost / mission.dataReturnTargetGb) * 100) : 0
  const science = clamp(Math.min(1, dataRatio) * 80 + bonus - lostPenalty)

  // Efficiency: reward keeping a ~10% budget reserve and not over-carrying propellant.
  const reserveFraction = mission.budgetMUsd > 0 ? state.remainingBudget / mission.budgetMUsd : 0
  const budgetScore = state.remainingBudget < 0 ? 0 : 60 + 40 * Math.min(1, reserveFraction / 0.1)
  const leftoverFraction = setup.propellantLoadedKg > 0 ? state.remainingPropellant / setup.propellantLoadedKg : 0
  const propellantScore = state.remainingPropellant < 0 ? 0 : 100 - Math.max(0, leftoverFraction - 0.15) * 200
  const efficiency = clamp(budgetScore * 0.6 + propellantScore * 0.4)

  const risk = clamp(100 - state.missionRisk)

  const categories: ScoreCategory[] = [
    { id: 'objectives', label: 'Objective Completion', score: objectives, weight: scoreWeights.objectives, note: `${objectivesMet} of 3 objectives fully met.` },
    { id: 'engineering', label: 'Engineering Performance', score: engineering, weight: scoreWeights.engineering, note: `${criticalCount} critical and ${warningCount} warning anomalies${failed ? '; spacecraft lost' : ''}.` },
    { id: 'science', label: 'Scientific Value', score: science, weight: scoreWeights.science, note: `${Math.round(state.dataTransmitted).toLocaleString('en-US')} of ${mission.dataReturnTargetGb.toLocaleString('en-US')} Gb returned${state.dataLost > 0 ? `; ${Math.round(state.dataLost).toLocaleString('en-US')} Gb lost` : ''}.` },
    { id: 'efficiency', label: 'Resource Efficiency', score: efficiency, weight: scoreWeights.efficiency, note: `$${state.remainingBudget.toFixed(1)}M budget and ${Math.round(Math.max(0, state.remainingPropellant))} kg propellant left.` },
    { id: 'risk', label: 'Risk Management', score: risk, weight: scoreWeights.risk, note: `Final mission risk ${state.missionRisk.toFixed(1)}%.` },
  ]
  const weighted = categories.reduce((sum, c) => sum + c.score * c.weight, 0)
  const total = clamp(failed ? Math.min(weighted, 44) : weighted)
  return { total, rating: ratingFor(total), categories }
}
