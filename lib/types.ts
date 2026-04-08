// =============================================================================
// lib/types.ts — Core type definitions for the MindForge app
// =============================================================================
// WHAT: Defines all shared types, constants, and factory functions used across
//   the entire application. This is the foundational module — nearly every other
//   file in lib/ imports from here.
// ROLE: Type layer. No logic, no side effects, no dependencies on other lib/ files.
// DEPENDENTS:
//   - lib/elo.ts (GameType, GAME_TYPES)
//   - lib/difficulty.ts (BASELINE_DIFFICULTY)
//   - lib/storage.ts (PlayerData, SprintResult, GameType, createDefaultPlayerData)
//   - lib/engine.ts (Question, QuestionResult)
//   - lib/games/math/generator.ts (Question)
//   - lib/games/stroop/generator.ts (Question)
//   - lib/games/spatial/generator.ts (Question)
//   - app/session/session-view.tsx, app/page.tsx, and all UI components
//   - __tests__/ mirrors for every module above
// =============================================================================

// All supported game types in the app. v1 ships with 'math' only, but the
// type union and GAME_TYPES array include all 5 planned modules so that
// storage, ratings, and composite calculations are forward-compatible.
// When adding a new game, add it here AND create its plugin in lib/games/.
export type GameType = 'math' | 'stroop' | 'spatial' | 'switching' | 'nback'

// Ordered array of all game types. Used by lib/elo.ts to compute composite
// ratings (equal weight across all games) and by createDefaultPlayerData()
// to initialize per-game fields. Order does not affect gameplay.
export const GAME_TYPES: GameType[] = ['math', 'stroop', 'spatial', 'switching', 'nback']

// Persistent player profile stored via lib/storage.ts.
// - ratings: per-game Elo rating (starts at DEFAULT_RATING = 1000)
// - compositeRating: simple average of all per-game ratings (see lib/elo.ts)
// - lastPlayed: ISO timestamp per game, null if never played (used for smart decay in lib/difficulty.ts)
// - sprintCounts: total sprints completed per game (determines K-factor in Elo: K=32 for <10, K=16 after)
export type PlayerData = {
  ratings: Record<GameType, number>
  compositeRating: number
  lastPlayed: Record<GameType, string | null>
  sprintCounts: Record<GameType, number>
}

// Result of a completed sprint, persisted to session history via lib/storage.ts.
// This is the primary unit of progress tracking.
// - difficulty: the difficulty level used for this sprint (1-based, game-specific max)
// - ratingBefore/ratingAfter: snapshot of Elo before and after, used by sprint-complete screen
// - timestamp: ISO string, used for smart decay calculation in lib/difficulty.ts
export type SprintResult = {
  gameType: GameType
  difficulty: number
  questionCount: number
  correctCount: number
  avgResponseTimeMs: number
  ratingBefore: number
  ratingAfter: number
  timestamp: string
}

// A single question presented to the player during a sprint.
// - prompt: display string (e.g., "42 + 17", "RED", "5-gon, 90°")
// - answer: exact string the player must provide to be correct
// - difficulty: 1-based level (clamped to game's max level)
// - expectedTimeMs: how long a competent player should take at this level;
//   used by lib/elo.ts for time multiplier and lib/difficulty.ts for speed assessment
// - metadata: game-specific data for rendering. Each game defines its own shape:
//     math: none
//     stroop: { inkColor: string, choices: string[], colorHexMap: Record<string,string> }
//     spatial: { originalShape: Point[], transformedShape: Point[], rotationAngle: number }
//   Consumed by the corresponding input component (app/session/*-input.tsx)
export type Question = {
  prompt: string
  answer: string
  difficulty: number
  expectedTimeMs: number
  metadata?: Record<string, unknown>
}

// Result of answering a single question within a sprint.
// - userAnswer: trimmed input from player
// - correct: strict equality check (userAnswer === question.answer)
// - responseTimeMs: wall-clock milliseconds from question display to answer submission
export type QuestionResult = {
  question: Question
  userAnswer: string
  correct: boolean
  responseTimeMs: number
}

// Plugin interface that each game module must implement.
// - type: must match one of the GameType values
// - name: human-readable display name
// - accentColor: hex color for UI theming (e.g., math = '#6366f1' indigo)
// - generateQuestion: pure function that produces a Question at the given difficulty
// - inputMode: determines which input component renders in sprint-view.tsx
//     'number' → math-input.tsx (keyboard number entry)
//     'choice' → stroop-input.tsx (1-4 key selection)
//     'binary' → spatial-input.tsx (F/J same/mirror selection)
export type GamePlugin = {
  type: GameType
  name: string
  accentColor: string
  generateQuestion: (difficulty: number) => Question
  inputMode: 'number' | 'choice' | 'binary'
}

// Starting Elo rating for all games. Standard chess-like baseline.
// Used by createDefaultPlayerData() and as the floor reference in Elo calculations.
export const DEFAULT_RATING = 1000

// Minimum difficulty level. Difficulty is 1-based (never 0).
// Used by lib/difficulty.ts as the floor for adjustDifficulty() and calculateStartingDifficulty().
export const BASELINE_DIFFICULTY = 1

// Factory function to create a fresh PlayerData object with all games at defaults.
// Called by lib/storage.ts when no saved data exists (first launch).
// All ratings start at DEFAULT_RATING (1000), no games played, zero sprint counts.
export function createDefaultPlayerData(): PlayerData {
  const ratings = {} as Record<GameType, number>
  const lastPlayed = {} as Record<GameType, string | null>
  const sprintCounts = {} as Record<GameType, number>
  // Initialize every game type, including ones not yet implemented,
  // so storage shape is stable when new games are added later.
  for (const game of GAME_TYPES) {
    ratings[game] = DEFAULT_RATING
    lastPlayed[game] = null
    sprintCounts[game] = 0
  }
  return { ratings, compositeRating: DEFAULT_RATING, lastPlayed, sprintCounts }
}
