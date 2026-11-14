export { prepareSimulation, phaseLabels, phaseOrder } from './setup'
export type { SimulationInput, SimulationSetup } from './setup'
export {
  createSimulation,
  isFinished,
  nextPhase,
  pauseSimulation,
  restartSimulation,
  resumeSimulation,
  runToCompletion,
  startSimulation,
  stepSimulation,
} from './simulation'
export { eventRules, applyEvents } from './events'
export { detectFailure, diagnoseMission, evaluateOutcome } from './outcome'
export { activeConditions, sampleTelemetry } from './telemetry'
export type { ActiveCondition, TelemetrySample } from './telemetry'
export { batteryCapacityWh } from './resources'
