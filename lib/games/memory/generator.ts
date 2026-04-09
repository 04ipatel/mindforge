// =============================================================================
// lib/games/memory/generator.ts — Digit Span sequence generator for MindForge
// =============================================================================
// WHAT: Generates digit sequences for the Memory (Digit Span) game. The player
//   sees a sequence of digits displayed briefly, then must recall and type them
//   back in order. Each question is an independent sequence — no dependency on
//   prior questions, but sequences within a batch must be unique.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/memory/constants.ts (MEMORY_LEVELS, getMemoryExpectedTimeMs)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls generateMemorySequence via BATCH_GENERATORS)
//   - app/session/memory-input.tsx (reads prompt for display, metadata for timing)
//   - __tests__/lib/games/memory/generator.test.ts
// METADATA SHAPE (stored in Question.metadata):
//   {
//     sequence: number[],        // the digit array (e.g., [3, 7, 1, 9])
//     displayDurationMs: number  // how long to show the sequence before recall
//   }
// NOTE: This is a BATCH generator (not per-question) because we need to enforce
//   uniqueness across the entire sprint's question set. The session view calls
//   generateMemorySequence(difficulty, count) to get all questions at once.
// =============================================================================

import type { Question } from '@/lib/types'
import { MEMORY_LEVELS, getMemoryExpectedTimeMs } from './constants'

// Generate a random digit sequence of the given length.
// Digits are 0-9 inclusive, chosen uniformly at random.
function randomSequence(length: number): number[] {
  const seq: number[] = []
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * 10))
  }
  return seq
}

// Convert a digit array to the answer format: digits joined without spaces.
// Example: [3, 7, 1, 9] → "3719"
function sequenceToAnswer(seq: number[]): string {
  return seq.join('')
}

// Convert a digit array to the prompt format: digits separated by spaces.
// Example: [3, 7, 1, 9] → "3 7 1 9"
function sequenceToPrompt(seq: number[]): string {
  return seq.join(' ')
}

// Generate a batch of unique digit sequences at the given difficulty.
// This is a BATCH generator — it produces all questions for a sprint at once
// to ensure no duplicate sequences within the same sprint.
//
// - difficulty: 1-based level, clamped to [1, 8] (MEMORY_LEVELS.length)
// - count: number of questions to generate (typically 5-7 from generateSprintQuestionCount)
//
// How it works:
// 1. Look up the level config (sequenceLength, displayDurationMs, expectedTimeMs)
// 2. Generate random digit sequences, re-rolling duplicates
// 3. Return array of Questions with sequence and displayDurationMs in metadata
export function generateMemorySequence(difficulty: number, count: number): Question[] {
  // Clamp difficulty to valid range [1, 8]. Guard against NaN.
  const safeDifficulty = Number.isFinite(difficulty) ? difficulty : 1
  const clamped = Math.max(1, Math.min(safeDifficulty, MEMORY_LEVELS.length))
  const level = MEMORY_LEVELS[clamped - 1]

  const questions: Question[] = []
  // Track seen answers (joined digits) to ensure uniqueness within the batch
  const seen = new Set<string>()

  for (let i = 0; i < count; i++) {
    // Generate a unique sequence (re-roll if duplicate)
    let seq: number[]
    let answer: string
    do {
      seq = randomSequence(level.sequenceLength)
      answer = sequenceToAnswer(seq)
    } while (seen.has(answer))

    seen.add(answer)

    questions.push({
      // Prompt is digits with spaces — shown during the display phase
      prompt: sequenceToPrompt(seq),
      // Answer is digits without spaces — what the user types during recall
      answer,
      difficulty: clamped,
      expectedTimeMs: getMemoryExpectedTimeMs(clamped),
      // Metadata consumed by app/session/memory-input.tsx for rendering:
      // - sequence: the raw digit array for potential future use
      // - displayDurationMs: how long to show the sequence before switching to recall
      metadata: {
        sequence: seq,
        displayDurationMs: level.displayDurationMs,
      },
    })
  }

  return questions
}
