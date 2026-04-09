// =============================================================================
// lib/games/stroop/constants.ts — Stroop game difficulty level definitions
// =============================================================================
// WHAT: Defines the color sets and 8 difficulty levels for the Stroop (Attention)
//   game. The Stroop effect tests attention by showing a color word printed in
//   a different ink color — the player must identify the INK color, not the word.
// ROLE: Configuration data for the stroop game plugin. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/stroop/generator.ts (STROOP_LEVELS for level config,
//     getStroopExpectedTimeMs for timing, getColorsForLevel for color sets)
//   - __tests__/stroop.test.ts
// DIFFICULTY AXES:
//   1. Congruence ratio: % of trials where word matches ink color (75% → 15%).
//      Lower ratio = more incongruent trials = harder (stronger Stroop interference).
//   2. Color count: number of distinct colors in play (4 → 6 → 8).
//      More colors = more choices = harder to identify the ink color.
// =============================================================================

// A single color with its display name and hex value.
// Used both for rendering the word in ink and for choice buttons.
export type StroopColor = {
  name: string   // lowercase color name (e.g., 'red') — also used as the answer string
  hex: string    // Tailwind-matching hex for rendering (e.g., '#ef4444')
}

// Base set of 4 colors. Used by levels 1-3.
// These are the most distinguishable colors — high contrast against each other.
export const BASE_COLORS: StroopColor[] = [
  { name: 'red', hex: '#ef4444' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'yellow', hex: '#eab308' },
]

// Extended set of 6 colors. Used by levels 4-5.
// Adds purple and orange — these can be confused with existing colors,
// increasing cognitive load.
export const EXTENDED_COLORS: StroopColor[] = [
  ...BASE_COLORS,
  { name: 'purple', hex: '#a855f7' },
  { name: 'orange', hex: '#f97316' },
]

// Full set of 8 colors. Used by levels 6-8.
// Adds pink and cyan — at 8 colors, the player must distinguish between
// similar hues (red/pink/orange, blue/cyan/purple), maximizing interference.
export const FULL_COLORS: StroopColor[] = [
  ...EXTENDED_COLORS,
  { name: 'pink', hex: '#ec4899' },
  { name: 'cyan', hex: '#06b6d4' },
]

// Shape of a single stroop difficulty level.
// - colorCount: how many distinct colors are in play (4, 6, or 8)
// - congruenceRatio: probability that word matches ink color (0.0 to 1.0).
//   Higher = easier (word "RED" is printed in red ink — no conflict).
//   Lower = harder (word "RED" printed in blue ink — must suppress reading).
// - expectedTimeMs: calibrated response time for this level (used by Elo system)
export type StroopLevel = {
  level: number
  name: string
  colorCount: number
  congruenceRatio: number
  expectedTimeMs: number
}

// All 8 stroop difficulty levels, ordered from easiest to hardest.
// Progression pattern:
//   Levels 1-3: 4 colors, congruence drops 75% → 50% → 25%
//   Levels 4-5: 6 colors, congruence 50% → 25%
//   Levels 6-8: 8 colors, congruence 50% → 25% → 15%
// Expected times decrease at higher levels because the player must respond
// faster (time pressure increases alongside cognitive load).
//   3000ms (easy) → 1200ms (hardest — requires automatic processing)
export const STROOP_LEVELS: StroopLevel[] = [
  { level: 1, name: '4 colors, 75% congruent', colorCount: 4, congruenceRatio: 0.75, expectedTimeMs: 3000 },
  { level: 2, name: '4 colors, 50% congruent', colorCount: 4, congruenceRatio: 0.50, expectedTimeMs: 2500 },
  { level: 3, name: '4 colors, 25% congruent', colorCount: 4, congruenceRatio: 0.25, expectedTimeMs: 2000 },
  { level: 4, name: '6 colors, 50% congruent', colorCount: 6, congruenceRatio: 0.50, expectedTimeMs: 2500 },
  { level: 5, name: '6 colors, 25% congruent', colorCount: 6, congruenceRatio: 0.25, expectedTimeMs: 2000 },
  { level: 6, name: '8 colors, 50% congruent', colorCount: 8, congruenceRatio: 0.50, expectedTimeMs: 2000 },
  { level: 7, name: '8 colors, 25% congruent', colorCount: 8, congruenceRatio: 0.25, expectedTimeMs: 1500 },
  { level: 8, name: '8 colors, 15% congruent', colorCount: 8, congruenceRatio: 0.15, expectedTimeMs: 1200 },
]

// Look up the expected response time for a given stroop difficulty level.
// Clamps to [1, 8] range. Higher difficulties have shorter expected times
// because the game demands faster automatic processing.
export function getStroopExpectedTimeMs(difficulty: number): number {
  const safe = Number.isFinite(difficulty) ? difficulty : 1
  const clamped = Math.max(1, Math.min(safe, STROOP_LEVELS.length))
  return STROOP_LEVELS[clamped - 1].expectedTimeMs
}

// Return the appropriate color set for a given color count.
// - colorCount <= 4 → BASE_COLORS (4 colors: red, blue, green, yellow)
// - colorCount <= 6 → EXTENDED_COLORS (6 colors: adds purple, orange)
// - colorCount > 6  → FULL_COLORS (8 colors: adds pink, cyan)
// This is used by the generator to determine which colors are in play
// for a given difficulty level.
export function getColorsForLevel(colorCount: number): StroopColor[] {
  if (colorCount <= 4) return BASE_COLORS
  if (colorCount <= 6) return EXTENDED_COLORS
  return FULL_COLORS
}
