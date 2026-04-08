import type { GameType } from './types'
import { GAME_TYPES } from './types'

export function calculateExpected(playerRating: number, difficultyRating: number): number {
  return 1 / (1 + Math.pow(10, (difficultyRating - playerRating) / 400))
}

export function calculateTimeMultiplier(avgResponseTimeMs: number, expectedTimeMs: number): number {
  const ratio = expectedTimeMs / avgResponseTimeMs
  // ratio=1 → multiplier=1.0, ratio=2+ → 1.2, ratio=0.5- → 0.8
  const multiplier = 0.8 + 0.4 * Math.min(1, Math.max(0, (ratio - 0.5)))
  return Math.max(0.8, Math.min(1.2, multiplier))
}

type RatingInput = {
  playerRating: number
  difficultyRating: number
  accuracy: number
  avgResponseTimeMs: number
  expectedTimeMs: number
  sprintCount: number
}

export function calculateNewRating(input: RatingInput): number {
  const { playerRating, difficultyRating, accuracy, avgResponseTimeMs, expectedTimeMs, sprintCount } = input
  const K = sprintCount < 10 ? 32 : 16
  const expected = calculateExpected(playerRating, difficultyRating)
  const timeMultiplier = calculateTimeMultiplier(avgResponseTimeMs, expectedTimeMs)
  const score = Math.max(0, Math.min(1, accuracy * timeMultiplier))
  return Math.round(playerRating + K * (score - expected))
}

export function calculateCompositeRating(ratings: Record<GameType, number>): number {
  const sum = GAME_TYPES.reduce((acc, game) => acc + ratings[game], 0)
  return Math.round(sum / GAME_TYPES.length)
}
