import type { DesignSelection } from '../../types/component'
import type { MissionResult } from '../../types/simulation'
import { readDesignFields } from './designStorage'

const STORAGE_VERSION = 1

/**
 * A finished mission run. The simulation is deterministic and run controls (pause, speed)
 * do not change the result, so the design is enough to rebuild the report exactly.
 * `result` is a fingerprint: if a replay ends differently, the game data changed and the save is outdated.
 */
export type StoredRun = {
  version: typeof STORAGE_VERSION
  missionId: string
  design: DesignSelection
  result: {
    runStatus: 'completed' | 'failed'
    outcome: MissionResult
    elapsedDays: number
  }
}

const keyFor = (missionId: string) => `astra.run.${missionId}`

const outcomes: readonly string[] = ['success', 'partial', 'failure'] satisfies MissionResult[]

function parseRun(raw: string, missionId: string): StoredRun | undefined {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) return undefined
  const record = data as Record<string, unknown>
  if (record.version !== STORAGE_VERSION || record.missionId !== missionId) return undefined
  const design = readDesignFields(record.design)
  if (!design || design.siteId === undefined) return undefined
  if (typeof record.result !== 'object' || record.result === null) return undefined
  const result = record.result as Record<string, unknown>
  if (result.runStatus !== 'completed' && result.runStatus !== 'failed') return undefined
  if (typeof result.outcome !== 'string' || !outcomes.includes(result.outcome)) return undefined
  if (typeof result.elapsedDays !== 'number' || !Number.isFinite(result.elapsedDays)) return undefined
  return {
    version: STORAGE_VERSION,
    missionId,
    design: { ...design, siteId: design.siteId },
    result: { runStatus: result.runStatus, outcome: result.outcome as MissionResult, elapsedDays: result.elapsedDays },
  }
}

/** Returns the saved finished run, or undefined if missing, corrupt, outdated, or storage is unavailable. */
export function loadRun(missionId: string): StoredRun | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(keyFor(missionId))
    return raw ? parseRun(raw, missionId) : undefined
  } catch {
    return undefined
  }
}

export function saveRun(missionId: string, run: Omit<StoredRun, 'version' | 'missionId'>): void {
  try {
    globalThis.localStorage?.setItem(keyFor(missionId), JSON.stringify({ version: STORAGE_VERSION, missionId, ...run }))
  } catch {
    // Storage full or blocked: the report simply does not survive a reload.
  }
}

export function clearRun(missionId: string): void {
  try {
    globalThis.localStorage?.removeItem(keyFor(missionId))
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
