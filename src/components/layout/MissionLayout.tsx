import { Navigate, Outlet, useParams } from 'react-router'
import { paths } from '../../app/paths'
import { getMission } from '../../data'
import { MissionSessionProvider } from '../../features/mission-session/MissionSessionProvider'
import { MissionStepper } from './MissionStepper'

/** Resolves the mission from the URL and shares it, plus its design/simulation session, with nested screens. */
export function MissionLayout() {
  const { missionId } = useParams()
  const mission = getMission(missionId)

  if (!mission) return <Navigate to={paths.missions} replace />

  return (
    <MissionSessionProvider key={mission.id} mission={mission}>
      <MissionStepper missionId={mission.id} />
      <Outlet context={mission} />
    </MissionSessionProvider>
  )
}
