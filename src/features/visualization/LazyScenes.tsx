/**
 * Entry point for screens outside the visualization feature. It contains no three.js imports:
 * scenes load on demand in their own chunk, so 2D screens never pay for 3D they do not show.
 */
import { lazy, Suspense } from 'react'
import { LoadingFallback } from './components/LoadingFallback'
import type { DesignEntry } from '../../types/component'
import type { MissionVisualState } from './animations/missionTimeline'
import type { SceneSite } from './types/scene'

const SpacecraftViewerScene = lazy(() => import('./scenes/SpacecraftViewer').then((m) => ({ default: m.SpacecraftViewer })))
const MissionOverviewScene = lazy(() => import('./scenes/MissionOverviewScene').then((m) => ({ default: m.MissionOverviewScene })))
const MissionSurfaceScene = lazy(() => import('./scenes/MissionOverviewScene').then((m) => ({ default: m.MissionSurfaceScene })))

type MissionOverview3DProps = {
  site: SceneSite
  /** Tailwind height classes for the scene container. */
  className?: string
}

export function MissionOverview3D({ site, className = 'h-72 sm:h-96 lg:h-[30rem]' }: MissionOverview3DProps) {
  return (
    <Suspense
      fallback={
        <div className={`overflow-hidden rounded-lg border border-space-700 ${className}`}>
          <LoadingFallback />
        </div>
      }
    >
      <MissionOverviewScene site={site} className={className} />
    </Suspense>
  )
}

type SpacecraftViewer3DProps = {
  /** The design entries from the mission session (single source of truth). */
  entries: DesignEntry[]
  className?: string
}

/** Interactive 3D model of the current spacecraft design. */
export function SpacecraftViewer3D({ entries, className = 'h-80 sm:h-[26rem]' }: SpacecraftViewer3DProps) {
  return (
    <Suspense
      fallback={
        <div className={`overflow-hidden rounded-lg border border-space-700 ${className}`}>
          <LoadingFallback label="Assembling spacecraft…" />
        </div>
      }
    >
      <SpacecraftViewerScene entries={entries} className={className} />
    </Suspense>
  )
}

type MissionSurface3DProps = {
  site: SceneSite
  /** Derived from the live simulation state with `visualStateFromSimulation`. */
  visual: MissionVisualState
  className?: string
}

/** Live 3D view of the landing site that follows the running simulation. */
export function MissionSurface3D({ site, visual, className = 'h-72 sm:h-96' }: MissionSurface3DProps) {
  return (
    <Suspense
      fallback={
        <div className={`overflow-hidden rounded-lg border border-space-700 ${className}`}>
          <LoadingFallback />
        </div>
      }
    >
      <MissionSurfaceScene site={site} visual={visual} className={className} />
    </Suspense>
  )
}
