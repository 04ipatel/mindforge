// =============================================================================
// lib/games/stroop/generator.ts — Stroop question generator for MindForge
// =============================================================================
// WHAT: Generates Stroop effect questions where a color WORD is displayed in a
//   (possibly different) INK COLOR. The player must identify the INK color,
//   ignoring the word itself. This tests selective attention and inhibitory control.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/stroop/constants.ts (STROOP_LEVELS, getStroopExpectedTimeMs,
//     getColorsForLevel, StroopColor)
// DEPENDENTS:
//   - The stroop GamePlugin object (registered in app/session/)
//   - app/session/session-view.tsx (calls generateStroopQuestion via the plugin)
//   - app/session/stroop-input.tsx (reads metadata.inkColor, metadata.choices,
//     metadata.colorHexMap to render the colored word and choice buttons)
//   - __tests__/stroop.test.ts
// METADATA SHAPE (stored in Question.metadata):
//   {
//     inkColor: string,          // hex color to render the word in (e.g., '#ef4444')
//     choices: string[],         // 4 color name strings for the choice buttons
//     colorHexMap: Record<string, string>  // name→hex mapping for rendering choice colors
//   }
// =============================================================================

import type { Question } from '@/lib/types'
import { STROOP_LEVELS, getStroopExpectedTimeMs, getColorsForLevel } from './constants'
import type { StroopColor } from './constants'
import { clampDifficulty } from '@/lib/utils'

// Pick a random element from an array.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Fisher-Yates shuffle. Returns a new shuffled array (does not mutate input).
// Used to randomize the order of choice buttons so the correct answer
// isn't always in the same position.
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Generate a single Stroop question at the given difficulty level.
// This is the main entry point — called by the stroop GamePlugin's generateQuestion method.
//
// - difficulty: 1-based level, clamped to [1, 8] (STROOP_LEVELS.length)
// - existingPrompts: optional Set of "word|inkColor" keys already used this sprint,
//   used to avoid showing the same word/ink combination twice. Retries up to 50 times.
//
// How it works:
// 1. Determine if this trial is congruent (word matches ink) based on level's congruenceRatio
// 2. Pick the word (a random color name from the active color set)
// 3. Pick the ink color: same as word if congruent, different color if incongruent
// 4. Build 4 choices: the correct answer (ink color) + 3 random distractors, shuffled
// 5. Return Question with the word as prompt (UPPERCASED) and ink color name as answer
//
// The player sees "RED" rendered in blue ink → correct answer is "blue"
export function generateStroopQuestion(difficulty: number, existingPrompts?: Set<string>): Question {
  // Clamp difficulty to valid range [1, 8] using shared utility
  const clamped = clampDifficulty(difficulty, STROOP_LEVELS.length)
  const level = STROOP_LEVELS[clamped - 1]
  // Get the color set for this level (4, 6, or 8 colors)
  const colors = getColorsForLevel(level.colorCount)

  let word: StroopColor       // the color name displayed as text
  let inkColor: StroopColor   // the actual ink/font color the word is rendered in
  let promptKey: string        // dedup key: "word|ink" combination
  let attempts = 0

  // Retry loop to avoid duplicate word|ink combinations within a sprint
  do {
    // Decide congruency for this trial based on the level's ratio
    // congruenceRatio=0.75 means 75% chance the word matches the ink color
    const isCongruent = Math.random() < level.congruenceRatio
    // Pick a random color word from the active set
    word = pick(colors)

    if (isCongruent) {
      // Congruent: ink matches word (e.g., "RED" in red ink — easy, no conflict)
      inkColor = word
    } else {
      // Incongruent: ink differs from word (e.g., "RED" in blue ink — Stroop interference)
      const others = colors.filter(c => c.name !== word.name)
      inkColor = pick(others)
    }

    // Dedup key combines word and ink to identify unique trials
    promptKey = `${word.name}|${inkColor.name}`
    attempts++
  } while (existingPrompts?.has(promptKey) && attempts < 50)

  // Use ALL colors in the active set as choices, sorted alphabetically.
  // This keeps choice positions consistent across the entire sprint — the user
  // can learn "blue is always key 1, green is key 2, red is key 3, yellow is key 4"
  // and respond by position without re-reading choices each question.
  // At levels 1-3 this is 4 choices (keys 1-4), levels 4-5 is 6 (keys 1-6),
  // levels 6-8 is 8 (keys 1-8).
  const choices = [...colors].sort((a, b) => a.name.localeCompare(b.name))

  return {
    // Prompt is the word displayed in uppercase (e.g., "RED", "BLUE")
    // The UI renders this text in the inkColor hex color
    prompt: word.name.toUpperCase(),
    // Answer is the ink color NAME (lowercase), e.g., "blue"
    answer: inkColor.name,
    difficulty: clamped,
    expectedTimeMs: getStroopExpectedTimeMs(clamped),
    // Metadata consumed by app/session/stroop-input.tsx for rendering:
    // - inkColor: hex string to set the text color CSS
    // - choices: array of 4 color names for the choice buttons
    // - colorHexMap: name→hex lookup so the UI can color each choice button
    metadata: {
      inkColor: inkColor.hex,
      choices: choices.map(c => c.name),
      colorHexMap: Object.fromEntries(colors.map(c => [c.name, c.hex])),
    },
  }
}
