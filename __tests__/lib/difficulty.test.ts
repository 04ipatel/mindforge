// Tests for: /Users/ishanpatel/Projects/mindforge/lib/difficulty.ts
// Module: Adaptive difficulty engine that adjusts challenge level between sprints
// Key behaviors: accuracy-band-based adjustments (with speed modifier),
// smart decay for returning players, and warm-up ramp for session starts

import { describe, it, expect } from 'vitest'
import { adjustDifficulty, calculateSmartDecay, calculateStartingDifficulty } from '@/lib/difficulty'

// Tests the per-sprint difficulty adjustment algorithm
// Uses accuracy bands: >85% up, 70-85% hold, 50-70% down 1, <50% down 2
// Speed modifies the upward adjustment: fast+accurate = +2, slow+accurate = +1
describe('adjustDifficulty', () => {
  // High accuracy + fast response (2000ms vs 5000ms expected) = aggressive increase
  // This catches players who have clearly outgrown the current level
  it('increases by 2 when accuracy > 85% and fast', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 2000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(7) // 5 + 2
  })
  // High accuracy but slow response (8000ms vs 5000ms expected) = cautious increase
  // Player is accurate but struggling with speed — don't jump too far ahead
  it('increases by 1 when accuracy > 85% and slow', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 8000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(6) // 5 + 1
  })
  // 70-85% accuracy is the neuroplasticity sweet spot — hold difficulty here
  // This is the target zone per research on optimal learning challenge
  it('holds when accuracy is 70-85%', () => {
    const result = adjustDifficulty({ accuracy: 0.78, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(5) // no change
  })
  // Below the sweet spot but not failing — gentle decrease to re-enter target zone
  it('decreases by 1 when accuracy is 50-70%', () => {
    const result = adjustDifficulty({ accuracy: 0.6, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(4) // 5 - 1
  })
  // Significantly struggling — larger decrease to prevent frustration
  it('decreases by 2 when accuracy < 50%', () => {
    const result = adjustDifficulty({ accuracy: 0.3, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(3) // 5 - 2
  })
  // Guards against difficulty going below the minimum level (1)
  // Even with terrible accuracy at level 1, we can't go to 0 or negative
  it('never goes below 1', () => {
    const result = adjustDifficulty({ accuracy: 0.1, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 1 })
    expect(result).toBe(1) // floor at 1
  })
})

// Tests smart decay: reduces effective skill level for returning players
// Formula: max(0.5, 1 - days * 0.03) — 3% decay per day, floor at 50%
describe('calculateSmartDecay', () => {
  // 1 day off: 1 - 1*0.03 = 0.97 (minimal decay)
  it('returns ~0.97 for 1 day off', () => { expect(calculateSmartDecay(1)).toBeCloseTo(0.97, 2) })
  // 7 days off: 1 - 7*0.03 = 0.79 (noticeable but not punishing)
  it('returns ~0.79 for 7 days off', () => { expect(calculateSmartDecay(7)).toBeCloseTo(0.79, 2) })
  // 17+ days: hits the 0.5 floor — never decay below half your peak skill
  // 1 - 17*0.03 = 0.49, clamped to 0.5
  it('floors at 0.5 for 17+ days off', () => {
    expect(calculateSmartDecay(17)).toBeCloseTo(0.5, 1)
    expect(calculateSmartDecay(30)).toBe(0.5) // 30 days still floors at 0.5
  })
  // No time off = no decay (identity)
  it('returns 1.0 for 0 days off', () => { expect(calculateSmartDecay(0)).toBe(1.0) })
})

// Tests session-start difficulty calculation combining decay + warm-up
// Warm-up offsets: sprint 0 = -2, sprint 1 = -1, sprint 2+ = 0 (no offset)
describe('calculateStartingDifficulty', () => {
  // Peak 10, 7 days off (decay ~0.79), sprint 2 (no warm-up offset)
  // Effective = 1 + (10 - 1) * 0.79 = 1 + 7.11 = 8.11 => rounded to 8
  it('applies decay factor to peak rating above baseline', () => {
    const result = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 7, sprintInSession: 2 })
    expect(result).toBe(8)
  })
  // Warm-up: first two sprints of a session start easier, even with no decay
  // Sprint 0 gets -2 offset, sprint 1 gets -1, sprint 2 is full difficulty
  it('applies warm-up reduction for first 2 sprints', () => {
    const sprint0 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 0 })
    const sprint1 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 1 })
    const sprint2 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 2 })
    expect(sprint0).toBeLessThan(10) // warm-up offset -2
    expect(sprint1).toBeLessThan(10) // warm-up offset -1
    expect(sprint2).toBe(10) // no warm-up offset
  })
  // Brand new player at minimum difficulty — no decay or warm-up can lower it further
  it('returns baseline for brand new player', () => {
    const result = calculateStartingDifficulty({ peakDifficulty: 1, daysOff: 0, sprintInSession: 0 })
    expect(result).toBe(1) // can't go below 1
  })
})
