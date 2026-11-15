/**
 * Pure mapping from mission progress to what the LUNAR ECHO hardware looks like. Two sources feed it:
 * - `conceptVisualState(t)`: a scrubbable concept playback for the briefing (t = 0…1);
 * - `visualStateFromSimulation(state, context)`: the live simulation state, the source of truth in
 *   Mission Control. This module only reads simulation state; it never advances or changes it.
 * Models receive the resulting numbers as props and ease toward them in their own frame loop.
 */
import type { FailureReason, SimulationState } from '../../../types/simulation'

/** Clamped linear ramp: 0 before `start`, 1 after `end`. */
export function ramp(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

/** Smooth start and stop (cubic). */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

// ── Lander ────────────────────────────────────────────────────

/** Height the descent animation starts from above the pad (m). Shortened for framing. */
export const DESCENT_START_ALTITUDE_M = 24

export type LanderPose = {
  /** Height of the footpads above the pad (m). */
  altitudeM: number
  /** 0 = legs folded for launch, 1 = locked down. */
  legDeploy: number
  /** Descent engine throttle, 0–1. */
  throttle: number
  /** Shock-absorber stroke at touchdown, 0–1. */
  legCompression: number
  /** Regolith blown out by the plume near the ground, 0–1. */
  dust: number
  touchedDown: boolean
}

/** Touchdown point within the landing sequence (0–1). After it: settle, then engine shutdown. */
export const TOUCHDOWN_AT = 0.72
const SHUTDOWN_END = 0.86

/**
 * Powered descent, 0 → 1: braking descent with the legs deploying early, a slow terminal
 * descent, touchdown, a shock-absorber stroke, then engine shutdown.
 */
export function landerPose(progress: number): LanderPose {
  const p = Math.min(1, Math.max(0, progress))
  const descent = ramp(p, 0, TOUCHDOWN_AT)
  // Fast at first, slowing toward the ground (constant-deceleration feel).
  const altitudeM = DESCENT_START_ALTITUDE_M * (1 - descent) ** 2.2
  const touchedDown = p >= TOUCHDOWN_AT
  const throttle = touchedDown ? 0.35 * (1 - ramp(p, TOUCHDOWN_AT, SHUTDOWN_END)) : 0.65 + 0.35 * ramp(p, 0.35, TOUCHDOWN_AT)
  const stroke = ramp(p, TOUCHDOWN_AT, TOUCHDOWN_AT + 0.05)
  return {
    altitudeM,
    legDeploy: easeInOut(ramp(p, 0.04, 0.32)),
    throttle,
    legCompression: stroke,
    dust: throttle > 0 ? throttle * (1 - ramp(altitudeM, 2, 9)) : 0,
    touchedDown,
  }
}

/** Rover egress from the lander's payload shelf, 0 → 1: clamps release, ramp lowers, rover drives off. */
export function egressPose(progress: number) {
  const p = Math.min(1, Math.max(0, progress))
  return {
    clampsReleased: p > 0.04,
    ramp: easeInOut(ramp(p, 0.04, 0.32)),
    /** Fraction of the rover's egress path driven. */
    drive: easeInOut(ramp(p, 0.36, 1)),
  }
}

// ── Telescope ─────────────────────────────────────────────────

export type TelescopeDeployment = {
  /** Rim anchors installed by the rover. */
  anchors: number
  /** Rim towers raised. */
  towers: number
  /** Suspension cables run out from the anchors and towers. */
  cables: number
  /** Wire-mesh reflector unfurled from its canister. */
  reflector: number
  /** Receiver hoisted to the focal point. */
  receiver: number
}

/** Construction progress (0–1) split into overlapping assembly steps. */
export function telescopeDeployment(progress: number): TelescopeDeployment {
  const p = Math.min(1, Math.max(0, progress))
  return {
    anchors: ramp(p, 0, 0.14),
    towers: easeInOut(ramp(p, 0.08, 0.32)),
    cables: ramp(p, 0.26, 0.5),
    reflector: easeInOut(ramp(p, 0.44, 0.84)),
    receiver: easeInOut(ramp(p, 0.8, 0.98)),
  }
}

export function telescopeStepLabel(progress: number): string {
  if (progress <= 0) return 'Stowed in its canister'
  if (progress < 0.14) return 'Installing rim anchors'
  if (progress < 0.32) return 'Raising rim towers'
  if (progress < 0.5) return 'Running suspension cables'
  if (progress < 0.84) return 'Unfurling the wire-mesh reflector'
  if (progress < 1) return 'Hoisting the receiver to the focal point'
  return 'Operational configuration'
}

// ── Whole-scene visual state ─────────────────────────────────

export type MissionStageId = 'inTransit' | 'descent' | 'surface' | 'construction' | 'operational' | 'lost'

export type RoverActivity = 'stowed' | 'egress' | 'working' | 'parked'

export type MissionVisualState = {
  stage: MissionStageId
  /** Lander on the scene (false while in transit or after a loss before landing). */
  landerVisible: boolean
  /** Landing sequence progress, 0–1 (see landerPose). */
  landing: number
  /** Rover is part of this design. */
  roverPresent: boolean
  /** Rover egress progress, 0–1 (see egressPose). */
  roverEgress: number
  roverActivity: RoverActivity
  /** Telescope package delivered to the crater (it arrives with the lander). */
  telescopeVisible: boolean
  /** Construction progress, 0–1 (see telescopeDeployment). */
  telescope: number
  /** Receiver powered and observing. */
  receiverActive: boolean
  night: boolean
  failed: boolean
  caption: string
}

/** Share of the concept playback spent on each step. */
const CONCEPT = { landingEnd: 0.2, egressEnd: 0.3, buildEnd: 0.94 } as const

/** Briefing playback: the full mission architecture from descent to first light, t = 0…1. */
export function conceptVisualState(t: number): MissionVisualState {
  const x = Math.min(1, Math.max(0, t))
  const landing = ramp(x, 0, CONCEPT.landingEnd)
  const roverEgress = ramp(x, CONCEPT.landingEnd, CONCEPT.egressEnd)
  const telescope = ramp(x, CONCEPT.egressEnd, CONCEPT.buildEnd)
  const operational = x >= 1
  const stage: MissionStageId = operational ? 'operational' : telescope > 0 ? 'construction' : landing < 1 ? 'descent' : 'surface'
  return {
    stage,
    landerVisible: true,
    landing,
    roverPresent: true,
    roverEgress,
    roverActivity: roverEgress <= 0 ? 'stowed' : roverEgress < 1 ? 'egress' : operational || telescope >= 1 ? 'parked' : 'working',
    telescopeVisible: landing >= 1,
    telescope,
    receiverActive: operational,
    night: false,
    failed: false,
    caption:
      stage === 'descent' ? 'Powered descent and touchdown'
      : stage === 'surface' ? 'Rover egress down the payload ramp'
      : stage === 'construction' ? telescopeStepLabel(telescope)
      : 'Operational: listening to the radio-quiet sky',
  }
}

/** What the simulation context adds to its state for the visuals. */
export type SimulationVisualContext = {
  /** Mission day the landing phase starts (launch + transit + orbital arrival), from the setup. */
  landingStartDay: number
  /** Length of the landing phase (days), from the simulation setup. */
  landingDays: number
  /** The design carries a construction rover (shown driving between anchors). */
  hasRover: boolean
  /** Any construction robotics are installed (rover, winch, or arm). */
  hasRobotics: boolean
}

const failureCaptions: Record<FailureReason, string> = {
  launchOverCapacity: 'Lost at launch: the vehicle could not lift the spacecraft',
  launchVehicleIncompatible: 'Lost at launch: the vehicle cannot fly this transfer',
  propellantDepleted: 'Propellant ran out before the lander could finish its maneuvers',
  electronicsFrozen: 'Electronics froze during the lunar night',
  powerDepleted: 'Batteries depleted: systems shut down',
  budgetExhausted: 'Operations stopped: the budget ran out',
  noConstructionCapability: 'No robotics on board: the telescope stays stowed',
}

/**
 * Visual state for the current simulation state. Phase, construction progress, events, and
 * failure come from the engine; nothing here changes how the mission plays out.
 */
export function visualStateFromSimulation(state: SimulationState, context: SimulationVisualContext): MissionVisualState {
  const { phase } = state
  const failed = state.runStatus === 'failed'
  const surfaceDays = state.elapsedTime - context.landingStartDay
  // Before the landing phase (also when the mission clock ran out in transit).
  const preSurface = phase !== 'landing' && surfaceDays <= 0
  const landing = phase === 'landing' ? Math.min(1, state.daysInPhase / Math.max(1, context.landingDays)) : preSurface ? 0 : 1
  // A loss during the descent itself, or before it, leaves nothing on the surface.
  const lostBeforeTouchdown = failed && (preSurface || (phase === 'landing' && landing < TOUCHDOWN_AT))
  const onSurface = !preSurface && !lostBeforeTouchdown && (phase !== 'landing' || landing >= TOUCHDOWN_AT)
  const telescope = state.constructionProgress / 100
  const building = onSurface && phase === 'construction'
  const stalled = state.elapsedTime < state.modifiers.constructionStallUntilDay
  const roverEgress = onSurface && phase !== 'landing' && context.hasRover ? 1 : 0
  const receiverActive = !failed && (state.instrumentStatus === 'operating' || state.instrumentStatus === 'degraded')

  const stage: MissionStageId =
    lostBeforeTouchdown ? 'lost'
    : preSurface ? 'inTransit'
    : phase === 'landing' ? 'descent'
    : telescope >= 1 ? 'operational'
    : telescope > 0 || building ? 'construction'
    : 'surface'

  let caption: string
  if (failed && state.failureReason) caption = failureCaptions[state.failureReason]
  else if (stage === 'inTransit') caption = phase === 'launch' ? 'Launch: the site awaits the lander' : 'In transit: the lander has not reached the Moon yet'
  else if (stage === 'descent') caption = landing < TOUCHDOWN_AT ? 'Powered descent to the landing pad' : 'Touchdown: engine shutdown and safing'
  else if (building && !context.hasRobotics) caption = failureCaptions.noConstructionCapability
  else if (building && state.isLunarNight) caption = 'Lunar night: construction paused until sunrise'
  else if (building && stalled) caption = 'Robotic construction delay: crews troubleshooting'
  else if (building) caption = `${telescopeStepLabel(telescope)} · ${Math.round(telescope * 100)}%`
  else if (stage === 'operational') caption = receiverActive ? 'Operational: receiver observing' : state.isLunarNight ? 'Operational: receiver on standby for the night' : 'Telescope assembled'
  else caption = 'Construction incomplete'

  return {
    stage,
    landerVisible: onSurface || (phase === 'landing' && !lostBeforeTouchdown),
    landing,
    roverPresent: context.hasRover,
    roverEgress,
    roverActivity: roverEgress < 1 ? 'stowed' : building && !state.isLunarNight && !stalled && !failed ? 'working' : 'parked',
    telescopeVisible: onSurface,
    telescope,
    receiverActive,
    night: state.isLunarNight,
    failed,
    caption,
  }
}
