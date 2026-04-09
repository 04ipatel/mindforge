// =============================================================================
// lib/games/switching/constants.ts — Task Switching difficulty level definitions
// =============================================================================
// WHAT: Defines the rule types, labels, choices, and 8 difficulty levels for the
//   Task Switching game. The player classifies numbers according to a rule that
//   can change mid-sprint, forcing cognitive flexibility and set-shifting.
// ROLE: Configuration data for the switching game plugin. No logic beyond lookups.
// DEPENDENCIES: None
// DEPENDENTS:
//   - lib/games/switching/generator.ts (SWITCHING_LEVELS for level config,
//     getSwitchingExpectedTimeMs for timing, RULE_LABELS/RULE_CHOICES for metadata)
//   - __tests__/switching.test.ts
// DIFFICULTY AXES:
//   1. Rule count: how many rules are in play (1 → 3). More rules = harder.
//   2. Switch frequency: how often the active rule changes (never → random).
//      More switching = more cognitive load from task-set reconfiguration.
// =============================================================================

// The three classification rules the player can be asked to apply.
// - 'odd-even': classify the number as odd or even
// - 'high-low': classify whether the number is high (>5) or low (≤5)
// - 'multiple-3': classify whether the number is a multiple of 3
export type SwitchingRuleType = 'odd-even' | 'high-low' | 'multiple-3'

// Human-readable labels displayed above the number during play.
// These tell the player which rule is currently active.
export const RULE_LABELS: Record<SwitchingRuleType, string> = {
  'odd-even': 'Odd or Even?',
  'high-low': 'High or Low?',
  'multiple-3': 'Multiple of 3?',
}

// The two answer choices for each rule type.
// These are displayed as buttons below the number (keys 1 and 2).
export const RULE_CHOICES: Record<SwitchingRuleType, [string, string]> = {
  'odd-even': ['odd', 'even'],
  'high-low': ['high', 'low'],
  'multiple-3': ['yes', 'no'],
}

// Shape of a single switching difficulty level.
// - rules: which rule types are active at this level (1-3 rules)
// - switchFrequency: controls how often the rule changes within a sprint:
//     0 = never switch (single rule throughout)
//     N = switch every N questions (predictable)
//     -1 = random switch (unpredictable — hardest)
// - expectedTimeMs: calibrated response time for this level
export type SwitchingLevel = {
  level: number
  name: string
  rules: SwitchingRuleType[]
  switchFrequency: number
  expectedTimeMs: number
}

// All 8 switching difficulty levels, ordered from easiest to hardest.
// Progression pattern:
//   Levels 1-2: single rule, no switching (learn each rule in isolation)
//   Levels 3-4: two rules, predictable switching (every 3, then every 2)
//   Level 5: two rules, alternating every question (rapid but predictable)
//   Level 6: two rules, random switching (unpredictable — tests flexibility)
//   Levels 7-8: three rules, predictable then random switching (full cognitive load)
//
// Expected times reflect the cost of rule switching:
//   2500ms for single-rule levels, 3000ms when switching is introduced,
//   then 2500ms again as the player adapts, down to 2000ms at highest levels.
export const SWITCHING_LEVELS: SwitchingLevel[] = [
  { level: 1, name: 'Odd/Even only', rules: ['odd-even'], switchFrequency: 0, expectedTimeMs: 2500 },
  { level: 2, name: 'High/Low only', rules: ['high-low'], switchFrequency: 0, expectedTimeMs: 2500 },
  { level: 3, name: 'Two rules, switch every 3', rules: ['odd-even', 'high-low'], switchFrequency: 3, expectedTimeMs: 3000 },
  { level: 4, name: 'Two rules, switch every 2', rules: ['odd-even', 'high-low'], switchFrequency: 2, expectedTimeMs: 2500 },
  { level: 5, name: 'Two rules, alternating', rules: ['odd-even', 'high-low'], switchFrequency: 1, expectedTimeMs: 2500 },
  { level: 6, name: 'Two rules, random switch', rules: ['odd-even', 'high-low'], switchFrequency: -1, expectedTimeMs: 2000 },
  { level: 7, name: 'Three rules, switch every 2', rules: ['odd-even', 'high-low', 'multiple-3'], switchFrequency: 2, expectedTimeMs: 2500 },
  { level: 8, name: 'Three rules, random switch', rules: ['odd-even', 'high-low', 'multiple-3'], switchFrequency: -1, expectedTimeMs: 2000 },
]

// Look up the expected response time for a given switching difficulty level.
// Clamps to [1, 8] range. Mid-range levels have the highest expected times
// because switching cost is most pronounced when first introduced.
export function getSwitchingExpectedTimeMs(difficulty: number): number {
  const safe = Number.isFinite(difficulty) ? difficulty : 1
  const clamped = Math.max(1, Math.min(safe, SWITCHING_LEVELS.length))
  return SWITCHING_LEVELS[clamped - 1].expectedTimeMs
}
