// =============================================================================
// lib/utils.ts — Shared utility functions for MindForge
// =============================================================================
// WHAT: Provides common utility functions used across game modules and session
//   logic. Eliminates duplication of NaN guard patterns, date calculations,
//   and Elo-to-difficulty conversions that were previously inlined in many files.
// ROLE: Pure utility layer. No React dependencies, no side effects, no state.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/*/constants.ts (uses clampDifficulty for expected time lookups)
//   - lib/games/*/generator.ts (uses clampDifficulty for difficulty clamping)
//   - lib/registry.ts (uses clampDifficulty in generateQuestions)
//   - app/session/session-view.tsx (uses daysSince, eloToDifficulty, difficultyToElo)
// =============================================================================

// Clamp a difficulty value to a valid range [1, maxLevel].
// Guards against NaN and non-finite values by falling back to 1.
// This replaces the repeated pattern of:
//   const safe = Number.isFinite(difficulty) ? difficulty : 1
//   const clamped = Math.max(1, Math.min(safe, MAX_LEVEL))
// that was duplicated in every generator and constants file.
export function clampDifficulty(difficulty: number, maxLevel: number): number {
  const safe = Number.isFinite(difficulty) ? difficulty : 1
  return Math.max(1, Math.min(safe, maxLevel))
}

// Milliseconds in one day (24 * 60 * 60 * 1000 = 86400000).
// Used for calculating days since last played (smart decay).
// Previously a magic number (86400000) inlined in session-view.tsx.
export const MS_PER_DAY = 86400000

// Calculate the number of full days between now and an ISO timestamp.
// Returns 0 if the timestamp is null (game never played = no decay).
// Used by session-view.tsx for smart decay calculation.
export function daysSince(iso: string | null): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY)
}

// Elo points per difficulty level. Each difficulty level maps to 50 Elo points
// above the base. Used in both directions (Elo→difficulty, difficulty→Elo).
// Previously a magic number (50) inlined in session-view.tsx.
export const ELO_PER_LEVEL = 50

// Base Elo rating (1000). Difficulty level 1 corresponds to this rating.
// Previously referenced as a magic number in session-view.tsx.
export const BASE_ELO = 1000

// Convert an Elo rating to a difficulty level.
// Formula: level = round((rating - 1000) / 50) + 1, floored at 1.
// Previously inlined in session-view.tsx as:
//   Math.max(1, Math.round((rating - 1000) / 50) + 1)
export function eloToDifficulty(rating: number): number {
  return Math.max(1, Math.round((rating - BASE_ELO) / ELO_PER_LEVEL) + 1)
}

// Convert a difficulty level to an Elo rating.
// Formula: rating = 1000 + (level - 1) * 50
// Previously inlined in session-view.tsx as:
//   1000 + (difficulty - 1) * 50
export function difficultyToElo(difficulty: number): number {
  return BASE_ELO + (difficulty - 1) * ELO_PER_LEVEL
}
