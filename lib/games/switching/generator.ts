// =============================================================================
// lib/games/switching/generator.ts — Task Switching question generator for MindForge
// =============================================================================
// WHAT: Generates a sequence of Task Switching questions where the player classifies
//   numbers according to a rule (odd/even, high/low, multiple of 3) that may change
//   mid-sprint. The switching pattern depends on difficulty level.
// ROLE: Game plugin logic. Pure functions, no side effects, no state.
// DEPENDENCIES:
//   - lib/types.ts (Question type)
//   - lib/games/switching/constants.ts (SWITCHING_LEVELS, getSwitchingExpectedTimeMs,
//     RULE_LABELS, RULE_CHOICES, SwitchingRuleType)
// DEPENDENTS:
//   - app/session/session-view.tsx (calls generateSwitchingSequence via BATCH_GENERATORS)
//   - app/session/switching-input.tsx (reads metadata.rule, metadata.choices to
//     render the rule label and choice buttons)
//   - __tests__/switching.test.ts
// METADATA SHAPE (stored in Question.metadata):
//   {
//     rule: SwitchingRuleType,    // which rule is active for this question
//     choices: [string, string]   // the two answer choices for this rule
//   }
// NOTE: This is a BATCH generator (not per-question) because the rule switching
//   pattern depends on question position within the sprint. The session view
//   calls generateSwitchingSequence(difficulty, count) to get all questions at once.
// =============================================================================

import type { Question } from '@/lib/types'
import { SWITCHING_LEVELS, getSwitchingExpectedTimeMs, RULE_LABELS, RULE_CHOICES } from './constants'
import type { SwitchingRuleType } from './constants'

// Classify a number according to the given rule.
// This is the core logic that determines the correct answer for each question.
// - odd-even: returns 'odd' or 'even'
// - high-low: returns 'high' (>5) or 'low' (≤5), using the 1-9 number range
// - multiple-3: returns 'yes' or 'no' based on divisibility by 3
export function classifyNumber(n: number, rule: SwitchingRuleType): string {
  switch (rule) {
    case 'odd-even':
      return n % 2 === 0 ? 'even' : 'odd'
    case 'high-low':
      return n > 5 ? 'high' : 'low'
    case 'multiple-3':
      return n % 3 === 0 ? 'yes' : 'no'
  }
}

// Build an array of rule types for each question position in the sprint.
// The switching pattern is determined by switchFrequency:
// - 0: no switching — every position uses rules[0]
// - N (positive): switch to the next rule every N questions (round-robin)
// - -1: random switch — each position picks a random rule from the available set
//
// For predictable patterns (frequency > 0), questions are grouped into blocks of
// `frequency` questions, and the rule rotates through the rules array per block.
// Example: rules=['odd-even','high-low'], frequency=2, count=6
//   → ['odd-even','odd-even','high-low','high-low','odd-even','odd-even']
function buildRuleSequence(
  rules: SwitchingRuleType[],
  switchFrequency: number,
  count: number,
): SwitchingRuleType[] {
  // No switching — repeat the single rule for all positions
  if (switchFrequency === 0) {
    return Array(count).fill(rules[0])
  }

  // Random switching — each position picks independently from available rules
  if (switchFrequency === -1) {
    return Array.from({ length: count }, () =>
      rules[Math.floor(Math.random() * rules.length)]
    )
  }

  // Predictable switching — rotate through rules in blocks of switchFrequency
  const sequence: SwitchingRuleType[] = []
  for (let i = 0; i < count; i++) {
    // Determine which block this position is in, then pick the rule for that block
    const blockIndex = Math.floor(i / switchFrequency)
    const ruleIndex = blockIndex % rules.length
    sequence.push(rules[ruleIndex])
  }
  return sequence
}

// Generate a full sequence of Task Switching questions at the given difficulty.
// This is a BATCH generator — it produces all questions for a sprint at once
// because the rule switching pattern is position-dependent.
//
// - difficulty: 1-based level, clamped to [1, 8] (SWITCHING_LEVELS.length)
// - count: number of questions to generate (typically 5-7 from generateSprintQuestionCount)
//
// How it works:
// 1. Look up the level config (rules, switchFrequency, expectedTimeMs)
// 2. Build the rule sequence (which rule applies at each position)
// 3. For each position, generate a random number 1-9 and classify it
// 4. Return array of Questions with rule and choices in metadata
export function generateSwitchingSequence(difficulty: number, count: number): Question[] {
  // Clamp difficulty to valid range [1, 8]. Guard against NaN.
  const safeDifficulty = Number.isFinite(difficulty) ? difficulty : 1
  const clamped = Math.max(1, Math.min(safeDifficulty, SWITCHING_LEVELS.length))
  const level = SWITCHING_LEVELS[clamped - 1]

  // Build the rule sequence for the full sprint
  const ruleSequence = buildRuleSequence(level.rules, level.switchFrequency, count)

  // Generate one question per position in the sequence
  return ruleSequence.map(rule => {
    // Random number 1-9 (single digit, easy to read at a glance)
    const number = Math.floor(Math.random() * 9) + 1
    // Classify the number according to the active rule
    const answer = classifyNumber(number, rule)

    return {
      // Prompt is just the number as a string — the rule label comes from metadata
      prompt: String(number),
      answer,
      difficulty: clamped,
      expectedTimeMs: getSwitchingExpectedTimeMs(clamped),
      // Metadata consumed by app/session/switching-input.tsx for rendering:
      // - rule: which rule is active (used to look up the label)
      // - choices: the two answer options for this rule (displayed as buttons)
      metadata: {
        rule,
        choices: RULE_CHOICES[rule],
      },
    }
  })
}
