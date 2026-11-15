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

/** Egress progress where the ramp is down and the rover starts to drive. */
export const EGRESS_DRIVE_START = 0.36

/** Rover egress from the lander's payload shelf, 0 → 1: clamps release, ramp lowers, rover drives off. */
export function egressPose(progress: number) {
  const p = Math.min(1, Math.max(0, progress))
  return {
    clampsReleased: p > 0.04,
    ramp: easeInOut(ramp(p, 0.04, 0.32)),
    /** Fraction of the rover's egress path driven. */
    drive: easeInOut(ramp(p, EGRESS_DRIVE_START, 1)),
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

/**
 * Where each assembly step sits in construction progress (0–1). Anchors get the largest share: the
 * rover drives the whole rim and drills every one, and the scene shows each anchor appear as it
 * does. Steps overlap slightly, as parallel robotic work would.
 */
export const TELESCOPE_STEPS = {
  anchors: [0, 0.4],
  towers: [0.34, 0.52],
  cables: [0.48, 0.64],
  reflector: [0.6, 0.88],
  receiver: [0.86, 0.98],
} as const satisfies Record<keyof TelescopeDeployment, readonly [number, number]>

/** Construction progress (0–1) split into overlapping assembly steps. */
export function telescopeDeployment(progress: number): TelescopeDeployment {
  const p = Math.min(1, Math.max(0, progress))
  const step = (k: keyof TelescopeDeployment) => ramp(p, TELESCOPE_STEPS[k][0], TELESCOPE_STEPS[k][1])
  return {
    anchors: step('anchors'),
    towers: easeInOut(step('towers')),
    cables: step('cables'),
    reflector: easeInOut(step('reflector')),
    receiver: easeInOut(step('receiver')),
  }
}

export function telescopeStepLabel(progress: number): string {
  if (progress <= 0) return 'Stowed in its canister'
  if (progress < TELESCOPE_STEPS.anchors[1]) return 'Installing rim anchors'
  if (progress < TELESCOPE_STEPS.towers[1]) return 'Raising rim towers'
  if (progress < TELESCOPE_STEPS.cables[1]) return 'Running suspension cables'
  if (progress < TELESCOPE_STEPS.reflector[1]) return 'Unfurling the wire-mesh reflector'
  if (progress < 1) return 'Hoisting the receiver to the focal point'
  return 'Operational configuration'
}

/**
 * Easing rates (1/s) for the values the models follow. Every model that shows the same quantity
 * uses the same rate, and the scene mounts them together, so the rover, the anchors it drills, and
 * the ramp it drives down stay in step frame by frame.
 */
export const MISSION_EASE = { landing: 1.4, egress: 1.4, telescope: 1.1 } as const

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

/** Share of the concept playback spent on each phase; operations run from `buildEnd` to the end. */
export const CONCEPT = { landingEnd: 0.16, egressEnd: 0.26, buildEnd: 0.94 } as const

/** Briefing playback: the full mission architecture from descent to first light, t = 0…1. */
export function conceptVisualState(t: number): MissionVisualState {
  const x = Math.min(1, Math.max(0, t))
  const landing = ramp(x, 0, CONCEPT.landingEnd)
  const roverEgress = ramp(x, CONCEPT.landingEnd, CONCEPT.egressEnd)
  const telescope = ramp(x, CONCEPT.egressEnd, CONCEPT.buildEnd)
  const operational = telescope >= 1
  const stage: MissionStageId = operational ? 'operational' : telescope > 0 ? 'construction' : landing < 1 ? 'descent' : 'surface'
  return {
    stage,
    landerVisible: true,
    landing,
    roverPresent: true,
    roverEgress,
    roverActivity: roverEgress <= 0 ? 'stowed' : roverEgress < 1 ? 'egress' : operational ? 'parked' : 'working',
    telescopeVisible: landing >= 1,
    telescope,
    receiverActive: operational,
    night: false,
    failed: false,
    caption:
      stage === 'descent' ? (landing < TOUCHDOWN_AT ? 'Powered descent to the landing pad' : 'Touchdown: engine shutdown and safing')
      : stage === 'surface' ?
        egressPose(roverEgress).drive <= 0 ? 'Rover deployment: clamps release, ramp lowers'
        : roverEgress < 1 ? 'Rover egress down the payload ramp'
        : 'Rover heading for the first rim anchor'
      : stage === 'construction' ? `${telescopeStepLabel(telescope)} · time-lapse`
      : 'Operational: listening to the radio-quiet sky',
  }
}

// ── Mission sequence ─────────────────────────────────────────

/** The nine visible steps of the LUNAR ECHO surface sequence, in order. */
export const MISSION_STEPS = [
  { id: 'descent', label: 'Descent' },
  { id: 'landing', label: 'Landing' },
  { id: 'touchdown', label: 'Touchdown' },
  { id: 'roverDeploy', label: 'Rover deployment' },
  { id: 'egress', label: 'Rover egress' },
  { id: 'anchors', label: 'Anchor installation' },
  { id: 'reflector', label: 'Reflector deployment' },
  { id: 'receiver', label: 'Receiver installation' },
  { id: 'operations', label: 'Telescope operations' },
] as const

export type MissionStepId = (typeof MISSION_STEPS)[number]['id']

/** Landing progress where the braking descent gives way to the slow terminal descent. */
export const TERMINAL_DESCENT_AT = 0.45

/**
 * The step a visual state shows, or null before the lander reaches the Moon. A failed mission
 * reports the step it stopped in; it never advances past it.
 */
export function missionStep(v: MissionVisualState): MissionStepId | null {
  // Lost before the landing burn began: nothing of the surface sequence happened.
  if (v.stage === 'inTransit' || (v.stage === 'lost' && v.landing <= 0)) return null
  if (v.landing < TERMINAL_DESCENT_AT) return 'descent'
  if (v.landing < TOUCHDOWN_AT) return 'landing'
  // Still in the landing phase (e.g. it failed on the last landing day): the sequence stops at touchdown.
  if (v.landing < 1 || v.stage === 'descent') return 'touchdown'
  if (v.roverPresent && v.roverEgress < 1 && v.telescope <= 0) return egressPose(v.roverEgress).drive <= 0 ? 'roverDeploy' : 'egress'
  if (v.telescope < TELESCOPE_STEPS.anchors[1]) return 'anchors'
  if (v.telescope < TELESCOPE_STEPS.reflector[1]) return 'reflector'
  if (v.telescope < 1) return 'receiver'
  return 'operations'
}

/** Index of a step in MISSION_STEPS. */
export function missionStepIndex(id: MissionStepId): number {
  return MISSION_STEPS.findIndex((s) => s.id === id)
}

/** Where each step starts in the concept playback (t), for jumping to it (just inside the step). */
export function conceptStepStart(id: MissionStepId): number {
  return id === 'descent' ? 0 : Math.min(1, conceptStepBoundary(id) + 0.002)
}

function conceptStepBoundary(id: MissionStepId): number {
  const { landingEnd, egressEnd, buildEnd } = CONCEPT
  const build = (p: number) => egressEnd + (buildEnd - egressEnd) * p
  switch (id) {
    case 'descent':
      return 0
    case 'landing':
      return landingEnd * TERMINAL_DESCENT_AT
    case 'touchdown':
      return landingEnd * TOUCHDOWN_AT
    case 'roverDeploy':
      return landingEnd
    case 'egress':
      return landingEnd + (egressEnd - landingEnd) * EGRESS_DRIVE_START
    case 'anchors':
      return egressEnd
    case 'reflector':
      return build(TELESCOPE_STEPS.anchors[1])
    case 'receiver':
      return build(TELESCOPE_STEPS.reflector[1])
    case 'operations':
      return buildEnd
  }
}

/** The visual context of a run, from its setup and the design's component ids. */
export function simulationVisualContext(
  setup: { phaseDays: Record<'launch' | 'transit' | 'orbitalArrival' | 'landing', number>; constructionPercentPerDay: number },
  componentIds: readonly string[],
): SimulationVisualContext {
  return {
    landingStartDay: setup.phaseDays.launch + setup.phaseDays.transit + setup.phaseDays.orbitalArrival,
    landingDays: setup.phaseDays.landing,
    hasRover: componentIds.includes('rob-rover'),
    hasRobotics: setup.constructionPercentPerDay > 0,
  }
}

/** What the simulation adds to its state for the visuals (see `simulationVisualContext`). */
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
