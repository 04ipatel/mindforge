import { clampDifficulty } from '@/lib/utils'

// =============================================================================
// lib/games/nback/constants.ts — N-Back game difficulty level definitions
// =============================================================================
// WHAT: Defines the 8 difficulty levels for the N-Back (Working Memory) game.
//   The player sees a sequence of grid positions and must press "Match" when
//   the current position matches the position shown N steps back.
// ROLE: Configuration data for the nback game plugin. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/nback/generator.ts (NBACK_LEVELS for level config,
//     getNBackExpectedTimeMs for timing)
//   - __tests__/lib/games/nback/generator.test.ts
// DIFFICULTY AXES:
//   1. N-level: how far back to compare (1-back → 2-back → 3-back).
//      Higher N = more items to hold in working memory = harder.
//   2. Match rate: probability of a match appearing (30% → 40%).
//      Higher match rate = more matches to detect, but also more temptation to
//      over-press, making discrimination harder.
// =============================================================================

// Shape of a single N-Back difficulty level.
// - nLevel: the "N" in N-back (1, 2, or 3) — how many steps back to compare
// - matchRate: probability that a given position matches the one N steps back
// - expectedTimeMs: calibrated response time for this level (used by Elo system)
export type NBackLevel = {
  level: number
  name: string
  nLevel: number
  matchRate: number
  expectedTimeMs: number
}

// Grid dimensions: 3x3 grid with positions numbered 1-9.
// Position layout (same as numpad):
//   1 | 2 | 3
//   4 | 5 | 6
//   7 | 8 | 9
export const GRID_SIZE = 9

// All 8 N-Back difficulty levels, ordered from easiest to hardest.
// Progression pattern:
//   Levels 1-2: 1-back (easiest — only remember the last position)
//   Levels 3-5: 2-back (moderate — remember 2 positions back)
//   Levels 6-8: 3-back (hardest — remember 3 positions back)
// Within each N-level, match rate increases and expected time decreases,
// demanding faster and more accurate working memory.
export const NBACK_LEVELS: NBackLevel[] = [
  { level: 1, name: '1-back, 30% match', nLevel: 1, matchRate: 0.30, expectedTimeMs: 3000 },
  { level: 2, name: '1-back, 35% match', nLevel: 1, matchRate: 0.35, expectedTimeMs: 2500 },
  { level: 3, name: '2-back, 30% match', nLevel: 2, matchRate: 0.30, expectedTimeMs: 3500 },
  { level: 4, name: '2-back, 35% match', nLevel: 2, matchRate: 0.35, expectedTimeMs: 3000 },
  { level: 5, name: '2-back, 40% match', nLevel: 2, matchRate: 0.40, expectedTimeMs: 2500 },
  { level: 6, name: '3-back, 30% match', nLevel: 3, matchRate: 0.30, expectedTimeMs: 3500 },
  { level: 7, name: '3-back, 35% match', nLevel: 3, matchRate: 0.35, expectedTimeMs: 3000 },
  { level: 8, name: '3-back, 40% match', nLevel: 3, matchRate: 0.40, expectedTimeMs: 2500 },
]

// Look up the expected response time for a given N-Back difficulty level.
// Uses clampDifficulty from lib/utils.ts to guard against NaN and out-of-range values.
export function getNBackExpectedTimeMs(difficulty: number): number {
  return NBACK_LEVELS[clampDifficulty(difficulty, NBACK_LEVELS.length) - 1].expectedTimeMs
}
