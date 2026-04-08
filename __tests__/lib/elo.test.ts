// Tests for: /Users/ishanpatel/Projects/mindforge/lib/elo.ts
// Module: Elo rating system for tracking player skill per game type
// Key behaviors: expected score calculation (logistic curve), time-based multiplier,
// rating updates with variable K-factor, and composite rating across all games

import { describe, it, expect } from 'vitest'
import { calculateExpected, calculateNewRating, calculateTimeMultiplier, calculateCompositeRating } from '@/lib/elo'
import type { GameType } from '@/lib/types'
import { DEFAULT_RATING } from '@/lib/types'

// Tests the standard Elo expected score formula: 1 / (1 + 10^((D - P) / 400))
// This determines how likely a player is to succeed at a given difficulty
describe('calculateExpected', () => {
  // Equal ratings should yield a coin flip (50% expected success)
  it('returns 0.5 when player and difficulty ratings are equal', () => {
    expect(calculateExpected(1000, 1000)).toBeCloseTo(0.5)
  })
  // 200-point advantage yields ~76% expected score per standard Elo tables
  it('returns higher value when player rating exceeds difficulty', () => {
    const result = calculateExpected(1200, 1000)
    expect(result).toBeGreaterThan(0.5)
    expect(result).toBeCloseTo(0.76, 1) // 0.76 is the standard Elo expected value for +200 gap
  })
  // Symmetric: 200-point disadvantage yields ~24% (complement of 76%)
  it('returns lower value when difficulty exceeds player rating', () => {
    const result = calculateExpected(1000, 1200)
    expect(result).toBeLessThan(0.5)
    expect(result).toBeCloseTo(0.24, 1) // Mirror of the +200 case above
  })
})

// Tests the speed bonus/penalty multiplier applied to Elo score
// Range is clamped to [0.8, 1.2] — fast responses get a bonus, slow get a penalty
describe('calculateTimeMultiplier', () => {
  // Matching expected time = no adjustment (neutral multiplier)
  it('returns 1.0 when response time equals expected time', () => {
    expect(calculateTimeMultiplier(5000, 5000)).toBeCloseTo(1.0)
  })
  // Responding in half the expected time earns a speed bonus
  it('returns > 1.0 when faster than expected', () => {
    const result = calculateTimeMultiplier(2500, 5000) // 2500ms vs 5000ms expected
    expect(result).toBeGreaterThan(1.0)
    expect(result).toBeLessThanOrEqual(1.2) // Must not exceed max clamp
  })
  // Responding in double the expected time incurs a speed penalty
  it('returns < 1.0 when slower than expected', () => {
    const result = calculateTimeMultiplier(10000, 5000) // 10000ms vs 5000ms expected
    expect(result).toBeLessThan(1.0)
    expect(result).toBeGreaterThanOrEqual(0.8) // Must not go below min clamp
  })
  // Guards against extremely fast responses producing unbounded bonuses
  it('clamps to 1.2 max', () => {
    expect(calculateTimeMultiplier(100, 5000)).toBeCloseTo(1.2) // 100ms = nearly instant
  })
  // Guards against extremely slow responses producing unbounded penalties
  it('clamps to 0.8 min', () => {
    expect(calculateTimeMultiplier(50000, 5000)).toBeCloseTo(0.8) // 50000ms = 10x expected
  })
})

// Tests the main Elo update formula: R_new = R_old + K * (Score - Expected)
// Score = accuracy * timeMultiplier; K varies based on sprint count
describe('calculateNewRating', () => {
  // Perfect performance against equal difficulty should always raise rating
  it('increases rating on perfect sprint against equal difficulty', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 0,
    })
    expect(result).toBeGreaterThan(1000)
  })
  // Zero accuracy should always lower rating
  it('decreases rating on 0% accuracy', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 0,
    })
    expect(result).toBeLessThan(1000)
  })
  // K=32 for new players (< 10 sprints) to allow rapid calibration
  // 1000 + 32 * (1.0 - 0.5) = 1016
  it('uses K=32 for first 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 5, // < 10 sprints
    })
    expect(result).toBeCloseTo(1016) // K=32, score=1.0, expected=0.5 => 32*0.5=16
  })
  // K=16 for established players (>= 10 sprints) for stability
  // 1000 + 16 * (1.0 - 0.5) = 1008
  it('uses K=16 after 10 sprints', () => {
    const result = calculateNewRating({
      playerRating: 1000, difficultyRating: 1000, accuracy: 1.0,
      avgResponseTimeMs: 3000, expectedTimeMs: 3000, sprintCount: 15, // >= 10 sprints
    })
    expect(result).toBeCloseTo(1008) // K=16, score=1.0, expected=0.5 => 16*0.5=8
  })
})

// Tests composite rating: equal-weight average across all 5 game types
describe('calculateCompositeRating', () => {
  // (1200 + 1000 + 1000 + 1000 + 800) / 5 = 1000
  it('returns average of all ratings', () => {
    const ratings: Record<GameType, number> = { math: 1200, stroop: 1000, spatial: 1000, switching: 1000, nback: 800 }
    expect(calculateCompositeRating(ratings)).toBe(1000)
  })
  // Ensures default state produces the baseline rating (1000)
  it('returns DEFAULT_RATING when all are default', () => {
    const ratings: Record<GameType, number> = { math: DEFAULT_RATING, stroop: DEFAULT_RATING, spatial: DEFAULT_RATING, switching: DEFAULT_RATING, nback: DEFAULT_RATING }
    expect(calculateCompositeRating(ratings)).toBe(DEFAULT_RATING)
  })
})
