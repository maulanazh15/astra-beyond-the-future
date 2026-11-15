/** Minimal in-memory localStorage for tests; counts writes so tests can check how often state is saved. */
export class MemoryStorage {
  private data = new Map<string, string>()
  writes = 0
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.writes += 1
    this.data.set(key, value)
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
}

export function installMemoryStorage(): MemoryStorage {
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  return storage
}

export function removeMemoryStorage() {
  Reflect.deleteProperty(globalThis, 'localStorage')
}
