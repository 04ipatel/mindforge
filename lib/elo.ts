// =============================================================================
// lib/elo.ts — Elo rating system for MindForge
// =============================================================================
// WHAT: Implements a standard Elo rating system adapted for cognitive training.
//   Players earn/lose rating points after each sprint based on accuracy and speed.
// ROLE: Pure calculation layer. No state, no side effects, no storage access.
// DEPENDENCIES:
//   - lib/types.ts (GameType, GAME_TYPES)
// DEPENDENTS:
//   - lib/storage.ts (calculateCompositeRating used when updating ratings)
//   - app/session/session-view.tsx (calculateNewRating called after each sprint)
//   - __tests__/elo.test.ts
// KEY FORMULA:
//   R_new = R_old + K * (Score - Expected)
//   where Score = accuracy * timeMultiplier (clamped 0-1)
//   and Expected uses the standard logistic curve with 400-point scale
// =============================================================================

import type { GameType } from './types'
import { GAME_TYPES } from './types'

// Calculate the expected score (win probability) for a player against a difficulty level.
// Uses the standard Elo logistic function: E = 1 / (1 + 10^((D - R) / 400))
// - playerRating: the player's current Elo for this game
// - difficultyRating: derived from difficulty level as 1000 + (level - 1) * 50
//   (this mapping is done by the caller, not here)
// Returns a value between 0 and 1. A rating equal to difficultyRating yields 0.5.
// The 400-point scale means a 400-point advantage yields ~0.91 expected score.
export function calculateExpected(playerRating: number, difficultyRating: number): number {
  return 1 / (1 + Math.pow(10, (difficultyRating - playerRating) / 400))
}

// Calculate a speed multiplier that rewards fast responses and penalizes slow ones.
// - avgResponseTimeMs: player's average response time this sprint
// - expectedTimeMs: the expected time for this difficulty level (from game constants)
// The ratio is expectedTime/actualTime, so faster = higher ratio.
// Mapping: ratio 0.5 or below → 0.8 (minimum), ratio 1.5+ → 1.2 (maximum), ratio 1.0 → 1.0
// This multiplier scales the accuracy score before Elo calculation, so speed
// matters but can never override accuracy entirely (0.8x to 1.2x range).
export function calculateTimeMultiplier(avgResponseTimeMs: number, expectedTimeMs: number): number {
  // ratio > 1 means player was faster than expected
  const ratio = expectedTimeMs / avgResponseTimeMs
  // Linear interpolation from 0.8 (at ratio=0.5) to 1.2 (at ratio=1.5)
  // Formula: 0.8 + 0.4 * clamp((ratio - 0.5), 0, 1)
  const multiplier = 0.8 + 0.4 * Math.min(1, Math.max(0, (ratio - 0.5)))
  // Final clamp to ensure we stay in [0.8, 1.2] range
  return Math.max(0.8, Math.min(1.2, multiplier))
}

// Input shape for the main rating calculation function.
// All fields come from the just-completed sprint and player profile.
type RatingInput = {
  playerRating: number        // current Elo for this game
  difficultyRating: number    // 1000 + (level - 1) * 50, computed by caller
  accuracy: number            // 0.0 to 1.0, from sprint summary
  avgResponseTimeMs: number   // average ms per question this sprint
  expectedTimeMs: number      // expected ms from game constants for this difficulty
  sprintCount: number         // total sprints played for this game (determines K-factor)
}

// Calculate the new Elo rating after a sprint.
// K-factor: 32 for first 10 sprints (volatile period for new players),
//           16 after that (stable adjustments for experienced players).
// Score = accuracy * timeMultiplier, clamped to [0, 1].
// Returns rounded integer rating.
export function calculateNewRating(input: RatingInput): number {
  const { playerRating, difficultyRating, accuracy, avgResponseTimeMs, expectedTimeMs, sprintCount } = input
  // K=32 during calibration phase (first 10 sprints), K=16 after stabilization
  const K = sprintCount < 10 ? 32 : 16
  // Expected score based on rating gap
  const expected = calculateExpected(playerRating, difficultyRating)
  // Time multiplier rewards speed (0.8x slow penalty to 1.2x speed bonus)
  const timeMultiplier = calculateTimeMultiplier(avgResponseTimeMs, expectedTimeMs)
  // Actual score: accuracy scaled by speed, clamped to valid [0, 1] range
  const score = Math.max(0, Math.min(1, accuracy * timeMultiplier))
  // Standard Elo update, rounded to integer
  return Math.round(playerRating + K * (score - expected))
}

// Calculate the composite (overall) rating as a simple average of all per-game ratings.
// All 5 game types contribute equally (20% each), even if the player hasn't played them
// (unplayed games sit at DEFAULT_RATING = 1000, pulling the composite toward center).
// Called by lib/storage.ts whenever any individual game rating is updated.
export function calculateCompositeRating(ratings: Record<GameType, number>): number {
  const sum = GAME_TYPES.reduce((acc, game) => acc + ratings[game], 0)
  return Math.round(sum / GAME_TYPES.length)
}
