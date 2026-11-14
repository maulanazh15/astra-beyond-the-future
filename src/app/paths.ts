export const paths = {
  home: '/',
  missions: '/missions',
  briefing: (missionId: string) => `/missions/${missionId}/briefing`,
  designer: (missionId: string) => `/missions/${missionId}/design`,
  control: (missionId: string) => `/missions/${missionId}/control`,
  report: (missionId: string) => `/missions/${missionId}/report`,
}

export const DEFAULT_MISSION_ID = 'lunar-echo'
