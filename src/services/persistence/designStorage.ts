import type { DesignEntry } from '../../types/component'

const STORAGE_VERSION = 1

export type StoredDesign = {
  version: typeof STORAGE_VERSION
  entries: DesignEntry[]
  launchVehicleId: string
  orbitId: string
  /** Added after v1 shipped; optional so older saves still load. */
  siteId?: string
}

const keyFor = (missionId: string) => `astra.design.${missionId}`

function isDesignEntry(value: unknown): value is DesignEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.componentId === 'string' && Number.isInteger(entry.quantity) && (entry.quantity as number) > 0
}

/** Reads the design fields shared by saved designs and saved runs. Undefined when malformed. */
export function readDesignFields(value: unknown): Omit<StoredDesign, 'version'> | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.entries) || !record.entries.every(isDesignEntry)) return undefined
  if (typeof record.launchVehicleId !== 'string' || typeof record.orbitId !== 'string') return undefined
  if (record.siteId !== undefined && typeof record.siteId !== 'string') return undefined
  return {
    entries: record.entries.map((e) => ({ componentId: e.componentId, quantity: e.quantity })),
    launchVehicleId: record.launchVehicleId,
    orbitId: record.orbitId,
    ...(typeof record.siteId === 'string' && { siteId: record.siteId }),
  }
}

function parseDesign(raw: string): StoredDesign | undefined {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) return undefined
  if ((data as Record<string, unknown>).version !== STORAGE_VERSION) return undefined
  const fields = readDesignFields(data)
  return fields && { version: STORAGE_VERSION, ...fields }
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
