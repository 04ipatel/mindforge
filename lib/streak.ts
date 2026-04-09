// =============================================================================
// lib/streak.ts — Streak calculation for consecutive days of play
// =============================================================================
// WHAT: Calculates current and longest play streaks from sprint history.
//   A streak is a sequence of consecutive calendar days with at least one sprint.
// ROLE: Pure logic. No side effects, no storage access, no dependencies on
//   other lib/ files besides types.
// DEPENDENCIES:
//   - lib/types.ts (SprintResult)
// DEPENDENTS:
//   - app/page.tsx (displays current streak on home screen)
//   - app/stats/stats-view.tsx (displays current + longest streak)
// =============================================================================

import type { SprintResult } from './types'

// Shape returned by calculateStreak — current streak (0 if not played today)
// and the longest streak ever recorded in the history.
export type StreakInfo = {
  current: number
  longest: number
}

// Convert an ISO timestamp to a "YYYY-MM-DD" date key in the local timezone.
// Used to normalize timestamps so multiple sessions on the same day collapse
// into a single calendar day for streak purposes.
export function toDateKey(timestamp: string): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Returns today's date key in the local timezone.
// Extracted as a helper so tests can reason about "today" consistently.
export function todayKey(): string {
  return toDateKey(new Date().toISOString())
}

// Calculate the current and longest streaks from an array of sprint results.
// Algorithm:
//   1. Extract unique calendar days from timestamps (local timezone)
//   2. Sort newest first
//   3. Walk backwards from today, counting consecutive days
//   4. Current streak = consecutive days ending at today (0 if not played today)
//   5. Longest streak = max consecutive run found in the full sorted day list
export function calculateStreak(history: SprintResult[]): StreakInfo {
  if (history.length === 0) return { current: 0, longest: 0 }

  // Step 1: Extract unique calendar days
  const daySet = new Set<string>()
  for (const result of history) {
    daySet.add(toDateKey(result.timestamp))
  }

  // Step 2: Sort unique days newest first
  const days = Array.from(daySet).sort().reverse()

  // Step 3: Calculate current streak (must include today)
  const today = todayKey()
  let current = 0
  if (days[0] === today) {
    // Walk from today backwards counting consecutive days
    current = 1
    for (let i = 1; i < days.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const expectedKey = toDateKey(expected.toISOString())
      if (days[i] === expectedKey) {
        current++
      } else {
        break
      }
    }
  }

  // Step 4: Calculate longest streak from all days
  // Re-sort oldest first for a forward scan
  const sorted = Array.from(daySet).sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    // Check if curr is exactly 1 day after prev
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  return { current, longest }
}
