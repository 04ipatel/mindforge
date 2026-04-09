// =============================================================================
// lib/games/nback/generator.ts — N-Back sequence generator for MindForge
// =============================================================================
// WHAT: Generates a sequence of N-Back questions where the player sees grid
//   positions and must identify when the current position matches the one shown
//   N steps back. This trains working memory — the player must continuously
//   update and compare against a sliding window of past positions.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/nback/constants.ts (NBACK_LEVELS, getNBackExpectedTimeMs, GRID_SIZE)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls generateNBackSequence via BATCH_GENERATORS)
//   - app/session/nback-input.tsx (reads metadata.gridPosition, metadata.nLevel,
//     metadata.stepIndex to render the 3x3 grid and N-level label)
//   - __tests__/lib/games/nback/generator.test.ts
// METADATA SHAPE (stored in Question.metadata):
//   {
//     gridPosition: number,   // 1-9 position on the 3x3 grid
//     nLevel: number,         // the N in N-back (1, 2, or 3)
//     stepIndex: number       // 0-based position within the sequence
//   }
// NOTE: This is a BATCH generator (not per-question) because each question's
//   answer depends on the position shown N steps earlier. The session view
//   calls generateNBackSequence(difficulty, count) to get all questions at once.
// =============================================================================

import type { Question } from '@/lib/types'
import { NBACK_LEVELS, getNBackExpectedTimeMs, GRID_SIZE } from './constants'

// Generate a random grid position (1-9 inclusive).
function randomPosition(): number {
  return Math.floor(Math.random() * GRID_SIZE) + 1
}

// Build the position sequence with controlled match probability.
// The first N positions are always random (no N-back reference exists yet).
// After that, each position has a matchRate probability of reusing the position
// from N steps back, and a (1 - matchRate) probability of picking a DIFFERENT position.
function generatePositionSequence(count: number, n: number, matchRate: number): number[] {
  const positions: number[] = []

  for (let i = 0; i < count; i++) {
    if (i < n) {
      // First N positions: no N-back reference exists, pick randomly
      positions.push(randomPosition())
    } else {
      // Decide: match the N-back position, or pick a different one?
      const nBackPosition = positions[i - n]
      if (Math.random() < matchRate) {
        // Match: reuse the position from N steps back
        positions.push(nBackPosition)
      } else {
        // No match: pick a position that differs from the N-back position
        let pos: number
        do {
          pos = randomPosition()
        } while (pos === nBackPosition)
        positions.push(pos)
      }
    }
  }

  return positions
}

// Generate a full sequence of N-Back questions at the given difficulty.
// This is a BATCH generator — it produces all questions for a sprint at once
// because each question's answer depends on positions shown earlier in the sequence.
//
// - difficulty: 1-based level, clamped to [1, 8] (NBACK_LEVELS.length)
// - count: number of questions to generate (typically 5-7 from generateSprintQuestionCount)
//
// How it works:
// 1. Look up the level config (nLevel, matchRate, expectedTimeMs)
// 2. Build a position sequence with controlled match probability
// 3. For each position, determine if it matches the position N steps back
// 4. Return array of Questions with gridPosition, nLevel, stepIndex in metadata
export function generateNBackSequence(difficulty: number, count: number): Question[] {
  // Clamp difficulty to valid range [1, 8]
  const clamped = Math.max(1, Math.min(difficulty, NBACK_LEVELS.length))
  const level = NBACK_LEVELS[clamped - 1]

  // Build the full position sequence
  const positions = generatePositionSequence(count, level.nLevel, level.matchRate)

  // Convert positions to Question objects
  return positions.map((pos, i) => {
    // First N positions always have answer 'no-match' (not enough history)
    // After that, compare with the position N steps back
    const isMatch = i >= level.nLevel && pos === positions[i - level.nLevel]
    const answer = isMatch ? 'match' : 'no-match'

    return {
      // Prompt is the position as a string (consumed by nback-input.tsx for grid highlight)
      prompt: String(pos),
      answer,
      difficulty: clamped,
      expectedTimeMs: getNBackExpectedTimeMs(clamped),
      // Metadata consumed by app/session/nback-input.tsx for rendering:
      // - gridPosition: which cell (1-9) to highlight on the 3x3 grid
      // - nLevel: the N in N-back (displayed as "{N}-Back" label)
      // - stepIndex: position within the sequence (for debugging/analytics)
      metadata: {
        gridPosition: pos,
        nLevel: level.nLevel,
        stepIndex: i,
      },
    }
  })
}
