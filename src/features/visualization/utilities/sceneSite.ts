import type { LunarSite } from '../../../types/environment'
import type { SceneSite } from '../types/scene'

/** Scene-relevant view of a landing site from the game data. */
export function sceneSiteFrom(site: LunarSite): SceneSite {
  return { id: site.id, name: site.name, hazardLevel: site.hazardLevel.value, earthVisible: !site.radioQuiet }
}
