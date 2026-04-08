import { describe, it, expect } from 'vitest'
import { adjustDifficulty, calculateSmartDecay, calculateStartingDifficulty } from '@/lib/difficulty'

describe('adjustDifficulty', () => {
  it('increases by 2 when accuracy > 85% and fast', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 2000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(7)
  })
  it('increases by 1 when accuracy > 85% and slow', () => {
    const result = adjustDifficulty({ accuracy: 0.9, avgResponseTimeMs: 8000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(6)
  })
  it('holds when accuracy is 70-85%', () => {
    const result = adjustDifficulty({ accuracy: 0.78, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(5)
  })
  it('decreases by 1 when accuracy is 50-70%', () => {
    const result = adjustDifficulty({ accuracy: 0.6, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(4)
  })
  it('decreases by 2 when accuracy < 50%', () => {
    const result = adjustDifficulty({ accuracy: 0.3, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 5 })
    expect(result).toBe(3)
  })
  it('never goes below 1', () => {
    const result = adjustDifficulty({ accuracy: 0.1, avgResponseTimeMs: 5000, expectedTimeMs: 5000, currentDifficulty: 1 })
    expect(result).toBe(1)
  })
})

describe('calculateSmartDecay', () => {
  it('returns ~0.97 for 1 day off', () => { expect(calculateSmartDecay(1)).toBeCloseTo(0.97, 2) })
  it('returns ~0.79 for 7 days off', () => { expect(calculateSmartDecay(7)).toBeCloseTo(0.79, 2) })
  it('floors at 0.5 for 17+ days off', () => {
    expect(calculateSmartDecay(17)).toBeCloseTo(0.5, 1)
    expect(calculateSmartDecay(30)).toBe(0.5)
  })
  it('returns 1.0 for 0 days off', () => { expect(calculateSmartDecay(0)).toBe(1.0) })
})

describe('calculateStartingDifficulty', () => {
  it('applies decay factor to peak rating above baseline', () => {
    const result = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 7, sprintInSession: 2 })
    expect(result).toBe(8)
  })
  it('applies warm-up reduction for first 2 sprints', () => {
    const sprint0 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 0 })
    const sprint1 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 1 })
    const sprint2 = calculateStartingDifficulty({ peakDifficulty: 10, daysOff: 0, sprintInSession: 2 })
    expect(sprint0).toBeLessThan(10)
    expect(sprint1).toBeLessThan(10)
    expect(sprint2).toBe(10)
  })
  it('returns baseline for brand new player', () => {
    const result = calculateStartingDifficulty({ peakDifficulty: 1, daysOff: 0, sprintInSession: 0 })
    expect(result).toBe(1)
  })
})
