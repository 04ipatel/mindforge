// =============================================================================
// lib/difficulty.ts — Adaptive difficulty engine for MindForge
// =============================================================================
// WHAT: Determines how difficulty changes between sprints based on player
//   performance. Implements smart decay for returning players and warm-up
//   ramps at the start of each session.
// ROLE: Pure calculation layer. No state, no side effects.
// DEPENDENCIES:
//   - lib/types.ts (BASELINE_DIFFICULTY — the minimum difficulty floor, value = 1)
// DEPENDENTS:
//   - app/session/session-view.tsx (adjustDifficulty after each sprint,
//     calculateStartingDifficulty at session start)
//   - __tests__/difficulty.test.ts
// DESIGN PRINCIPLE: Targets 70-85% accuracy — the research-backed sweet spot
//   for neuroplasticity. The engine nudges difficulty up when the player is
//   too comfortable and down when they're struggling.
// =============================================================================

import { BASELINE_DIFFICULTY } from './types'

// Input shape for the post-sprint difficulty adjustment.
type AdjustInput = {
  accuracy: number            // 0.0 to 1.0, from sprint summary
  avgResponseTimeMs: number   // average ms per question this sprint
  expectedTimeMs: number      // expected ms for the current difficulty level (from game constants)
  currentDifficulty: number   // current difficulty level (1-based integer)
}

// Adjust difficulty after a completed sprint based on accuracy and speed.
// Returns the new difficulty level (integer, minimum BASELINE_DIFFICULTY = 1).
//
// Decision matrix (the core adaptive algorithm):
//   accuracy > 85% + fast (under expected time) → +2 (player is cruising, push harder)
//   accuracy > 85% + slow (at/above expected time) → +1 (accurate but working hard, gentle push)
//   accuracy 70-85% (any speed) → 0 (sweet spot, hold steady)
//   accuracy 50-70% (any speed) → -1 (struggling, ease off)
//   accuracy < 50% (any speed) → -2 (overwhelmed, drop significantly)
//
// The 70-85% band is intentionally a no-change zone — this is where the player
// is being challenged at the right level for maximum neuroplasticity.
export function adjustDifficulty(input: AdjustInput): number {
  const { accuracy, avgResponseTimeMs, expectedTimeMs, currentDifficulty } = input
  // "Fast" means the player answered quicker than the expected time for this level
  const isFast = avgResponseTimeMs < expectedTimeMs
  let delta = 0
  if (accuracy > 0.85) {
    // High accuracy: bump up, with bigger jump if also fast
    delta = isFast ? 2 : 1
  } else if (accuracy >= 0.70) {
    // Sweet spot (70-85%): hold difficulty steady
    delta = 0
  } else if (accuracy >= 0.50) {
    // Below target: reduce by 1
    delta = -1
  } else {
    // Well below target (<50%): reduce by 2
    delta = -2
  }
  // Never go below BASELINE_DIFFICULTY (1)
  return Math.max(BASELINE_DIFFICULTY, currentDifficulty + delta)
}

// Calculate how much to reduce a returning player's difficulty based on days away.
// Returns a multiplier between 0.5 and 1.0.
// - 0 days off → 1.0 (no decay)
// - 10 days off → 0.7 (30% reduction)
// - 17+ days off → 0.5 (floor — never lose more than half your progress)
// The 3% per day rate (0.03) is tuned so casual players (few days off) barely
// notice, but long absences get a meaningful but not punishing reset.
export function calculateSmartDecay(daysOff: number): number {
  if (daysOff <= 0) return 1.0
  // 0.5 floor means player retains at least 50% of progress above baseline
  return Math.max(0.5, 1 - daysOff * 0.03)
}

// Input shape for session-start difficulty calculation.
type StartingDifficultyInput = {
  peakDifficulty: number    // highest difficulty the player has reached for this game
  daysOff: number           // days since last played (0 = played today)
  sprintInSession: number   // 0-indexed sprint number within current session
}

// Calculate the difficulty level to use at the start of a session.
// Combines smart decay (for returning players) with warm-up ramp (for all players).
//
// Steps:
// 1. Apply decay: reduce the range above baseline by the decay factor
//    decayed = BASELINE + (peak - BASELINE) * decayFactor
// 2. Apply warm-up: subtract levels for the first 2 sprints
//    sprint 0 (first sprint): -2 levels (easy on-ramp)
//    sprint 1 (second sprint): -1 level (gentle transition)
//    sprint 2+: no reduction (full calculated difficulty)
// 3. Clamp to BASELINE_DIFFICULTY minimum and round to integer
//
// Example: peakDifficulty=10, 5 days off (decay=0.85), first sprint
//   decayed = 1 + (10-1)*0.85 = 8.65
//   with warmup: 8.65 - 2 = 6.65 → rounds to 7
export function calculateStartingDifficulty(input: StartingDifficultyInput): number {
  const { peakDifficulty, daysOff, sprintInSession } = input
  // Step 1: apply smart decay based on days away
  const decayFactor = calculateSmartDecay(daysOff)
  // Only decay the range above baseline, not the baseline itself
  const decayed = BASELINE_DIFFICULTY + (peakDifficulty - BASELINE_DIFFICULTY) * decayFactor
  // Step 2: warm-up reduction for first 2 sprints of a session
  let warmupReduction = 0
  if (sprintInSession === 0) warmupReduction = 2    // first sprint: -2 levels
  else if (sprintInSession === 1) warmupReduction = 1 // second sprint: -1 level
  // Step 3: clamp to minimum and round
  return Math.max(BASELINE_DIFFICULTY, Math.round(decayed - warmupReduction))
}
