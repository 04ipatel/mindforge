import { clampDifficulty } from '@/lib/utils'

// =============================================================================
// lib/games/speed/constants.ts — Speed of Processing difficulty level definitions
// =============================================================================
// WHAT: Defines the 8 difficulty levels for the Speed of Processing (UFOV-style)
//   game. Each level specifies a position count (4 or 8), flash duration in ms,
//   and expected response time. Levels progress by reducing flash duration and
//   expanding from 4 to 8 positions.
// ROLE: Configuration data for the speed game plugin. No logic beyond lookup.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/speed/generator.ts (uses SPEED_LEVELS.length as max level,
//     getSpeedExpectedTimeMs for Question.expectedTimeMs)
//   - app/session/speed-input.tsx (reads flashDurationMs and positionCount
//     from question metadata)
//   - app/session/session-view.tsx (indirectly, via generated Question objects)
//   - __tests__/lib/games/speed/generator.test.ts
// LEVEL DESIGN: Progression axes are position count (4 → 8) and flash duration
//   (500ms → 50ms). Expected times increase at L4 when positions expand to 8.
// =============================================================================

// Shape of a single speed difficulty level.
// - level: 1-based integer, used as the key for difficulty lookup
// - name: human-readable description (for debugging/admin, not shown to player)
// - positionCount: number of positions arranged in a circle (4 or 8)
// - flashDurationMs: how long the target is shown before it disappears
// - expectedTimeMs: how long a competent player should take to respond
export type SpeedLevel = {
  level: number
  name: string
  positionCount: number
  flashDurationMs: number
  expectedTimeMs: number
}

// All 8 speed difficulty levels, ordered from easiest to hardest.
// Levels 1-3 use 4 positions (cardinal compass points), levels 4-8 use 8
// positions (all compass points including diagonals). Flash duration decreases
// from 500ms to 50ms, requiring faster visual processing at higher levels.
export const SPEED_LEVELS: SpeedLevel[] = [
  { level: 1, name: '4 positions, 500ms flash', positionCount: 4, flashDurationMs: 500, expectedTimeMs: 2000 },
  { level: 2, name: '4 positions, 300ms flash', positionCount: 4, flashDurationMs: 300, expectedTimeMs: 2000 },
  { level: 3, name: '4 positions, 200ms flash', positionCount: 4, flashDurationMs: 200, expectedTimeMs: 2000 },
  { level: 4, name: '8 positions, 300ms flash', positionCount: 8, flashDurationMs: 300, expectedTimeMs: 2500 },
  { level: 5, name: '8 positions, 200ms flash', positionCount: 8, flashDurationMs: 200, expectedTimeMs: 2500 },
  { level: 6, name: '8 positions, 150ms flash', positionCount: 8, flashDurationMs: 150, expectedTimeMs: 2500 },
  { level: 7, name: '8 positions, 100ms flash', positionCount: 8, flashDurationMs: 100, expectedTimeMs: 3000 },
  { level: 8, name: '8 positions, 50ms flash', positionCount: 8, flashDurationMs: 50, expectedTimeMs: 3000 },
]

// Look up the expected response time for a given difficulty level.
// Uses clampDifficulty from lib/utils.ts to guard against NaN and out-of-range values.
export function getSpeedExpectedTimeMs(difficulty: number): number {
  return SPEED_LEVELS[clampDifficulty(difficulty, SPEED_LEVELS.length) - 1].expectedTimeMs
}
