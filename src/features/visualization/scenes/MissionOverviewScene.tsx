import type { MissionVisualState } from '../animations/missionTimeline'
import type { SceneSite } from '../types/scene'
import { MissionSceneViewer } from './MissionSceneViewer'

/** Briefing: concept playback of the mission architecture. Load through LazyScenes. */
export function MissionOverviewScene({ site, className }: { site: SceneSite; className?: string }) {
  return <MissionSceneViewer site={site} className={className} />
}

/** Mission Control: the same scene following the live simulation. Load through LazyScenes. */
export function MissionSurfaceScene({ site, visual, className }: { site: SceneSite; visual: MissionVisualState; className?: string }) {
  return <MissionSceneViewer site={site} live={visual} className={className} />
}
