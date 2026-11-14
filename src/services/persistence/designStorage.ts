import type { DesignEntry } from '../../types/component'

const STORAGE_VERSION = 1

export type StoredDesign = {
  version: typeof STORAGE_VERSION
  entries: DesignEntry[]
  launchVehicleId: string
  orbitId: string
}

const keyFor = (missionId: string) => `astra.design.${missionId}`

function isDesignEntry(value: unknown): value is DesignEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.componentId === 'string' && typeof entry.quantity === 'number' && entry.quantity > 0
}

function parseDesign(raw: string): StoredDesign | undefined {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) return undefined
  const record = data as Record<string, unknown>
  if (record.version !== STORAGE_VERSION) return undefined
  if (!Array.isArray(record.entries) || !record.entries.every(isDesignEntry)) return undefined
  if (typeof record.launchVehicleId !== 'string' || typeof record.orbitId !== 'string') return undefined
  return { version: STORAGE_VERSION, entries: record.entries, launchVehicleId: record.launchVehicleId, orbitId: record.orbitId }
}

/** Returns the saved design, or undefined if missing, corrupt, or storage is unavailable. */
export function loadDesign(missionId: string): StoredDesign | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(keyFor(missionId))
    return raw ? parseDesign(raw) : undefined
  } catch {
    return undefined
  }
}

export function saveDesign(missionId: string, design: Omit<StoredDesign, 'version'>): void {
  try {
    globalThis.localStorage?.setItem(keyFor(missionId), JSON.stringify({ version: STORAGE_VERSION, ...design }))
  } catch {
    // Storage full or blocked: the design simply is not persisted.
  }
}
