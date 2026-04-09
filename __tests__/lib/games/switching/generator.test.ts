// Tests for: /Users/ishanpatel/Projects/mindforge/lib/games/switching/generator.ts
// Module: Task Switching question generator with 8 difficulty levels
// Key behaviors: number classification by rule (odd/even, high/low, multiple of 3),
// rule switching patterns (none, predictable, alternating, random),
// batch sequence generation (all questions at once because switching is position-dependent),
// and difficulty-scaled rule count (1 → 3) and switch frequency (never → random)

import { describe, it, expect } from 'vitest'
import { classifyNumber, generateSwitchingSequence } from '@/lib/games/switching/generator'
import type { SwitchingRuleType } from '@/lib/games/switching/constants'

// Tests the core classification function that determines the correct answer
describe('classifyNumber', () => {
  // Odd/even rule: standard parity check
  it('classifies odd numbers as "odd"', () => {
    expect(classifyNumber(1, 'odd-even')).toBe('odd')
    expect(classifyNumber(3, 'odd-even')).toBe('odd')
    expect(classifyNumber(7, 'odd-even')).toBe('odd')
  })

  it('classifies even numbers as "even"', () => {
    expect(classifyNumber(2, 'odd-even')).toBe('even')
    expect(classifyNumber(4, 'odd-even')).toBe('even')
    expect(classifyNumber(8, 'odd-even')).toBe('even')
  })

  // High/low rule: >5 is high, ≤5 is low (using 1-9 range)
  it('classifies numbers >5 as "high"', () => {
    expect(classifyNumber(6, 'high-low')).toBe('high')
    expect(classifyNumber(9, 'high-low')).toBe('high')
  })

  it('classifies numbers ≤5 as "low"', () => {
    expect(classifyNumber(5, 'high-low')).toBe('low')
    expect(classifyNumber(1, 'high-low')).toBe('low')
    expect(classifyNumber(3, 'high-low')).toBe('low')
  })

  // Multiple-of-3 rule: divisibility check
  it('classifies multiples of 3 as "yes"', () => {
    expect(classifyNumber(3, 'multiple-3')).toBe('yes')
    expect(classifyNumber(6, 'multiple-3')).toBe('yes')
    expect(classifyNumber(9, 'multiple-3')).toBe('yes')
  })

  it('classifies non-multiples of 3 as "no"', () => {
    expect(classifyNumber(1, 'multiple-3')).toBe('no')
    expect(classifyNumber(4, 'multiple-3')).toBe('no')
    expect(classifyNumber(7, 'multiple-3')).toBe('no')
  })
})

