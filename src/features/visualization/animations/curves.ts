/** Pure animation curves: time in, value out. Components apply them in their own frame loop. */

export type BeaconOptions = { periodS?: number; flashFraction?: number; peak?: number; base?: number }

/** Navigation-beacon blink: a short bright flash once per period. */
export function beaconIntensity(timeS: number, { periodS = 2.4, flashFraction = 0.08, peak = 6, base = 0.4 }: BeaconOptions = {}): number {
  const phase = (((timeS % periodS) + periodS) % periodS) / periodS
  return phase < flashFraction ? peak : base
}

/** Steady glow used instead of blinking when the player prefers reduced motion. */
export function steadyBeaconIntensity({ peak = 6 }: BeaconOptions = {}): number {
  return peak * 0.5
}

/** Earth turns once per day; shown far faster here (radians per real second) so the motion is visible. */
export const EARTH_SPIN_RAD_PER_S = 0.02

/**
 * Frame-rate independent exponential approach of `current` toward `target`. `rate` is per second
 * (≈ 1 / time constant). Snaps once within `epsilon`.
 */
export function approach(current: number, target: number, rate: number, dtS: number, epsilon = 1e-4): number {
  const next = current + (target - current) * (1 - Math.exp(-rate * Math.max(0, dtS)))
  return Math.abs(target - next) < epsilon ? target : next
}
