import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import { MissionLayout } from '../components/layout/MissionLayout'
import { MissionBriefingPage } from '../features/briefing/MissionBriefingPage'
import { MainMenuPage } from '../features/main-menu/MainMenuPage'
import { MissionControlPage } from '../features/mission-control/MissionControlPage'
import { MissionDesignerPage } from '../features/mission-design/MissionDesignerPage'
import { MissionReportPage } from '../features/mission-report/MissionReportPage'
import { MissionSelectionPage } from '../features/mission-selection/MissionSelectionPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/', element: <MainMenuPage /> },
  {
    element: <AppShell />,
    children: [
      { path: 'missions', element: <MissionSelectionPage /> },
      {
        path: 'missions/:missionId',
        element: <MissionLayout />,
        children: [
          { index: true, element: <Navigate to="briefing" replace /> },
          { path: 'briefing', element: <MissionBriefingPage /> },
          { path: 'design', element: <MissionDesignerPage /> },
          { path: 'control', element: <MissionControlPage /> },
          { path: 'report', element: <MissionReportPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
