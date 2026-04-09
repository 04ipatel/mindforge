// =============================================================================
// lib/games/memory/constants.ts — Memory (Digit Span) difficulty level definitions
// =============================================================================
// WHAT: Defines the 8 difficulty levels for the Memory (Digit Span) game.
//   The player sees a sequence of digits for a limited time, then must recall
//   and type them back from memory. This trains short-term/working memory
//   capacity — the core "digit span" task used in cognitive psychology.
// ROLE: Configuration data for the memory game plugin. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/memory/generator.ts (MEMORY_LEVELS for level config,
//     getMemoryExpectedTimeMs for timing)
//   - __tests__/lib/games/memory/generator.test.ts
// DIFFICULTY AXES:
//   1. Sequence length: how many digits to memorize (3 → 8).
//      Longer sequences demand more working memory capacity.
//   2. Display duration: how long the sequence is shown (3000ms → 2000ms).
//      Shorter display forces faster encoding and deeper reliance on memory.
// =============================================================================

// Shape of a single Memory difficulty level.
// - sequenceLength: number of digits in the sequence to memorize
// - displayDurationMs: how long the sequence is shown before recall phase
// - expectedTimeMs: calibrated recall time for this level (used by Elo system)
export type MemoryLevel = {
  level: number
  name: string
  sequenceLength: number
  displayDurationMs: number
  expectedTimeMs: number
}

// All 8 Memory difficulty levels, ordered from easiest to hardest.
// Progression pattern:
//   Levels 1-2: 3-4 digits with generous display time (3000ms)
//   Levels 3-4: 4-5 digits with reduced display time
//   Levels 5-6: 5-6 digits at moderate display times
//   Levels 7-8: 7-8 digits with shorter display times — near human digit span ceiling
// Within each tier, either sequence length increases or display time decreases,
// demanding progressively stronger encoding and recall.
export const MEMORY_LEVELS: MemoryLevel[] = [
  { level: 1, name: '3 digits, 3s display', sequenceLength: 3, displayDurationMs: 3000, expectedTimeMs: 5000 },
  { level: 2, name: '4 digits, 3s display', sequenceLength: 4, displayDurationMs: 3000, expectedTimeMs: 6000 },
  { level: 3, name: '4 digits, 2s display', sequenceLength: 4, displayDurationMs: 2000, expectedTimeMs: 5000 },
  { level: 4, name: '5 digits, 3s display', sequenceLength: 5, displayDurationMs: 3000, expectedTimeMs: 7000 },
  { level: 5, name: '5 digits, 2s display', sequenceLength: 5, displayDurationMs: 2000, expectedTimeMs: 6000 },
  { level: 6, name: '6 digits, 2.5s display', sequenceLength: 6, displayDurationMs: 2500, expectedTimeMs: 7000 },
  { level: 7, name: '7 digits, 2.5s display', sequenceLength: 7, displayDurationMs: 2500, expectedTimeMs: 8000 },
  { level: 8, name: '8 digits, 2s display', sequenceLength: 8, displayDurationMs: 2000, expectedTimeMs: 9000 },
]

// Look up the expected recall time for a given Memory difficulty level.
// Clamps to [1, 8] range. Used by the Elo system for time multiplier calculation.
export function getMemoryExpectedTimeMs(difficulty: number): number {
  const safe = Number.isFinite(difficulty) ? difficulty : 1
  const clamped = Math.max(1, Math.min(safe, MEMORY_LEVELS.length))
  return MEMORY_LEVELS[clamped - 1].expectedTimeMs
}
