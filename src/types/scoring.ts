export type ScoreCategoryId = 'objectives' | 'engineering' | 'science' | 'efficiency' | 'risk'

export type ScoreCategory = {
  id: ScoreCategoryId
  label: string
  /** 0–100. */
  score: number
  /** Share of the overall score (weights sum to 1). */
  weight: number
  note: string
}

export type MissionRating = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

export type MissionScore = {
  /** 0–100. */
  total: number
  rating: MissionRating
  categories: ScoreCategory[]
}
