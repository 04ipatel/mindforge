export type GameType = 'math' | 'stroop' | 'spatial' | 'switching' | 'nback'

export const GAME_TYPES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback']

export type PlayerData = {
  ratings: Record<GameType, number>
  compositeRating: number
  lastPlayed: Record<GameType, string | null>
  sprintCounts: Record<GameType, number>
}

export type SprintResult = {
  gameType: GameType
  difficulty: number
  questionCount: number
  correctCount: number
  avgResponseTimeMs: number
  ratingBefore: number
  ratingAfter: number
  timestamp: string
}

export type Question = {
  prompt: string
  answer: string
  difficulty: number
  expectedTimeMs: number
  metadata?: Record<string, unknown>
}

export type QuestionResult = {
  question: Question
  userAnswer: string
  correct: boolean
  responseTimeMs: number
}

export type GamePlugin = {
  type: GameType
  name: string
  accentColor: string
  generateQuestion: (difficulty: number) => Question
  inputMode: 'number' | 'choice' | 'binary'
}

export const DEFAULT_RATING = 1000
export const BASELINE_DIFFICULTY = 1

export function createDefaultPlayerData(): PlayerData {
  const ratings = {} as Record<GameType, number>
  const lastPlayed = {} as Record<GameType, string | null>
  const sprintCounts = {} as Record<GameType, number>
  for (const game of GAME_TYPES) {
    ratings[game] = DEFAULT_RATING
    lastPlayed[game] = null
    sprintCounts[game] = 0
  }
  return { ratings, compositeRating: DEFAULT_RATING, lastPlayed, sprintCounts }
}
