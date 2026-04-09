// =============================================================================
// lib/games/speed/generator.ts — Speed of Processing question generator
// =============================================================================
// WHAT: Generates random speed-of-processing questions (UFOV-style) at 8
//   difficulty levels. Each question picks a random target position from the
//   available positions (4 or 8 depending on level), and the player must
//   identify where the target briefly appeared after it disappears.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/speed/constants.ts (SPEED_LEVELS for level data, getSpeedExpectedTimeMs)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls generateSpeedQuestion via GENERATORS table)
//   - __tests__/lib/games/speed/generator.test.ts
// DEDUP: The existingPrompts parameter prevents duplicate questions within a sprint.
//   If a duplicate prompt is generated, it retries up to 50 times before giving up.
// =============================================================================

import type { Question } from '@/lib/types'
import { SPEED_LEVELS, getSpeedExpectedTimeMs } from './constants'

// Generate a random integer in [min, max] inclusive.
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a single speed-of-processing question at the given difficulty level.
// This is a PER-QUESTION generator — each question is independent.
//
// - difficulty: 1-based level, clamped to [1, 8] (SPEED_LEVELS.length)
// - existingPrompts: optional Set of prompt strings already used in this sprint,
//   used to avoid duplicate questions. Retries up to 50 times if a duplicate
//   is generated.
//
// Returns a Question with:
// - prompt: the target position as a string (e.g., "3")
// - answer: same as prompt (the correct position number)
// - metadata: { targetPosition, positionCount, flashDurationMs } for the input component
export function generateSpeedQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  // Clamp difficulty to valid range [1, 8]
  const clamped = Math.max(1, Math.min(difficulty, SPEED_LEVELS.length))
  const level = SPEED_LEVELS[clamped - 1]

  let targetPosition: number
  let prompt: string
  let attempts = 0

  // Retry loop to avoid duplicate prompts within the same sprint
  do {
    targetPosition = rand(1, level.positionCount)
    prompt = String(targetPosition)
    attempts++
  } while (existingPrompts?.has(prompt) && attempts < 50)

  return {
    prompt,
    answer: prompt,
    difficulty: clamped,
    expectedTimeMs: getSpeedExpectedTimeMs(clamped),
    metadata: {
      targetPosition,
      positionCount: level.positionCount,
      flashDurationMs: level.flashDurationMs,
    },
  }
}