// Tests the batch sequence generator
describe('generateSwitchingSequence', () => {
  // Verifies that the generator returns exactly the requested number of questions
  it('generates the requested number of questions', () => {
    const seq = generateSwitchingSequence(1, 6)
    expect(seq).toHaveLength(6)
  })

  // Single-rule levels (1-2) should only use one rule type throughout
  it('uses only odd-even at level 1 (single rule, no switch)', () => {
    const seq = generateSwitchingSequence(1, 7)
    seq.forEach(q => {
      expect(q.metadata!.rule).toBe('odd-even')
    })
  })

  it('uses only high-low at level 2 (single rule, no switch)', () => {
    const seq = generateSwitchingSequence(2, 7)
    seq.forEach(q => {
      expect(q.metadata!.rule).toBe('high-low')
    })
  })

  // Alternating level (L5, switchFrequency=1) should alternate rules every question
  it('alternates rules at level 5 (switchFrequency=1)', () => {
    const seq = generateSwitchingSequence(5, 6)
    // With frequency=1, rules alternate: odd-even, high-low, odd-even, high-low...
    for (let i = 0; i < seq.length; i++) {
      const expectedRule = i % 2 === 0 ? 'odd-even' : 'high-low'
      expect(seq[i].metadata!.rule).toBe(expectedRule)
    }
  })

  // Three-rule levels (7-8) should use all three rule types
  it('uses all three rules at level 7', () => {
    // Level 7: three rules, switch every 2. With 6 questions:
    // positions 0-1: odd-even, 2-3: high-low, 4-5: multiple-3
    const seq = generateSwitchingSequence(7, 6)
    const usedRules = new Set(seq.map(q => q.metadata!.rule as string))
    expect(usedRules.has('odd-even')).toBe(true)
    expect(usedRules.has('high-low')).toBe(true)
    expect(usedRules.has('multiple-3')).toBe(true)
  })

  // Level 8 uses random switching with three rules — over enough questions,
  // all three rules should appear (statistical test with generous sample)
  it('uses all three rules at level 8 (random switch)', () => {
    // Generate a large batch to ensure all rules appear with random switching
    const seq = generateSwitchingSequence(8, 30)
    const usedRules = new Set(seq.map(q => q.metadata!.rule as string))
    expect(usedRules.has('odd-even')).toBe(true)
    expect(usedRules.has('high-low')).toBe(true)
    expect(usedRules.has('multiple-3')).toBe(true)
  })

  // Every question's answer must be the correct classification for its number and rule
  it('produces correct answers for each question', () => {
    // Test across multiple levels to cover all rule types
    for (const level of [1, 2, 3, 5, 7]) {
      const seq = generateSwitchingSequence(level, 7)
      seq.forEach(q => {
        const number = parseInt(q.prompt)
        const rule = q.metadata!.rule as SwitchingRuleType
        const expected = classifyNumber(number, rule)
        expect(q.answer).toBe(expected)
      })
    }
  })

  // Metadata must include rule type and the two choices for that rule
  it('includes rule and choices in metadata', () => {
    const seq = generateSwitchingSequence(3, 6)
    seq.forEach(q => {
      expect(q.metadata).toBeDefined()
      expect(q.metadata!.rule).toBeTruthy()
      const choices = q.metadata!.choices as [string, string]
      expect(choices).toHaveLength(2)
      // The answer must be one of the two choices
      expect(choices).toContain(q.answer)
    })
  })

  // Prompts should be single-digit numbers (1-9)
  it('generates numbers 1-9 as prompts', () => {
    const seq = generateSwitchingSequence(1, 50)
    seq.forEach(q => {
      const n = parseInt(q.prompt)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(9)
    })
  })

  // Verifies expectedTimeMs from level constants
  it('has correct expectedTimeMs values', () => {
    expect(generateSwitchingSequence(1, 1)[0].expectedTimeMs).toBe(2500)
    expect(generateSwitchingSequence(3, 1)[0].expectedTimeMs).toBe(3000)
    expect(generateSwitchingSequence(8, 1)[0].expectedTimeMs).toBe(2000)
  })

  // Guards against out-of-range difficulty — clamps to [1, 8]
  it('clamps difficulty to valid range', () => {
    expect(generateSwitchingSequence(0, 1)[0].difficulty).toBe(1)
    expect(generateSwitchingSequence(99, 1)[0].difficulty).toBe(8)
  })

  // Level 3 switches every 3 questions — verify the pattern
  it('switches every 3 questions at level 3', () => {
    const seq = generateSwitchingSequence(3, 6)
    // Block 0 (positions 0-2): odd-even, Block 1 (positions 3-5): high-low
    expect(seq[0].metadata!.rule).toBe('odd-even')
    expect(seq[1].metadata!.rule).toBe('odd-even')
    expect(seq[2].metadata!.rule).toBe('odd-even')
    expect(seq[3].metadata!.rule).toBe('high-low')
    expect(seq[4].metadata!.rule).toBe('high-low')
    expect(seq[5].metadata!.rule).toBe('high-low')
  })

  // Level 4 switches every 2 questions — verify the pattern
  it('switches every 2 questions at level 4', () => {
    const seq = generateSwitchingSequence(4, 6)
    // Block 0 (positions 0-1): odd-even, Block 1 (2-3): high-low, Block 2 (4-5): odd-even
    expect(seq[0].metadata!.rule).toBe('odd-even')
    expect(seq[1].metadata!.rule).toBe('odd-even')
    expect(seq[2].metadata!.rule).toBe('high-low')
    expect(seq[3].metadata!.rule).toBe('high-low')
    expect(seq[4].metadata!.rule).toBe('odd-even')
    expect(seq[5].metadata!.rule).toBe('odd-even')
  })
})
