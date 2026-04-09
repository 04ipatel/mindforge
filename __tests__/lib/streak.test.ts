// Tests for: /Users/ishanpatel/Projects/mindforge/lib/streak.ts
// Module: Streak calculation for consecutive days of play
// Key behaviors: current streak from today, longest streak ever,
// multiple sessions per day collapse, gaps break streaks

import { describe, it, expect } from 'vitest'
import { calculateStreak, toDateKey, todayKey } from '@/lib/streak'
import type { SprintResult, GameType } from '@/lib/types'

// Helper: creates a minimal SprintResult with a timestamp N days ago.
// Only the timestamp field matters for streak calculation; other fields
// are set to valid defaults so the type is satisfied.
function makeResult(daysAgo: number): SprintResult {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    gameType: 'math' as GameType,
    difficulty: 1,
    questionCount: 5,
    correctCount: 5,
    avgResponseTimeMs: 3000,
    ratingBefore: 1000,
    ratingAfter: 1010,
    timestamp: d.toISOString(),
  }
}

describe('toDateKey', () => {
  // Should produce a YYYY-MM-DD string in local timezone
  it('converts ISO timestamp to YYYY-MM-DD', () => {
    const key = toDateKey('2026-04-08T15:30:00.000Z')
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('todayKey', () => {
  // Should match the date key for "now"
  it('returns today in YYYY-MM-DD format', () => {
    const key = todayKey()
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(key).toBe(expected)
  })
})

describe('calculateStreak', () => {
  // No history at all should yield zero for both fields
  it('returns { current: 0, longest: 0 } for empty history', () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
  })

  // A single session today gives a 1-day streak
  it('returns { current: 1, longest: 1 } for only today', () => {
    const result = calculateStreak([makeResult(0)])
    expect(result).toEqual({ current: 1, longest: 1 })
  })

  // Three consecutive days ending today
  it('counts 3-day current streak for today + yesterday + 2 days ago', () => {
    const history = [makeResult(0), makeResult(1), makeResult(2)]
    const result = calculateStreak(history)
    expect(result.current).toBe(3)
  })

  // Gap in the middle: today + yesterday, then skip a day, then 3 + 4 days ago
  // Current streak should be 2 (today + yesterday), longest should be 2
  it('breaks streak at gaps: current 2, longest 2', () => {
    const history = [
      makeResult(0), makeResult(1),
      makeResult(3), makeResult(4),
    ]
    const result = calculateStreak(history)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(2)
  })

  // Not played today: current should be 0, longest should reflect past streak
  it('returns current 0 when not played today', () => {
    const history = [makeResult(1), makeResult(2), makeResult(3)]
    const result = calculateStreak(history)
    expect(result.current).toBe(0)
    expect(result.longest).toBe(3)
  })

  // Multiple sessions on the same day should count as 1 day
  it('collapses multiple sessions on same day to 1 day', () => {
    const history = [
      makeResult(0), makeResult(0), makeResult(0),
      makeResult(1),
    ]
    const result = calculateStreak(history)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(2)
  })

  // Old long streak + short current streak: longest tracks the old one
  it('tracks longest separately from current', () => {
    // Old 5-day streak: days 10-6 ago
    // Gap: day 5 ago missing
    // Current: today + yesterday (2 days)
    const history = [
      makeResult(0), makeResult(1),
      makeResult(6), makeResult(7), makeResult(8), makeResult(9), makeResult(10),
    ]
    const result = calculateStreak(history)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(5)
  })
})
