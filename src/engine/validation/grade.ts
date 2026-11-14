import type { ValidationStatus } from '../../types/validation'

/** Lower is better (mass, cost): valid with margin, warning within limit, critical over. */
export function gradeAgainstLimit(value: number, limit: number, marginFraction: number): ValidationStatus {
  if (value <= limit * (1 - marginFraction)) return 'valid'
  if (value <= limit) return 'warning'
  return 'critical'
}

/** Higher is better (capacity vs need): valid with margin, warning if just enough, critical short. */
export function gradeAgainstNeed(available: number, needed: number, marginFraction: number): ValidationStatus {
  if (available >= needed * (1 + marginFraction)) return 'valid'
  if (available >= needed) return 'warning'
  return 'critical'
}

export function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
