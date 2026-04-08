// =============================================================================
// lib/games/math/constants.ts — Math game difficulty level definitions
// =============================================================================
// WHAT: Defines the 13 difficulty levels for the Mental Math game, each with
//   a human-readable name and expected completion time. Levels progress from
//   single-digit addition to multi-step algebra.
// ROLE: Configuration data for the math game plugin. No logic beyond lookup.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/math/generator.ts (uses MATH_LEVELS.length as max level,
//     getExpectedTimeMs for Question.expectedTimeMs)
//   - app/session/session-view.tsx (indirectly, via generated Question objects)
//   - __tests__/math.test.ts
// LEVEL DESIGN: Progression axes are operand size, carry complexity, operation
//   type, and mixed operations. Expected times increase with cognitive load.
// =============================================================================

// Shape of a single math difficulty level.
// - level: 1-based integer, used as the key in the generator lookup table
// - name: human-readable description (not shown to player, used for debugging/admin)
// - expectedTimeMs: how long a competent player should take at this level;
//   fed into lib/elo.ts for time multiplier and lib/difficulty.ts for speed assessment
export type MathLevel = {
  level: number
  name: string
  expectedTimeMs: number
}

// All 13 math difficulty levels, ordered from easiest to hardest.
// The generator in lib/games/math/generator.ts has a corresponding generateLevelN()
// function for each level. When adding a new level, add it here AND add its generator.
//
// Expected time values (in ms) are calibrated estimates:
//   Levels 1-2:  3000ms — single-digit, near-instant for practiced players
//   Levels 3-4:  5000-6000ms — double-digit, carry adds ~1s
//   Level 5:     8000ms — triple-digit addition, multiple carries possible
//   Levels 6-7:  4000-5000ms — multiplication tables (easier ones first)
//   Levels 8-9:  8000ms — multi-digit multiplication and division
//   Level 10:    10000ms — mixed operations (multiply then add/subtract)
//   Level 11:    10000ms — square roots of perfect squares (2-256)
//   Level 12:    12000ms — fraction addition with simplification
//   Level 13:    15000ms — single-variable linear algebra (solve for x)
export const MATH_LEVELS: MathLevel[] = [
  { level: 1, name: 'Single-digit addition', expectedTimeMs: 3000 },
  { level: 2, name: 'Single-digit subtraction', expectedTimeMs: 3000 },
  { level: 3, name: 'Double-digit add (no carry)', expectedTimeMs: 5000 },
  { level: 4, name: 'Double-digit add (with carry)', expectedTimeMs: 6000 },
  { level: 5, name: 'Triple-digit addition', expectedTimeMs: 8000 },
  { level: 6, name: 'Multiplication tables (2,5,10)', expectedTimeMs: 4000 },
  { level: 7, name: 'Mixed multiplication', expectedTimeMs: 5000 },
  { level: 8, name: 'Multi-digit x single-digit', expectedTimeMs: 8000 },
  { level: 9, name: 'Division', expectedTimeMs: 8000 },
  { level: 10, name: 'Mixed operations', expectedTimeMs: 10000 },
  { level: 11, name: 'Square roots', expectedTimeMs: 10000 },
  { level: 12, name: 'Fractions', expectedTimeMs: 12000 },
  { level: 13, name: 'Multi-step algebra', expectedTimeMs: 15000 },
]

// Look up the expected response time for a given difficulty level.
// Clamps to the maximum level (13) if a higher value is passed — this handles
// cases where the difficulty engine overshoots the math game's max level.
// Uses 1-based indexing: difficulty 1 → MATH_LEVELS[0].
export function getExpectedTimeMs(difficulty: number): number {
  const clamped = Math.min(difficulty, MATH_LEVELS.length)
  return MATH_LEVELS[clamped - 1].expectedTimeMs
}
