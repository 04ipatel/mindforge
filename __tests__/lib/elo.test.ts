import { describe, it, expect } from 'vitest'
import { calculateExpected, calculateNewRating, calculateTimeMultiplier, calculateCompositeRating } from '@/lib/elo'
import type { GameType } from '@/lib/types'
import { DEFAULT_RATING } from '@/lib/types'

describe('calculateExpected', () => {
  it('returns 0.5 when player and difficulty ratings are equal', () => {
    expect(calculateExpected(1000, 1000)).toBeCloseTo(0.5)
  })
  it('returns higher value when player rating exceeds difficulty', () => {
    const result = calculateExpected(1200, 1000)
    expect(result).toBeGreaterThan(0.5)
    expect(result).toBeCloseTo(0.76, 1)
  })
  it('returns lower value when difficulty exceeds player rating', () => {
    const result = calculateExpected(1000, 1200)
    expect(result).toBeLessThan(0.5)
    expect(result).toBeCloseTo(0.24, 1)
  })
})

describe('calculateTimeMultiplier', () => {
  it('returns 1.0 when response time equals expected time', () => {
    expect(calculateTimeMultiplier(5000, 5000)).toBeCloseTo(1.0)
  })
  it('returns > 1.0 when faster than expected', () => {
    const result = calculateTimeMultiplier(2500, 5000)
    expect(result).toBeGreaterThan(1.0)
    expect(result).toBeLessThanOrEqual(1.2)
  })
  it('returns < 1.0 when slower than expected', () => {
    const result = calculateTimeMultiplier(10000, 5000)
    expect(result).toBeLessThan(1.0)
    expect(result).toBeGreaterThanOrEqual(0.8)
  })
  it('clamps to 1.2 max', () => {
    expect(calculateTimeMultiplier(100, 5000)).toBeCloseTo(1.2)
  })
  it('clamps to 0.8 min', () => {
    expect(calculateTimeMultiplier(50000, 5000)).toBeCloseTo(0.8)
  })
})

describe('calculateNewRating', () => {
  it('increases rating on perfect sprint against equal difficulty', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 0,
    })
    expect(result).toBeGreaterThan(1000)
  })
  it('decreases rating on 0% accuracy', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 0,
    })
    expect(result).toBeLessThan(1000)
  })
  it('uses K=32 for first 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 5,
    })
    expect(result).toBeCloseTo(1016)
  })
  it('uses K=16 after 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 15,
    })
    expect(result).toBeCloseTo(1008)
  })
})

describe('calculateCompositeRating', () => {
  it('returns average of all ratings', () => {
    const ratings: Record<GameType, number> = { math: 1200, stroop: 1000, spatial: 1000, switching: 1000, nback: 800 }
    expect(calculateCompositeRating(ratings)).toBe(1000)
  })
  it('returns DEFAULT_RATING when all are default', () => {
    const ratings: Record<GameType, number> = { math: DEFAULT_RATING, stroop: DEFAULT_RATING, spatial: DEFAULT_RATING, switching: DEFAULT_RATING, nback: DEFAULT_RATING }
    expect(calculateCompositeRating(ratings)).toBe(DEFAULT_RATING)
  })
})
