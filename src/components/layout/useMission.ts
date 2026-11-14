import { useOutletContext } from 'react-router'
import type { Mission } from '../../types/mission'

/** The mission resolved by MissionLayout. Only valid inside mission routes. */
export function useMission() {
  return useOutletContext<Mission>()
}
