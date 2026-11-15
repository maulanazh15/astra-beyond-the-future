import { useLayoutEffect, useMemo } from 'react'

/**
 * Creates a three.js resource (geometry, material, texture) once per set of `keys` and disposes it
 * when the keys change or the component unmounts.
 */
export function useDisposable<T extends { dispose: () => void }>(create: () => T, keys: readonly (string | number | boolean)[]): T {
  const id = keys.join('|')
  // `create` is re-run only when the keys change; callers derive it from those keys alone.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(create, [id])
  useLayoutEffect(() => () => value.dispose(), [value])
  return value
}
